import "server-only";
import type { AnalyticsProvider } from "./types";
import { runBigQueryQuery } from "./bigqueryClient";
import {
  ALL_LABEL,
  COLUMN_BY_UNIT,
  LEGACY_MV_UNITS,
  MEASUREMENT_UNIT_LABEL_OVERRIDES,
  RETIRED_MEASUREMENT_UNITS,
  UNIT_CONFIG_BY_UNIT,
  buildEntityLabel,
  getEntityColumnsForUnit,
  getUnitConfig,
  parseEntityLabel,
  resolveQueryUnitForDrilldownStrict,
  sortMeasurementUnits
} from "./bigqueryShared";

type BigQueryMetricRow = {
  metric: string;
  korean_name: string | null;
  description: string | null;
  query: string | null;
  category_2?: string | null;
  category_3?: string | null;
};

type BigQueryWeekRow = {
  week: string | null;
  week_start_date: string | null;
};

type BigQueryHeatmapAggRow = {
  week: string | null;
  measure_unit: string | null;
  filter_value: string | null;
  metric_id: string | null;
  value: number | string | null;
};

type TimedCache<T> = {
  value: T;
  expiresAt: number;
};

const projectId = process.env.BIGQUERY_PROJECT_ID?.trim() || "plabfootball-51bf5";
const dataMartDataset = process.env.BIGQUERY_DATASET_SOURCE_DATA_MART?.trim() || "data_mart";
const googleSheetsDataset = process.env.BIGQUERY_DATASET_SOURCE_GOOGLESHEETS?.trim() || "googlesheets";
const servingDataset = process.env.BIGQUERY_DATASET_SERVING?.trim() || "kevin_serving";
const sourceTable = `\`${projectId}.${dataMartDataset}.data_mart_1_social_match\``;
const metricTable = `\`${projectId}.${googleSheetsDataset}.metric_store_native\``;
const weeksView = `\`${projectId}.${servingDataset}.weeks_view\``;
const entityHierarchyView = `\`${projectId}.${servingDataset}.entity_hierarchy\``;
const weeklyAggView = `\`${projectId}.${servingDataset}.weekly_agg\``;
const weeklyExpandedAggView = `\`${projectId}.${servingDataset}.weekly_expanded_agg\``;
const METADATA_CACHE_TTL_MS = 10 * 60 * 1000;
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

const parseMetricCategory = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
};

const escapeBigQueryLiteral = (value: string) => value.replace(/'/g, "''");

const sanitizeIdentifier = (identifier: string) => {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid BigQuery identifier: ${identifier}`);
  }
  return identifier;
};

const buildWeeksFilterClause = (weeks?: string[]) => {
  const normalized = (weeks ?? []).map((week) => week.trim()).filter((week) => week.length > 0);
  if (normalized.length === 0) return "";
  const joined = normalized.map((week) => `'${escapeBigQueryLiteral(week)}'`).join(", ");
  return ` and week in (${joined})`;
};

const buildSourceEntityFilterClause = (unit: string, entityLabel: string | null) => {
  if (!entityLabel || entityLabel.trim().length === 0 || unit === "all") return "";
  const pairs = Object.entries(parseEntityLabel(unit, entityLabel));
  if (pairs.length === 0) return "";
  return pairs
    .map(([column, value]) => ` and ${sanitizeIdentifier(column)} = '${escapeBigQueryLiteral(value)}'`)
    .join("");
};

const buildServingHierarchyFilterClause = (unit: string, entityLabel: string | null) => {
  if (!entityLabel || entityLabel.trim().length === 0 || unit === "all") return "";
  return Object.entries(parseEntityLabel(unit, entityLabel))
    .map(([column, value]) => ` and eh.${sanitizeIdentifier(column)} = '${escapeBigQueryLiteral(value)}'`)
    .join("");
};

const buildExpandedParentFilterClause = (unit: string | null | undefined, entityLabel: string | null) => {
  if (!unit || !entityLabel || entityLabel.trim().length === 0 || unit === "all") return "";
  return Object.entries(parseEntityLabel(unit, entityLabel))
    .map(([column, value]) => ` and ${sanitizeIdentifier(column)} = '${escapeBigQueryLiteral(value)}'`)
    .join("");
};

const getSourceMetricColumns = async () => {
  const rows = await runBigQueryQuery<{ column_name: string }>(`
    select column_name
    from \`${projectId}.${dataMartDataset}.INFORMATION_SCHEMA.COLUMNS\`
    where table_name = 'data_mart_1_social_match'
  `);
  return rows
    .map((row) => String(row.column_name ?? "").trim())
    .filter((name) => name.length > 0 && !metricColumnBlacklist.has(name));
};

