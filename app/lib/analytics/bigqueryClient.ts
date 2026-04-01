import "server-only";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const location = process.env.BIGQUERY_LOCATION?.trim() || "asia-northeast3";
const serviceAccountJson = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON?.trim();
const serviceAccountJsonBase64 = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64?.trim();

const resolveGcloudCommand = () => {
  const localAppData = process.env.LOCALAPPDATA?.trim();
  const candidates = [
    localAppData
      ? join(localAppData, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud.cmd")
      : null,
    localAppData
      ? join(localAppData, "Google", "Cloud SDK", "google-cloud-sdk", "bin", "gcloud")
      : null,
    "C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd",
    "C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud",
    "gcloud.cmd",
    "gcloud"
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (!candidate.includes("\\") || existsSync(candidate)) {
      return candidate;
    }
  }
  return "gcloud.cmd";
};

type BigQueryField = {
  name: string;
  type: string;
};

type BigQueryQueryResponse = {
  schema?: { fields?: BigQueryField[] };
  rows?: Array<{ f?: Array<{ v?: unknown }> }>;
  jobComplete?: boolean;
  pageToken?: string;
};

let cachedServiceAccountToken: { value: string; expiresAt: number } | null = null;

const parseServiceAccountCredentials = () => {
  if (serviceAccountJson) {
    return JSON.parse(serviceAccountJson);
  }
  if (serviceAccountJsonBase64) {
    return JSON.parse(Buffer.from(serviceAccountJsonBase64, "base64").toString("utf8"));
  }
  return null;
};

const getServiceAccountAccessToken = async () => {
  const now = Date.now();
  if (cachedServiceAccountToken && cachedServiceAccountToken.expiresAt - 60_000 > now) {
    return cachedServiceAccountToken.value;
  }

  const credentials = parseServiceAccountCredentials();
  if (!credentials) return null;

  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/bigquery"]
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse.token;
  if (!token) {
    throw new Error("BigQuery service account token could not be created.");
  }

  cachedServiceAccountToken = {
    value: token,
    expiresAt: now + 55 * 60 * 1000
  };
  return token;
};

const getAccessToken = async () => {
  const serviceAccountToken = await getServiceAccountAccessToken();
  if (serviceAccountToken) return serviceAccountToken;

  try {
    const gcloudCommand = resolveGcloudCommand();
    if (process.platform === "win32") {
      return execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", `& '${gcloudCommand.replace(/'/g, "''")}' auth print-access-token`],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"]
        }
      ).trim();
    }

    return execFileSync(gcloudCommand, ["auth", "print-access-token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    const tokenFromEnv = process.env.BIGQUERY_ACCESS_TOKEN?.trim();
    if (tokenFromEnv) return tokenFromEnv;
    throw new Error(
      "BigQuery access token is unavailable. Configure BIGQUERY_SERVICE_ACCOUNT_JSON(_BASE64), run `gcloud auth login`, or set BIGQUERY_ACCESS_TOKEN."
    );
  }
};

const coerceValue = (fieldType: string, raw: unknown): unknown => {
  if (raw === null || raw === undefined) return null;
  switch (fieldType) {
    case "INTEGER":
    case "INT64":
      return String(raw);
    case "FLOAT":
    case "FLOAT64":
    case "NUMERIC":
    case "BIGNUMERIC":
      return String(raw);
    case "BOOLEAN":
    case "BOOL":
      return raw === true || raw === "true";
    case "DATE":
    case "DATETIME":
    case "TIMESTAMP":
    case "STRING":
    default:
      return String(raw);
  }
};

const mapRows = (response: BigQueryQueryResponse) => {
  const fields = response.schema?.fields ?? [];
  const rows = response.rows ?? [];
  return rows.map((row) => {
    const values = row.f ?? [];
    return Object.fromEntries(
      fields.map((field, index) => [field.name, coerceValue(field.type, values[index]?.v)])
    );
  });
};

export const runBigQueryQuery = async <T>(query: string) => {
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
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`BigQuery query failed: ${text}`);
  }

  const payload = (await response.json()) as BigQueryQueryResponse;
  if (!payload.jobComplete) {
    throw new Error("BigQuery query did not complete within timeout.");
  }
  return mapRows(payload) as T[];
};
