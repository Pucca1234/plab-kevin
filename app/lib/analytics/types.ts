export type WeekEntry = {
  week: string;
  startDate: string | null;
};

export type MeasurementUnitOption = {
  value: string;
  label: string;
};

export type MetricDictionaryItem = {
  metric: string;
  korean_name: string;
  description: string | null;
  query: string | null;
  category2?: string | null;
  category3?: string | null;
};

export type HeatmapRow = {
  entity: string;
  week: string;
  metrics: Record<string, number>;
};

export type AnalyticsProvider = {
  getWeeksData(options?: {
    limit?: number;
    order?: "asc" | "desc";
    periodUnit?: "year" | "month" | "week" | "day";
  }): Promise<WeekEntry[]>;
  getWeeks(limit?: number, periodUnit?: "year" | "month" | "week" | "day"): Promise<string[]>;
  getLatestWeek(periodUnit?: "year" | "month" | "week" | "day"): Promise<string | null>;
  getSupportedMetricIds(timings?: { queryMs?: number; processMs?: number }): Promise<string[]>;
  getMetricDictionary(
    timings?: { queryMs?: number; processMs?: number }
  ): Promise<MetricDictionaryItem[]>;
  getMeasurementUnitOptions(): Promise<MeasurementUnitOption[]>;
  getMeasurementUnitIds(): Promise<string[]>;
  getAvailableDrilldownUnits(params: {
    sourceUnit: string;
    sourceValue: string;
    candidateUnits: string[];
    weeks?: string[];
    periodUnit?: "year" | "month" | "week" | "day";
  }): Promise<string[]>;
  getFilterOptions(
    measureUnit: string,
    options?: {
      parentUnit?: string | null;
      parentValue?: string | null;
      weeks?: string[];
      periodUnit?: "year" | "month" | "week" | "day";
    }
  ): Promise<string[]>;
  getHeatmap(
    params: {
      measureUnit: string;
      filterValue: string | null;
      weeks: string[];
      metrics?: string[];
      parentUnit?: string | null;
      parentValue?: string | null;
      periodUnit?: "year" | "month" | "week" | "day";
    },
    timings?: { queryMs?: number; processMs?: number }
  ): Promise<HeatmapRow[]>;
  ALL_ENTITY_LABEL: string;
};
