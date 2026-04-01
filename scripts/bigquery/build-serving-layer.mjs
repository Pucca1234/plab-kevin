import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const location = process.env.BIGQUERY_LOCATION?.trim() || "asia-northeast3";
const dataMartDataset = process.env.BIGQUERY_DATASET_SOURCE_DATA_MART?.trim() || "data_mart";
const googleSheetsDataset = process.env.BIGQUERY_DATASET_SOURCE_GOOGLESHEETS?.trim() || "googlesheets";
const servingDataset = process.env.BIGQUERY_DATASET_SERVING?.trim() || "kevin_serving";
const generatedSqlPath = new URL("../../sql/bigquery/generated_serving_views.sql", import.meta.url);
const generatedSqlFilePath = fileURLToPath(generatedSqlPath);

let cachedServiceAccountToken = null;

const metricColumnBlacklist = new Set([
  "_airbyte_raw_id",
  "_airbyte_extracted_at",
  "_airbyte_meta",
  "_airbyte_generation_id",
  "period_type",
  "year",
  "quarter",
  "month",
  "week",
  "day",
  "dimension_type",
  "area_group",
  "area",
  "stadium_group",
  "stadium",
  "area_group_and_time",
  "area_and_time",
  "stadium_group_and_time",
  "stadium_and_time",
  "yoil_group",
  "time",
  "yoil",
  "hour"
]);

const parseServiceAccountCredentials = () => {
  const inlineJson = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) return JSON.parse(inlineJson);

  const base64Json = process.env.BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (base64Json) {
    return JSON.parse(Buffer.from(base64Json, "base64").toString("utf8"));
  }

  return null;
};

const resolveGcloudCommand = () => {
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

  return "gcloud.cmd";
};

const getAccessToken = async () => {
  const envToken = process.env.BIGQUERY_ACCESS_TOKEN?.trim();
  if (envToken) return envToken;

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
  if (process.platform === "win32") {
    return execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `& '${gcloudCommand.replace(/'/g, "''")}' auth print-access-token`
      ],
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
};

