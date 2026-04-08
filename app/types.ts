export type PeriodUnit = "year" | "quarter" | "month" | "week" | "day";

export type MeasurementUnit = string;

export type MeasurementUnitOption = {
  value: MeasurementUnit;
  label: string;
};

export type Metric = {
  id: string;
  name: string;
  description: string;
  query?: string;
  category2?: string | null;
  category3?: string | null;
  format: "number" | "percent";
};

export type Entity = {
  id: string;
  name: string;
  unit: MeasurementUnit;
  regionGroupId?: string;
  regionId?: string;
  stadiumId?: string;
};

export type EntitySeries = {
  entity: Entity;
  metrics: Record<string, number[]>;
};

export type FilterOption = {
  label: string;
  value: string;
};

export type FilterTemplateConfig = {
  periodUnit?: PeriodUnit;
  periodRangeValue: string;
  measurementUnit: MeasurementUnit;
  filterValue: string;
  selectedMetricIds: string[];
};

export type FilterTemplate = {
  id: string;
  user_id: string;
  name: string;
  config: FilterTemplateConfig;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type MetricSummaryItem = {
  metricId: string;
  name: string;
  latest: number | null;
  delta: number | null;
  format: "number" | "percent";
};

export type MetricSeriesItem = {
  metricId: string;
  name: string;
  values: (number | null)[];
  format: "number" | "percent";
};

export type EntitySeriesItem = {
  entityName: string;
  metrics: { metricId: string; values: (number | null)[] }[];
};

export type ChatContext = {
  periodUnit?: PeriodUnit;
  unit: string;
  filter: string;
  weeks: string[];
  primaryMetricId: string;
  metricSummaries: MetricSummaryItem[];
  /** 전체(집계) 시계열 — weeks 순서에 대응 */
  metricSeries: MetricSeriesItem[];
  /** 엔티티별 시계열 (테이블에 표시되는 행 데이터) */
  entitySeries: EntitySeriesItem[];
  /** 전체 엔티티 수 (entitySeries가 잘렸을 수 있음) */
  totalEntityCount?: number;
};

export type SummaryPayload = {
  title: string;
  bullets: string[];
  caution?: string;
};

// ─── AI Filter Action Types ───

export type FilterAction = {
  type: "apply_filters";
  filters: {
    periodUnit?: PeriodUnit;
    periodRangeValue?: string;
    measurementUnit?: string;
    filterValue?: string;
    metricIds?: string[];
  };
};

export type AiChatAvailableOptions = {
  periodUnits?: { label: string; value: PeriodUnit }[];
  periodRanges: { label: string; value: string }[];
  measurementUnits: { label: string; value: string }[];
  filterOptions: string[];
  metricOptions: { id: string; name: string }[];
};

export type ChartConfig = {
  type: "line" | "bar";
  title: string;
  labels: string[];
  datasets: { name: string; values: (number | null)[] }[];
  yAxis?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  charts?: ChartConfig[];
};
