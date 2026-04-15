import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { randomUUID } from "crypto";
import { getHeatmap, getMeasurementUnitIds, getSupportedMetricIds } from "../../lib/dataQueries";

export const dynamic = "force-dynamic";

const MAX_WEEKS = 5000;
const HEATMAP_CACHE_TTL = 180;
const SUPPORTED_METRIC_IDS_CACHE_TTL = 3600;

type HeatmapRequestBody = {
  periodUnit?: "year" | "quarter" | "month" | "week" | "day";
  measureUnit: string;
  weeks: string[];
  metrics: string[];
  filters?: { unit: string; values: string[] }[];
  primaryMetricId?: string;
  parentUnit?: string | null;
  parentValue?: string | null;
};

const buildHeatmapCacheKey = (params: {
  periodUnit: string;
  measureUnit: string;
  filters: { unit: string; values: string[] }[];
  weeks: string[];
  metrics: string[];
  parentUnit?: string | null;
  parentValue?: string | null;
}) => {
  const filterKey =
    params.filters.length > 0
      ? params.filters
          .map((filter) => `${filter.unit}:${filter.values.slice().sort().join(",")}`)
          .sort()
          .join("|")
      : "all";
  const weeksKey = params.weeks.join("|");
  const metricsKey = params.metrics.join("|");
  const parentKey =
    params.parentUnit && params.parentValue
      ? `${params.parentUnit}:${params.parentValue.trim()}`
      : "none";
  return `heatmap:${params.periodUnit}:${params.measureUnit}:${filterKey}:${weeksKey}:${metricsKey}:${parentKey}`;
};

const getSupportedMetricIdsCached = unstable_cache(
  async () => getSupportedMetricIds(),
  ["api-heatmap-supported-metric-ids-v1"],
  { revalidate: SUPPORTED_METRIC_IDS_CACHE_TTL }
);