const runQuery = async <T>(query: string) => runBigQueryQuery<T>(query);

const isRateMetric = (metricId: string) => metricId.endsWith("_rate");

let supportedMetricIdsCache: TimedCache<string[]> | null = null;
let metricDictionaryCache: TimedCache<
  {
    metric: string;
    korean_name: string;
    description: string | null;
    query: string | null;
    category2: string | null;
    category3: string | null;
  }[]
> | null = null;
let measurementUnitOptionsCache: TimedCache<{ value: string; label: string }[]> | null = null;

const getCachedValue = <T>(cache: TimedCache<T> | null) =>
  cache && cache.expiresAt > Date.now() ? cache.value : null;

const setCachedValue = <T>(value: T): TimedCache<T> => ({
  value,
  expiresAt: Date.now() + METADATA_CACHE_TTL_MS
});

const mapHeatmapRows = (rows: BigQueryHeatmapAggRow[], measureUnit: string, metricIds: string[], weeks: string[]) => {
  const weekIndex = new Map(weeks.map((week, index) => [week, index]));
  const byEntity = new Map<string, Map<string, Record<string, number>>>();

  for (const row of rows) {
    const week = String(row.week ?? "").trim();
    if (!week) continue;

    const entity = measureUnit === "all" ? ALL_LABEL : String(row.filter_value ?? "").trim();
    if (!entity) continue;

    const metricId = String(row.metric_id ?? "").trim();
    if (!metricId) continue;

    const value = typeof row.value === "number" ? row.value : Number(row.value ?? 0);

    if (!byEntity.has(entity)) {
      byEntity.set(entity, new Map());
    }
    const byWeek = byEntity.get(entity)!;
    if (!byWeek.has(week)) {
      const initial: Record<string, number> = {};
      metricIds.forEach((metric) => {
        initial[metric] = 0;
      });
      byWeek.set(week, initial);
    }
    byWeek.get(week)![metricId] = Number.isFinite(value) ? value : 0;
  }

  const mapped: { entity: string; week: string; metrics: Record<string, number> }[] = [];
  for (const [entity, byWeek] of byEntity.entries()) {
    for (const week of weeks) {
      if (!byWeek.has(week)) {
        const emptyMetrics: Record<string, number> = {};
        metricIds.forEach((metric) => {
          emptyMetrics[metric] = 0;
        });
        mapped.push({ entity, week, metrics: emptyMetrics });
      } else {
        mapped.push({ entity, week, metrics: byWeek.get(week)! });
      }
    }
  }

  return mapped.sort((a, b) => {
    if (a.entity !== b.entity) return a.entity.localeCompare(b.entity, "ko");
    return (weekIndex.get(a.week) ?? 0) - (weekIndex.get(b.week) ?? 0);
  });
};

const buildFilterValueExpression = (measureUnit: string) => {
  const columns = getEntityColumnsForUnit(measureUnit);
  if (measureUnit === "all") return `'${ALL_LABEL}'`;
  if (columns.length === 1) return sanitizeIdentifier(columns[0]);
  if (columns.length === 2) {
    return `concat(${sanitizeIdentifier(columns[0])}, ' | ', ${sanitizeIdentifier(columns[1])})`;
  }
  throw new Error(`Unsupported entity label expression for unit: ${measureUnit}`);
};

const buildNotNullChecksForUnit = (measureUnit: string) =>
  getEntityColumnsForUnit(measureUnit)
    .map((column) => ` and ${sanitizeIdentifier(column)} is not null`)
    .join("");

