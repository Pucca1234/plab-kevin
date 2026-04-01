import "server-only";
import { getAnalyticsProvider } from "./analytics/provider";

export const ALL_ENTITY_LABEL = getAnalyticsProvider().ALL_ENTITY_LABEL;

export async function getWeeksData(options?: { limit?: number; order?: "asc" | "desc" }) {
  return getAnalyticsProvider().getWeeksData(options);
}

export async function getWeeks(limit?: number) {
  return getAnalyticsProvider().getWeeks(limit);
}

export async function getLatestWeek() {
  return getAnalyticsProvider().getLatestWeek();
}

export async function getSupportedMetricIds(timings?: { queryMs?: number; processMs?: number }) {
  return getAnalyticsProvider().getSupportedMetricIds(timings);
}

export async function getMetricDictionary(timings?: { queryMs?: number; processMs?: number }) {
  return getAnalyticsProvider().getMetricDictionary(timings);
}

export async function getMeasurementUnitOptions() {
  return getAnalyticsProvider().getMeasurementUnitOptions();
}

export async function getMeasurementUnitIds() {
  return getAnalyticsProvider().getMeasurementUnitIds();
}

export async function getAvailableDrilldownUnits(params: {
  sourceUnit: string;
  sourceValue: string;
  candidateUnits: string[];
  weeks?: string[];
}) {
  return getAnalyticsProvider().getAvailableDrilldownUnits(params);
}

export async function getFilterOptions(
  measureUnit: string,
  options?: { parentUnit?: string | null; parentValue?: string | null; weeks?: string[] }
) {
  return getAnalyticsProvider().getFilterOptions(measureUnit, options);
}

export async function getHeatmap(
  params: {
    measureUnit: string;
    filterValue: string | null;
    weeks: string[];
    metrics?: string[];
    parentUnit?: string | null;
    parentValue?: string | null;
  },
  timings?: { queryMs?: number; processMs?: number }
) {
  return getAnalyticsProvider().getHeatmap(params, timings);
}