export async function POST(request: Request) {
  const requestId = randomUUID();
  const totalStart = Date.now();
  let payload: Partial<HeatmapRequestBody> = {};

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { periodUnit, measureUnit, filters, weeks, metrics, primaryMetricId, parentUnit, parentValue } = payload;
  const normalizedPeriodUnit =
    periodUnit === "year" || periodUnit === "quarter" || periodUnit === "month" || periodUnit === "day"
      ? periodUnit
      : "week";

  if (Array.isArray(weeks) && weeks.length > 0) {
    const firstWeek = weeks[0];
    const lastWeek = weeks[weeks.length - 1];
    console.log("[heatmap] request", {
      requestId,
      periodUnit: normalizedPeriodUnit,
      measureUnit,
      filtersLength: Array.isArray(filters) ? filters.length : null,
      weeksLength: weeks.length,
      firstWeek,
      lastWeek,
      metricsLength: Array.isArray(metrics) ? metrics.length : null,
      primaryMetricId,
      parentUnit,
      parentValue
    });
  } else {
    console.log("[heatmap] request", {
      requestId,
      periodUnit: normalizedPeriodUnit,
      measureUnit,
      filtersLength: Array.isArray(filters) ? filters.length : null,
      weeksLength: Array.isArray(weeks) ? weeks.length : null,
      metricsLength: Array.isArray(metrics) ? metrics.length : null,
      primaryMetricId,
      parentUnit,
      parentValue
    });
  }

  const expected = {
    measureUnit: "string",
    periodUnit: "year|quarter|month|week|day (optional)",
    weeks: "string[]",
    metrics: "string[]",
    filters: "{ unit: string, values: string[] }[] (optional)",
    primaryMetricId: "string (optional)",
    parentUnit: "string|null (optional)",
    parentValue: "string|null (optional)"
  };

  const badRequest = (reason: string) => {
    console.log("[heatmap] bad_request", {
      requestId,
      reason,
      body: payload
    });
    return NextResponse.json(
      {
        error: "Invalid request body",
        expected,
        received: payload,
        reason
      },
      { status: 400 }
    );
  };

  const allowedUnits = new Set(await getMeasurementUnitIds());
  if (!measureUnit || !allowedUnits.has(measureUnit)) {
    return badRequest("measureUnit is required and must be a supported measurement unit");
  }

  if (!Array.isArray(weeks) || weeks.length === 0 || weeks.length > MAX_WEEKS) {
    return badRequest(`weeks is required as a non-empty array (max ${MAX_WEEKS})`);
  }

  if (filters !== null && filters !== undefined) {
    if (
      !Array.isArray(filters) ||
      filters.some(
        (filter) =>
          !filter ||
          typeof filter.unit !== "string" ||
          !allowedUnits.has(filter.unit) ||
          !Array.isArray(filter.values) ||
          filter.values.some((value) => typeof value !== "string")
      )
    ) {
      return badRequest("filters must be an array of { unit, values }");
    }
  }
  if (parentUnit !== null && parentUnit !== undefined) {
    if (typeof parentUnit !== "string" || !allowedUnits.has(parentUnit)) {
      return badRequest("parentUnit must be a supported measurement unit");
    }
  }
  if (parentValue !== null && parentValue !== undefined && typeof parentValue !== "string") {
    return badRequest("parentValue must be a string or null");
  }

  if (!Array.isArray(metrics) || metrics.length === 0) {
    return badRequest("metrics is required as a non-empty string array");
  }

  const supportedMetricIds = await getSupportedMetricIdsCached();
  const supportedSet = new Set(supportedMetricIds);
  const metricIds = Array.from(
    new Set(metrics.map((metric) => String(metric).trim()).filter((metric) => supportedSet.has(metric)))
  );
  if (metricIds.length === 0) return badRequest("metrics did not include any supported metric IDs");

  const primaryMetricFinal = primaryMetricId ?? metricIds[0];

  try {
    const normalizedFilters = (filters ?? [])
      .map((filter) => ({
        unit: filter.unit,
        values: filter.values.map((value) => value.trim()).filter((value) => value.length > 0)
      }))
      .filter((filter) => filter.unit !== "all");
    const normalizedParentUnit = parentUnit && parentUnit !== "all" ? parentUnit : null;
    const normalizedParentValue =
      parentValue && parentValue.trim() !== "" ? parentValue.trim() : null;
    const cacheKey = buildHeatmapCacheKey({
      measureUnit,
      periodUnit: normalizedPeriodUnit,
      filters: normalizedFilters,
      weeks,
      metrics: metricIds,
      parentUnit: normalizedParentUnit,
      parentValue: normalizedParentValue
    });

    const loadHeatmap = async () => {
      const timings: { queryMs?: number; processMs?: number } = {};
      const rows = await getHeatmap(
        {
          measureUnit,
          filters: normalizedFilters,
          weeks,
          metrics: metricIds ? [...metricIds] : undefined,
          parentUnit: normalizedParentUnit,
          parentValue: normalizedParentValue,
          periodUnit: normalizedPeriodUnit
        },
        timings
      );
      return { rows, timings, cachedAt: Date.now() };
    };

    const hasDrilldownParent = Boolean(normalizedParentUnit && normalizedParentValue);
    const { rows, timings, cachedAt } = hasDrilldownParent
      ? await loadHeatmap()
      : await unstable_cache(loadHeatmap, ["api-heatmap-v3", cacheKey], { revalidate: HEATMAP_CACHE_TTL })();
    const totalMs = Date.now() - totalStart;
    const cacheAgeMs = Date.now() - cachedAt;
    const cacheHit = cacheAgeMs > 5;
    console.log("[heatmap] perf", {
      requestId,
      queryMs: cacheHit ? null : (timings?.queryMs ?? null),
      processMs: cacheHit ? null : (timings?.processMs ?? null),
      totalMs,
      cacheAgeMs,
      primaryMetricId: primaryMetricFinal
    });
    return NextResponse.json({ rows });
  } catch (error) {
    console.error("[heatmap] error", {
      requestId,
      periodUnit: normalizedPeriodUnit,
      measureUnit,
      filtersLength: Array.isArray(filters) ? filters.length : null,
      weeksLength: Array.isArray(weeks) ? weeks.length : null,
      metricsLength: Array.isArray(metrics) ? metrics.length : null,
      message: (error as Error).message || "Failed to load heatmap."
    });
    return NextResponse.json({ error: (error as Error).message || "Failed to load heatmap." }, { status: 500 });
  }
}