export const bigqueryAnalyticsProvider: AnalyticsProvider = {
  getWeeksData: async (options) => {
    const limit = typeof options?.limit === "number" && options.limit > 0 ? options.limit : 104;
    const order = options?.order ?? "asc";
    const rows = await runQuery<BigQueryWeekRow>(
      `
        select week, week_start_date
        from ${weeksView}
        order by week_start_date desc
        limit ${limit}
      `
    );

    const entries = rows
      .map((row) => ({
        week: String(row.week ?? "").trim(),
        startDate: row.week_start_date ? String(row.week_start_date) : null
      }))
      .filter((row) => row.week.length > 0);

    return order === "desc" ? entries : entries.slice().reverse();
  },
  getWeeks: async (limit) => {
    const entries = await bigqueryAnalyticsProvider.getWeeksData({ limit, order: "asc" });
    return entries.map((entry) => entry.week);
  },
  getLatestWeek: async () => {
    const entries = await bigqueryAnalyticsProvider.getWeeksData({ limit: 1, order: "desc" });
    return entries[0]?.week ?? null;
  },
  getSupportedMetricIds: async (timings) => {
    const cached = getCachedValue(supportedMetricIdsCache);
    if (cached) return cached;

    const queryStart = Date.now();
    const rows = await runQuery<{ metric_id: string | null }>(`
      select distinct metric_id
      from ${weeklyAggView}
      union distinct
      select distinct metric_id
      from ${weeklyExpandedAggView}
      order by metric_id
    `);
    if (timings) timings.queryMs = Date.now() - queryStart;

    const processStart = Date.now();
    const uniqueSorted = rows
      .map((row) => String(row.metric_id ?? "").trim())
      .filter((metric) => metric.length > 0)
      .sort();
    if (timings) timings.processMs = Date.now() - processStart;
    supportedMetricIdsCache = setCachedValue(uniqueSorted);
    return uniqueSorted;
  },
  getMetricDictionary: async (timings) => {
    const cached = getCachedValue(metricDictionaryCache);
    if (cached) return cached;

    const queryStart = Date.now();
    const [rows, supportedMetricIds] = await Promise.all([
      runQuery<BigQueryMetricRow>(
        `select metric, korean_name, description, query, category_2, category_3 from ${metricTable}`
      ),
      bigqueryAnalyticsProvider.getSupportedMetricIds()
    ]);
    if (timings) timings.queryMs = Date.now() - queryStart;

    const processStart = Date.now();
    const allowed = new Set(supportedMetricIds);
    const result = rows
      .filter((row) => allowed.has(String(row.metric ?? "").trim()))
      .map((row) => ({
        metric: String(row.metric ?? "").trim(),
        korean_name: String(row.korean_name ?? "").trim(),
        description: row.description,
        query: row.query,
        category2: parseMetricCategory(row.category_2),
        category3: parseMetricCategory(row.category_3)
      }))
      .sort((a, b) => a.metric.localeCompare(b.metric));
    if (timings) timings.processMs = Date.now() - processStart;
    metricDictionaryCache = setCachedValue(result);
    return result;
  },
  getMeasurementUnitOptions: async () => {
    const cached = getCachedValue(measurementUnitOptionsCache);
    if (cached) return cached;

    const rows = await runQuery<Pick<BigQueryMetricRow, "metric" | "korean_name">>(
      `select metric, korean_name from ${metricTable}`
    );
    const supportedUnits = Array.from(new Set(Object.keys(UNIT_CONFIG_BY_UNIT))).filter(
      (unit) => !RETIRED_MEASUREMENT_UNITS.has(unit)
    );
    const metricLabelMap = new Map(
      rows
        .map((row) => [String(row.metric ?? "").trim(), String(row.korean_name ?? "").trim()] as const)
        .filter(([metric]) => metric.length > 0)
    );
    const options = [
      { value: "all", label: ALL_LABEL },
      ...supportedUnits.map((unit) => ({
        value: unit,
        label: MEASUREMENT_UNIT_LABEL_OVERRIDES[unit] || metricLabelMap.get(unit) || unit
      }))
    ];
    const sorted = sortMeasurementUnits(
      Array.from(new Map(options.map((option) => [option.value, option])).values())
    );
    measurementUnitOptionsCache = setCachedValue(sorted);
    return sorted;
  },
  getMeasurementUnitIds: async () => {
    const options = await bigqueryAnalyticsProvider.getMeasurementUnitOptions();
    return options.map((option) => option.value);
  },
  getAvailableDrilldownUnits: async ({ sourceUnit, sourceValue, candidateUnits, weeks }) => {
    const effectiveWeeks = (weeks ?? []).map((week) => week.trim()).filter((week) => week.length > 0);
    const uniqueCandidateUnits = Array.from(new Set(candidateUnits)).filter((unit) => unit !== sourceUnit);
    const available = await Promise.all(
      uniqueCandidateUnits.map(async (candidateUnit) => {
        const queryUnit = resolveQueryUnitForDrilldownStrict(candidateUnit, sourceUnit);
        if (!queryUnit) return null;
        const queryUnitConfig = getUnitConfig(queryUnit);
        if (!queryUnitConfig) return null;

        const whereWeeks = buildWeeksFilterClause(effectiveWeeks);
        const whereParent = buildSourceEntityFilterClause(sourceUnit, sourceValue);
        const notNullChecks = queryUnitConfig.entityColumns
          .map((column) => ` and ${sanitizeIdentifier(column)} is not null`)
          .join("");

        const rows = await runQuery<{ c: number }>(`
          select count(1) as c
          from ${sourceTable}
          where period_type = 'week'
            and dimension_type = '${queryUnitConfig.dimensionType}'
            ${whereWeeks}
            ${whereParent}
            ${notNullChecks}
          limit 1
        `);
        return Number(rows[0]?.c ?? 0) > 0 ? candidateUnit : null;
      })
    );
    return available.filter((value): value is string => Boolean(value));
  },
  getFilterOptions: async (measureUnit, options) => {
    if (measureUnit === "all") return [ALL_LABEL];
    const unitConfig = getUnitConfig(measureUnit);
    if (!unitConfig) {
      throw new Error(`Unsupported measure unit: ${measureUnit}`);
    }

    const parentUnit = options?.parentUnit;
    const parentValue = options?.parentValue && options.parentValue.trim().length > 0 ? options.parentValue.trim() : null;
    const weeks = (options?.weeks ?? []).map((week) => week.trim()).filter((week) => week.length > 0);

    if (parentUnit && parentValue && LEGACY_MV_UNITS.has(measureUnit) && LEGACY_MV_UNITS.has(parentUnit)) {
      const childColumn = sanitizeIdentifier(COLUMN_BY_UNIT[measureUnit]);
      const parentColumn = sanitizeIdentifier(COLUMN_BY_UNIT[parentUnit]);
      const rows = await runQuery<Record<string, string | null>>(`
        select distinct ${childColumn}
        from ${entityHierarchyView}
        where ${parentColumn} = '${escapeBigQueryLiteral(parentValue)}'
          and ${childColumn} is not null
        order by ${childColumn}
      `);
      return rows
        .map((row) => String(row[childColumn] ?? "").trim())
        .filter((value) => value.length > 0);
    }

    if (!parentUnit && LEGACY_MV_UNITS.has(measureUnit)) {
      const rows = await runQuery<{ filter_value: string | null }>(`
        select distinct filter_value
        from ${weeklyAggView}
        where measure_unit = '${measureUnit}'
        order by filter_value
      `);
      return rows
        .map((row) => String(row.filter_value ?? "").trim())
        .filter((value) => value.length > 0);
    }

    const queryUnit = resolveQueryUnitForDrilldownStrict(measureUnit, parentUnit);
    if (!queryUnit) return [];
    const queryUnitConfig = getUnitConfig(queryUnit);
    if (!queryUnitConfig) return [];

    if (LEGACY_MV_UNITS.has(measureUnit) && LEGACY_MV_UNITS.has(queryUnit)) {
      const filterUnitColumn = sanitizeIdentifier(COLUMN_BY_UNIT[measureUnit]);
      const parentFilter = buildServingHierarchyFilterClause(parentUnit ?? "", parentValue);
      const rows = await runQuery<{ filter_value: string | null }>(`
        select distinct wa.filter_value
        from ${weeklyAggView} wa
        join ${entityHierarchyView} eh
          on eh.${filterUnitColumn} = wa.filter_value
        where wa.measure_unit = '${measureUnit}'
          ${buildWeeksFilterClause(weeks).replace(/week/g, "wa.week")}
          ${parentFilter}
        order by wa.filter_value
      `);
      return rows
        .map((row) => String(row.filter_value ?? "").trim())
        .filter((value) => value.length > 0);
    }

    const rows = await runQuery<{ filter_value: string | null }>(`
      select distinct filter_value
      from ${weeklyExpandedAggView}
      where measure_unit = '${measureUnit}'
        ${buildWeeksFilterClause(weeks)}
        ${buildExpandedParentFilterClause(parentUnit, parentValue)}
      order by filter_value
    `);
    return rows
      .map((row) => String(row.filter_value ?? "").trim())
      .filter((value) => value.length > 0);
  },
  getHeatmap: async ({ measureUnit, filterValue, weeks, metrics, parentUnit, parentValue }, timings) => {
    const supportedMetricIds = await bigqueryAnalyticsProvider.getSupportedMetricIds();
    const allowed = new Set(supportedMetricIds);
    const requested = (metrics ?? []).map((metric) => String(metric).trim()).filter((metric) => metric.length > 0);
    const metricIds = (requested.length > 0 ? requested : supportedMetricIds).filter((metric) => allowed.has(metric));
    if (metricIds.length === 0) return [];

    const metricList = metricIds.map((metric) => sanitizeIdentifier(metric)).join(", ");
    const queryStart = Date.now();

    let rows: BigQueryHeatmapAggRow[] = [];
    if (measureUnit === "all") {
      rows = await runQuery<BigQueryHeatmapAggRow>(`
        select
          week,
          measure_unit,
          filter_value,
          metric_id,
          value
        from ${weeklyAggView}
        where measure_unit = 'all'
          ${buildWeeksFilterClause(weeks)}
          and metric_id in (${metricIds.map((metric) => `'${escapeBigQueryLiteral(metric)}'`).join(", ")})
        order by week, filter_value, metric_id
      `);
    } else {
      const unitConfig = getUnitConfig(measureUnit);
      if (!unitConfig) {
        throw new Error(`Unsupported measure unit: ${measureUnit}`);
      }
      const queryUnit = resolveQueryUnitForDrilldownStrict(measureUnit, parentUnit);
      if (!queryUnit) return [];
      const queryUnitConfig = getUnitConfig(queryUnit);
      if (!queryUnitConfig) {
        throw new Error(`Unsupported drilldown query unit: ${queryUnit}`);
      }

      const metricFilter = ` and metric_id in (${metricIds
        .map((metric) => `'${escapeBigQueryLiteral(metric)}'`)
        .join(", ")})`;

      if (LEGACY_MV_UNITS.has(measureUnit)) {
        const measureUnitColumn = sanitizeIdentifier(COLUMN_BY_UNIT[measureUnit]);
        const parentFilter = buildServingHierarchyFilterClause(parentUnit ?? "", parentValue ?? null);
        const selectedFilter = filterValue
          ? ` and wa.filter_value = '${escapeBigQueryLiteral(filterValue)}'`
          : "";
        rows = await runQuery<BigQueryHeatmapAggRow>(`
          select distinct
            wa.week,
            wa.measure_unit,
            wa.filter_value,
            wa.metric_id,
            wa.value
          from ${weeklyAggView} wa
          ${parentUnit && parentValue ? `join ${entityHierarchyView} eh on eh.${measureUnitColumn} = wa.filter_value` : ""}
          where wa.measure_unit = '${measureUnit}'
            ${buildWeeksFilterClause(weeks).replace(/week/g, "wa.week")}
            ${selectedFilter}
            ${metricFilter.replace(/metric_id/g, "wa.metric_id")}
            ${parentFilter}
          order by wa.week, wa.filter_value, wa.metric_id
        `);
      } else {
        rows = await runQuery<BigQueryHeatmapAggRow>(`
          select
            week,
            measure_unit,
            filter_value,
            metric_id,
            value
          from ${weeklyExpandedAggView}
          where measure_unit = '${measureUnit}'
            ${buildWeeksFilterClause(weeks)}
            ${filterValue ? ` and filter_value = '${escapeBigQueryLiteral(filterValue)}'` : ""}
            ${metricFilter}
            ${buildExpandedParentFilterClause(parentUnit, parentValue ?? null)}
          order by week, filter_value, metric_id
        `);
      }
    }
    if (timings) timings.queryMs = Date.now() - queryStart;

    const processStart = Date.now();
    const mapped = mapHeatmapRows(rows, measureUnit, metricIds, weeks);
    if (timings) timings.processMs = Date.now() - processStart;
    return mapped;
  },
  ALL_ENTITY_LABEL: ALL_LABEL
};
