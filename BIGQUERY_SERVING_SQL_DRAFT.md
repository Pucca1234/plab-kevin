# BigQuery Serving SQL Draft

## 1. 목적
- 현재 Supabase `bigquery` schema에서 담당하던 serving 역할을 BigQuery 쪽으로 옮기기 위한 SQL 초안을 정의한다.
- 이 문서는 구현용 초안이며, 실제 dataset/table 이름은 GCP 프로젝트 구조에 맞춰 조정한다.

## 2. Source Assumption
- source table:
  - `source.data_mart_1_social_match`
- metric dictionary:
  - `source.metric_store_native`

## 3. 공통 집계 원칙
- `period_type = 'week'`
- legacy 주간 집계는 아래 조건으로 week grain만 사용
  - `day is null`
  - `yoil is null`
  - `yoil_group is null`
  - `hour is null`
  - `time is null`
- metric aggregation:
  - `*_rate` -> `AVG(value)`
  - 그 외 -> `MAX(value)`

## 4. Candidate Dataset
- dataset: `kevin_serving`

## 5. weeks_view draft
```sql
create or replace view `kevin_serving.weeks_view` as
select distinct
  week,
  parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date
from `source.data_mart_1_social_match`
where period_type = 'week'
  and week is not null
  and length(trim(week)) >= 8
  and parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) <= current_date('Asia/Seoul');
```

## 6. entity_hierarchy draft
```sql
create or replace table `kevin_serving.entity_hierarchy` as
select distinct
  nullif(trim(area_group), '') as area_group,
  nullif(trim(area), '') as area,
  nullif(trim(stadium_group), '') as stadium_group,
  nullif(trim(stadium), '') as stadium
from `source.data_mart_1_social_match`
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
```

## 7. weekly_agg draft
### 7.1 목적
- legacy 단위 전용 serving table
- 대상:
  - `all`
  - `area_group`
  - `area`
  - `stadium_group`
  - `stadium`

### 7.2 draft SQL
```sql
create or replace table `kevin_serving.weekly_agg` as
with base as (
  select
    s.week,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    nullif(trim(s.area_group), '') as area_group,
    nullif(trim(s.area), '') as area,
    nullif(trim(s.stadium_group), '') as stadium_group,
    nullif(trim(s.stadium), '') as stadium,
    metric_id,
    value
  from `source.data_mart_1_social_match` s,
  unnest([
    struct('total_match_cnt' as metric_id, cast(total_match_cnt as float64) as value)
    -- TODO: generate full metric list from metric_store_native intersection
  ])
  where s.period_type = 'week'
    and s.day is null
    and s.yoil is null
    and s.yoil_group is null
    and s.hour is null
    and s.time is null
    and value is not null
),
unit_rows as (
  select week, 'all' as measure_unit, '전체' as filter_value, metric_id, value
  from base
  where dimension_type = 'all'

  union all

  select week, 'area_group', area_group, metric_id, value
  from base
  where dimension_type = 'area_group' and area_group is not null

  union all

  select week, 'area', area, metric_id, value
  from base
  where dimension_type = 'area' and area is not null

  union all

  select week, 'stadium_group', stadium_group, metric_id, value
  from base
  where dimension_type = 'stadium_group' and stadium_group is not null

  union all

  select week, 'stadium', stadium, metric_id, value
  from base
  where dimension_type = 'stadium' and stadium is not null
)
select
  week,
  measure_unit,
  filter_value,
  metric_id,
  case
    when ends_with(metric_id, '_rate') then avg(value)
    else max(value)
  end as value
from unit_rows
group by week, measure_unit, filter_value, metric_id;
```

## 8. weekly_expanded_agg draft
### 8.1 목적
- expanded 단위 전용 serving table
- 대상:
  - `area_group_and_time`
  - `area_and_time`
  - `stadium_group_and_time`
  - `stadium_and_time`
  - `time`
  - `hour`

### 8.2 최근 범위
- 초기 운영안:
  - 최근 24주만 유지
- 이유:
  - 조회 패턴이 최근 8/12/24주 중심
  - 비용과 성능 통제를 동시에 만족하기 쉬움

### 8.3 draft SQL
```sql
create or replace table `kevin_serving.weekly_expanded_agg` as
with recent_weeks as (
  select week
  from `kevin_serving.weeks_view`
  order by week_start_date desc
  limit 24
),
base as (
  select
    s.week,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    nullif(trim(s.area_group), '') as area_group,
    nullif(trim(s.area), '') as area,
    nullif(trim(s.stadium_group), '') as stadium_group,
    nullif(trim(s.stadium), '') as stadium,
    nullif(trim(s.time), '') as time,
    nullif(trim(s.hour), '') as hour,
    metric_id,
    value
  from `source.data_mart_1_social_match` s
  join recent_weeks rw on rw.week = s.week,
  unnest([
    struct('total_match_cnt' as metric_id, cast(total_match_cnt as float64) as value)
    -- TODO: generate full metric list from metric_store_native intersection
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
  select
    week,
    'area_group_and_time' as measure_unit,
    concat(area_group, ' | ', time) as filter_value,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'area_group_and_time'
    and area_group is not null
    and time is not null

  union all

  select
    week,
    'area_and_time',
    concat(area, ' | ', time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'area_and_time'
    and area is not null
    and time is not null

  union all

  select
    week,
    'stadium_group_and_time',
    concat(stadium_group, ' | ', time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'stadium_group_and_time'
    and stadium_group is not null
    and time is not null

  union all

  select
    week,
    'stadium_and_time',
    concat(stadium, ' | ', time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'stadium_and_time'
    and stadium is not null
    and time is not null

  union all

  select
    week,
    'time',
    time,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'time'
    and time is not null

  union all

  select
    week,
    'hour',
    hour,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    metric_id,
    value
  from base
  where dimension_type = 'hour'
    and hour is not null
)
select
  week,
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
group by
  week,
  measure_unit,
  filter_value,
  area_group,
  area,
  stadium_group,
  stadium,
  time,
  hour,
  metric_id;
```

## 9. Implementation Notes
- BigQuery는 Postgres처럼 `jsonb_each(to_jsonb(s))` 패턴을 바로 쓰지 않으므로, metric expansion 방식은 별도 선택이 필요하다.
- 후보:
  - SQL code generation
  - metadata-driven dynamic SQL
  - ETL step에서 metric long format table 생성

## 10. Recommended Implementation Choice
- 1차 구현은 `metric_store_native` 기준으로 허용 metric list를 읽어 SQL generation 스크립트로 serving SQL을 만든다.
- 이유:
  - 현재 앱의 metric dynamic behavior를 유지하기 쉬움
  - raw source schema가 바뀌어도 generation 스크립트만 갱신하면 됨

## 11. Next Work
1. metric expansion 전략 결정
2. BigQuery dataset/table naming 확정
3. scheduled query vs materialized view vs table build 결정
4. 실제 실행 가능한 SQL/procedure로 구체화