const runBigQueryStatement = async (query) => {
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
      timeoutMs: 600000,
      maxResults: 100000
    })
  });

  if (!response.ok) {
    throw new Error(`BigQuery statement failed: ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.jobComplete) {
    throw new Error("BigQuery statement did not complete within timeout.");
  }

  return payload;
};

const queryRows = async (query) => {
  const payload = await runBigQueryStatement(query);
  const fields = payload.schema?.fields ?? [];
  const rows = payload.rows ?? [];
  return rows.map((row) =>
    Object.fromEntries(fields.map((field, index) => [field.name, row.f?.[index]?.v ?? null]))
  );
};

const getMetricColumns = async () => {
  const rows = await queryRows(`
    with metric_dict as (
      select distinct trim(metric) as metric
      from \`${projectId}.${googleSheetsDataset}.metric_store_native\`
      where metric is not null
    ),
    source_columns as (
      select column_name
      from \`${projectId}.${dataMartDataset}.INFORMATION_SCHEMA.COLUMNS\`
      where table_name = 'data_mart_1_social_match'
    )
    select metric
    from metric_dict
    join source_columns on source_columns.column_name = metric_dict.metric
    order by metric
  `);

  return rows
    .map((row) => String(row.metric ?? "").trim())
    .filter((metric) => metric.length > 0 && !metricColumnBlacklist.has(metric));
};

const buildMetricStructs = (metrics) =>
  metrics
    .map((metric) => `    struct('${metric}' as metric_id, cast(\`${metric}\` as float64) as value)`)
    .join(",\n");

const buildDropObjectSql = (tableName) => `
begin
  if exists (
    select 1
    from \`${projectId}.${servingDataset}.INFORMATION_SCHEMA.TABLES\`
    where table_name = '${tableName}'
  ) then
    execute immediate (
      select if(
        table_type = 'VIEW',
        'drop view \`${projectId}.${servingDataset}.${tableName}\`',
        'drop table \`${projectId}.${servingDataset}.${tableName}\`'
      )
      from \`${projectId}.${servingDataset}.INFORMATION_SCHEMA.TABLES\`
      where table_name = '${tableName}'
      limit 1
    );
  end if;
end;
`;

const buildSql = (metrics) => {
  const metricStructs = buildMetricStructs(metrics);
  return `create or replace view \`${projectId}.${servingDataset}.weeks_view\` as
select distinct
  week,
  parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date
from \`${projectId}.${dataMartDataset}.data_mart_1_social_match\`
where period_type = 'week'
  and week is not null
  and length(trim(week)) >= 8
  and parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) <= current_date('Asia/Seoul');

${buildDropObjectSql("entity_hierarchy")}

create table \`${projectId}.${servingDataset}.entity_hierarchy\`
cluster by area_group, area, stadium_group, stadium as
select distinct
  nullif(trim(area_group), '') as area_group,
  nullif(trim(area), '') as area,
  nullif(trim(stadium_group), '') as stadium_group,
  nullif(trim(stadium), '') as stadium
from \`${projectId}.${dataMartDataset}.data_mart_1_social_match\`
where period_type = 'week'
  and day is null
  and yoil is null
  and yoil_group is null
  and hour is null
  and time is null
  and (
    area_group is not null or
    area is not null or
    stadium_group is not null or
    stadium is not null
  );

${buildDropObjectSql("weekly_agg")}

create table \`${projectId}.${servingDataset}.weekly_agg\`
partition by week_start_date
cluster by measure_unit, metric_id, filter_value as
with base as (
  select
    week,
    parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date,
    coalesce(nullif(trim(dimension_type), ''), 'all') as dimension_type,
    nullif(trim(area_group), '') as area_group,
    nullif(trim(area), '') as area,
    nullif(trim(stadium_group), '') as stadium_group,
    nullif(trim(stadium), '') as stadium,
    metric_id,
    value
  from \`${projectId}.${dataMartDataset}.data_mart_1_social_match\`,
  unnest([
${metricStructs}
  ])
  where period_type = 'week'
    and day is null
    and yoil is null
    and yoil_group is null
    and hour is null
    and time is null
    and value is not null
),
unit_rows as (
  select week, week_start_date, 'all' as measure_unit, '전체' as filter_value, metric_id, value
  from base
  where dimension_type = 'all'

  union all

  select week, week_start_date, 'area_group', area_group, metric_id, value
  from base
  where dimension_type = 'area_group' and area_group is not null

  union all

  select week, week_start_date, 'area', area, metric_id, value
  from base
  where dimension_type = 'area' and area is not null

  union all

  select week, week_start_date, 'stadium_group', stadium_group, metric_id, value
  from base
  where dimension_type = 'stadium_group' and stadium_group is not null

  union all

  select week, week_start_date, 'stadium', stadium, metric_id, value
  from base
  where dimension_type = 'stadium' and stadium is not null
)
select
  week,
  week_start_date,
  measure_unit,
  filter_value,
  metric_id,
  case
    when ends_with(metric_id, '_rate') then avg(value)
    else max(value)
  end as value
from unit_rows
group by week, week_start_date, measure_unit, filter_value, metric_id;

${buildDropObjectSql("weekly_expanded_agg")}

create table \`${projectId}.${servingDataset}.weekly_expanded_agg\`
partition by week_start_date
cluster by measure_unit, metric_id, filter_value as
with recent_weeks as (
  select week
  from \`${projectId}.${servingDataset}.weeks_view\`
  order by week_start_date desc
  limit 24
),
base as (
  select
    s.week,
    parse_date('%Y.%m.%d', concat('20', substr(s.week, 1, 8))) as week_start_date,
    nullif(trim(s.area_group), '') as area_group,
    nullif(trim(s.area), '') as area,
    nullif(trim(s.stadium_group), '') as stadium_group,
    nullif(trim(s.stadium), '') as stadium,
    nullif(trim(s.time), '') as time,
    nullif(trim(cast(s.hour as string)), '') as hour,
    nullif(trim(s.yoil), '') as yoil,
    nullif(trim(s.yoil_group), '') as yoil_group,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    metric_id,
    value
  from \`${projectId}.${dataMartDataset}.data_mart_1_social_match\` s
  join recent_weeks rw on rw.week = s.week,
  unnest([
${metricStructs}
  ])
  where s.period_type = 'week'
    and s.dimension_type in (
      'area_group_and_time',
      'area_and_time',
      'stadium_group_and_time',
      'stadium_and_time',
      'time',
      'hour'
    )
    and value is not null
),
unit_rows as (
  select week, week_start_date, 'area_group_and_time' as measure_unit, concat(area_group, ' | ', time) as filter_value, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'area_group_and_time' and area_group is not null and time is not null

  union all

  select week, week_start_date, 'area_and_time', concat(area, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'area_and_time' and area is not null and time is not null

  union all

  select week, week_start_date, 'stadium_group_and_time', concat(stadium_group, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'stadium_group_and_time' and stadium_group is not null and time is not null

  union all

  select week, week_start_date, 'stadium_and_time', concat(stadium, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'stadium_and_time' and stadium is not null and time is not null

  union all

  select week, week_start_date, 'time', time, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'time' and time is not null

  union all

  select week, week_start_date, 'hour', hour, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'hour' and hour is not null
)
select
  week,
  week_start_date,
  measure_unit,
  filter_value,
  area_group,
  area,
  stadium_group,
  stadium,
  time,
  hour,
  metric_id,
  case
    when ends_with(metric_id, '_rate') then avg(value)
    else max(value)
  end as value
from unit_rows
group by week, week_start_date, measure_unit, filter_value, area_group, area, stadium_group, stadium, time, hour, metric_id;`;
};

const main = async () => {
  const metrics = await getMetricColumns();
  if (metrics.length === 0) {
    throw new Error("No shared metrics were found between metric_store_native and data_mart_1_social_match.");
  }

  console.log(`Building BigQuery serving layer with ${metrics.length} metrics...`);
  const sql = buildSql(metrics);
  mkdirSync(dirname(generatedSqlFilePath), { recursive: true });
  writeFileSync(generatedSqlFilePath, sql, "utf8");

  console.log("Executing serving layer rebuild script...");
  await runBigQueryStatement(sql);

  console.log(`Generated SQL written to ${generatedSqlFilePath}`);
  console.log(`Serving layer applied to ${projectId}.${servingDataset}`);
};

main().catch((error) => {
  console.error("Failed to build BigQuery serving layer.");
  console.error(error);
  process.exit(1);
});
