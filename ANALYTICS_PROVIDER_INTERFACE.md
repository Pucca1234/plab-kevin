# Analytics Provider Interface Draft

## 1. 목적
- 새 프로젝트에서 analytics backend를 Supabase에서 BigQuery로 교체할 때, UI와 route handler가 직접 DB 세부사항을 알지 않도록 interface를 고정한다.

## 2. 설계 원칙
- route handler는 provider 구현체가 아니라 interface만 의존한다.
- Supabase provider와 BigQuery provider는 같은 반환 shape를 제공한다.
- migration 초기에는 feature flag 또는 환경변수로 provider 교체가 가능하도록 한다.

## 3. Proposed Interface
```ts
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
  getWeeksData(options?: { limit?: number; order?: 'asc' | 'desc' }): Promise<WeekEntry[]>;
  getLatestWeek(): Promise<string | null>;
  getSupportedMetricIds(timings?: { queryMs?: number; processMs?: number }): Promise<string[]>;
  getMetricDictionary(timings?: { queryMs?: number; processMs?: number }): Promise<MetricDictionaryItem[]>;
  getMeasurementUnitOptions(): Promise<MeasurementUnitOption[]>;
  getMeasurementUnitIds(): Promise<string[]>;
  getFilterOptions(
    measureUnit: string,
    options?: { parentUnit?: string | null; parentValue?: string | null; weeks?: string[] }
  ): Promise<string[]>;
  getAvailableDrilldownUnits(params: {
    sourceUnit: string;
    sourceValue: string;
    candidateUnits: string[];
    weeks?: string[];
  }): Promise<string[]>;
  getHeatmap(params: {
    measureUnit: string;
    filterValue: string | null;
    weeks: string[];
    metrics?: string[];
    parentUnit?: string | null;
    parentValue?: string | null;
  }, timings?: { queryMs?: number; processMs?: number }): Promise<HeatmapRow[]>;
};
```

## 4. Current Mapping from `dataQueries.ts`
- 그대로 provider method로 옮길 대상:
  - `getWeeksData`
  - `getLatestWeek`
  - `getSupportedMetricIds`
  - `getMetricDictionary`
  - `getMeasurementUnitOptions`
  - `getMeasurementUnitIds`
  - `getFilterOptions`
  - `getAvailableDrilldownUnits`
  - `getHeatmap`

## 5. Provider Implementations
### 5.1 `supabaseAnalyticsProvider`
- 목적:
  - 현재 운영 로직 보존
  - 결과 비교용 baseline
- 사용 시점:
  - migration 검증
  - diff testing

### 5.2 `bigqueryAnalyticsProvider`
- 목적:
  - 새 프로젝트 기본 provider
- 사용 데이터:
  - `kevin_serving.weeks_view`
  - `kevin_serving.entity_hierarchy`
  - `kevin_serving.weekly_agg`
  - `kevin_serving.weekly_expanded_agg`
  - metric dictionary source

## 6. Route Handler Refactor Draft
### Before
- `route.ts -> dataQueries.ts -> Supabase`

### After
- `route.ts -> analyticsProvider.ts -> selected provider`
- `selected provider -> BigQuery or Supabase`

## 7. Provider Selector Draft
```ts
export function getAnalyticsProvider(): AnalyticsProvider {
  const mode = process.env.ANALYTICS_BACKEND ?? 'supabase';
  if (mode === 'bigquery') return bigqueryAnalyticsProvider;
  return supabaseAnalyticsProvider;
}
```

## 8. File Draft
- `app/lib/analytics/types.ts`
- `app/lib/analytics/provider.ts`
- `app/lib/analytics/supabaseProvider.ts`
- `app/lib/analytics/bigqueryProvider.ts`

## 9. Migration Refactor Order
1. 현재 `dataQueries.ts`에서 interface 추출
2. Supabase 구현을 `supabaseProvider.ts`로 이동
3. route handler가 interface를 사용하도록 변경
4. BigQuery provider 추가
5. feature flag로 provider 전환

## 10. Verification Points
- 동일한 request에 대해 Supabase provider와 BigQuery provider가 같은 응답 shape를 반환해야 한다.
- 아래 API를 기준으로 diff 검증한다.
  - `/api/weeks`
  - `/api/filter-options`
  - `/api/drilldown-options`
  - `/api/heatmap`
  - `/api/measurement-units`
  - `/api/metrics`

## 11. Non-goals
- 로그인/Auth provider 변경
- `filter_templates` persistence 변경
- UI 컴포넌트 재설계
