import "server-only";
import { getAnalyticsProvider } from "./analytics/provider";

export const ALL_ENTITY_LABEL = getAnalyticsProvider().ALL_ENTITY_LABEL;

export async function getWeeksData(options?: {
  limit?: number;
  order?: "asc" | "desc";
  periodUnit?: "year" | "quarter" | "month" | "week" | "day";
}) {
  return getAnalyticsProvider().getWeeksData(options);
}

export async function getWeeks(limit?: number, periodUnit?: "year" | "quarter" | "month" | "week" | "day") {
  return getAnalyticsProvider().getWeeks(limit, periodUnit);
}

export async function getLatestWeek(periodUnit?: "year" | "quarter" | "month" | "week" | "day") {
  return getAnalyticsProvider().getLatestWeek(periodUnit);
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

export async function getAvailableFilterUnits(params: {
  measureUnit: string;
  parentUnit?: string | null;
  parentValue?: string | null;
  weeks?: string[];
  periodUnit?: "year" | "quarter" | "month" | "week" | "day";
}) {
  return getAnalyticsProvider().getAvailableFilterUnits(params);
}

export async function getAvailableDrilldownUnits(params: {
  sourceUnit: string;
  sourceValue: string;
  candidateUnits: string[];
  parentUnit?: string | null;
  parentValue?: string | null;
  weeks?: string[];
  periodUnit?: "year" | "quarter" | "month" | "week" | "day";
}) {
  return getAnalyticsProvider().getAvailableDrilldownUnits(params);
}

export async function getFilterOptions(
  measureUnit: string,
  options?: {
    filterUnit?: string | null;
    activeFilters?: { unit: string; values: string[] }[];
    parentUnit?: string | null;
    parentValue?: string | null;
    weeks?: string[];
    periodUnit?: "year" | "quarter" | "month" | "week" | "day";
  }
) {
  return getAnalyticsProvider().getFilterOptions(measureUnit, options);
}

export async function getHeatmap(
  params: {
    measureUnit: string;
    filters?: { unit: string; values: string[] }[];
    weeks: string[];
    metrics?: string[];
    parentUnit?: string | null;
    parentValue?: string | null;
    periodUnit?: "year" | "quarter" | "month" | "week" | "day";
  },
  timings?: { queryMs?: number; processMs?: number }
) {
  return getAnalyticsProvider().getHeatmap(params, timings);
}
