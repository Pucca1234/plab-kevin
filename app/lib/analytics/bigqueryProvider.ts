import "server-only";
import type { AnalyticsProvider } from "./types";

const notImplemented = (method: string): never => {
  throw new Error(`BigQuery analytics provider is not implemented yet: ${method}`);
};

export const bigqueryAnalyticsProvider: AnalyticsProvider = {
  getWeeksData: () => notImplemented("getWeeksData"),
  getWeeks: () => notImplemented("getWeeks"),
  getLatestWeek: () => notImplemented("getLatestWeek"),
  getSupportedMetricIds: () => notImplemented("getSupportedMetricIds"),
  getMetricDictionary: () => notImplemented("getMetricDictionary"),
  getMeasurementUnitOptions: () => notImplemented("getMeasurementUnitOptions"),
  getMeasurementUnitIds: () => notImplemented("getMeasurementUnitIds"),
  getAvailableDrilldownUnits: () => notImplemented("getAvailableDrilldownUnits"),
  getFilterOptions: () => notImplemented("getFilterOptions"),
  getHeatmap: () => notImplemented("getHeatmap"),
  ALL_ENTITY_LABEL: "전체"
};
