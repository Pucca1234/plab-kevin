import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const location = process.env.BIGQUERY_LOCATION?.trim() || "asia-northeast3";
const servingDataset = process.env.BIGQUERY_DATASET_SERVING?.trim() || "kevin_serving";

let cachedServiceAccountToken = null;

const resolveGcloudCommand = () => {
  if (process.platform !== "win32") {
    return "gcloud";
  }

  const localAppData = process.env.LOCALAPPDATA?.trim();
  const candidates = [
    localAppData
      ? join(localAppData, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd")
      : null,
    "C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd",
    "gcloud.cmd"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate.includes("\\") || existsSync(candidate)) {
      return candidate;
    }
  }

  return "gcloud";
};

const parseServiceAccountCredentials = () => {
  const inlineJson = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) return JSON.parse(inlineJson);

  const base64Json = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (base64Json) {
    return JSON.parse(Buffer.from(base64Json, "base64").toString("utf8"));
  }

  return null;
};

const getAccessToken = async () => {
  const now = Date.now();
  if (cachedServiceAccountToken && cachedServiceAccountToken.expiresAt - 60_000 > now) {
    return cachedServiceAccountToken.value;
  }

  const credentials = parseServiceAccountCredentials();
  if (credentials) {
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/bigquery"]
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token;
    if (!token) {
      throw new Error("Failed to create BigQuery service account access token.");
    }

    cachedServiceAccountToken = {
      value: token,
      expiresAt: now + 55 * 60 * 1000
    };
    return token;
  }

  const gcloudCommand = resolveGcloudCommand();
  try {
    if (process.platform === "win32") {
      return execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `& '${gcloudCommand.replace(/'/g, "''")}' auth print-access-token`
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
      ).trim();
    }

    return execFileSync(gcloudCommand, ["auth", "print-access-token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    const envToken = process.env.BIGQUERY_ACCESS_TOKEN?.trim();
    if (envToken) return envToken;
    throw new Error(
      "BigQuery access token is unavailable. Configure BIGQUERY_SERVICE_ACCOUNT_JSON(_BASE64), run `gcloud auth login`, or set BIGQUERY_ACCESS_TOKEN."
    );
  }
};

const runQuery = async (query) => {
  const token = await getAccessToken();
  const response = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      useLegacySql: false,
      location,
      timeoutMs: 120000,
      maxResults: 100000
    })
  });

  if (!response.ok) {
    throw new Error(`BigQuery validation query failed: ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.jobComplete) {
    throw new Error("BigQuery validation query did not complete within timeout.");
  }

  const fields = payload.schema?.fields ?? [];
  const rows = payload.rows ?? [];
  return rows.map((row) =>
    Object.fromEntries(fields.map((field, index) => [field.name, row.f?.[index]?.v ?? null]))
  );
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  const tables = await runQuery(`
    select table_name, table_type
    from \`${projectId}.${servingDataset}.INFORMATION_SCHEMA.TABLES\`
    where table_name in ('weeks_view', 'entity_hierarchy', 'weekly_agg', 'weekly_expanded_agg')
    order by table_name
  `);

  const tableMap = Object.fromEntries(tables.map((row) => [row.table_name, row.table_type]));
  expect(tableMap.weeks_view === "VIEW", "weeks_view is missing or not a VIEW");
  expect(tableMap.entity_hierarchy === "BASE TABLE", "entity_hierarchy is missing or not a BASE TABLE");
  expect(tableMap.weekly_agg === "BASE TABLE", "weekly_agg is missing or not a BASE TABLE");
  expect(
    tableMap.weekly_expanded_agg === "BASE TABLE",
    "weekly_expanded_agg is missing or not a BASE TABLE"
  );

  const [latestWeekRow] = await runQuery(`
    select week
    from \`${projectId}.${servingDataset}.weeks_view\`
    order by week_start_date desc
    limit 1
  `);
  expect(latestWeekRow?.week, "weeks_view did not return a latest week");

  const latestWeek = String(latestWeekRow.week);

  const [weeklyAggRow] = await runQuery(`
    select count(*) as total_rows
    from \`${projectId}.${servingDataset}.weekly_agg\`
    where week = '${latestWeek}'
      and measure_unit = 'all'
      and metric_id = 'manager_match_cnt'
  `);
  expect(Number(weeklyAggRow?.total_rows ?? 0) > 0, "weekly_agg is missing latest all.manager_match_cnt row");

  const [expandedRow] = await runQuery(`
    select count(*) as total_rows
    from \`${projectId}.${servingDataset}.weekly_expanded_agg\`
    where week = '${latestWeek}'
      and measure_unit = 'time'
      and metric_id = 'manager_match_cnt'
  `);
  expect(
    Number(expandedRow?.total_rows ?? 0) > 0,
    "weekly_expanded_agg is missing latest time.manager_match_cnt row"
  );

  console.log(
    JSON.stringify(
      {
        latestWeek,
        tables: tableMap,
        weeklyAggRows: Number(weeklyAggRow.total_rows),
        weeklyExpandedRows: Number(expandedRow.total_rows)
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
