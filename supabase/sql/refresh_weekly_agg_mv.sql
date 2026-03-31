-- Weekly rebuild for analytic MV after Airbyte overwrite/refresh cycles.
-- Aggregation rule:
-- - *_rate metrics -> AVG
-- - other metrics  -> MAX

set statement_timeout = 0;

create or replace view bigquery.weeks_view as
select distinct
  week,
  to_date('20' || substr(week, 1, 8), 'YYYY.MM.DD') as week_start_date
from bigquery.data_mart_1_social_match
where period_type = 'week'
  and week is not null
  and length(trim(week)) >= 8
  and to_date('20' || substr(week, 1, 8), 'YYYY.MM.DD') <= current_date;

drop materialized view if exists bigquery.weekly_expanded_agg_mv;
drop type if exists bigquery.weekly_expanded_agg_mv cascade;
drop materialized view if exists bigquery.entity_hierarchy_mv;

create materialized view bigquery.entity_hierarchy_mv as
select distinct
  nullif(trim(area_group), '') as area_group,
  nullif(trim(area), '') as area,
  nullif(trim(stadium_group), '') as stadium_group,
  nullif(trim(stadium), '') as stadium
from bigquery.data_mart_1_social_match
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

create index if not exists idx_entity_hierarchy_area_group
  on bigquery.entity_hierarchy_mv (area_group);

create index if not exists idx_entity_hierarchy_area
  on bigquery.entity_hierarchy_mv (area);

create index if not exists idx_entity_hierarchy_stadium_group
  on bigquery.entity_hierarchy_mv (stadium_group);

create index if not exists idx_entity_hierarchy_stadium
  on bigquery.entity_hierarchy_mv (stadium);

create index if not exists idx_entity_hierarchy_area_group_area
  on bigquery.entity_hierarchy_mv (area_group, area);

create index if not exists idx_entity_hierarchy_area_stadium_group
  on bigquery.entity_hierarchy_mv (area, stadium_group);

create index if not exists idx_entity_hierarchy_stadium_group_stadium
  on bigquery.entity_hierarchy_mv (stadium_group, stadium);

drop materialized view if exists bigquery.weekly_agg_mv;

create materialized view bigquery.weekly_agg_mv as
with base as (
  select
    s.week,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    s.area_group,
    s.area,
    s.stadium_group,
    s.stadium,
    s.time,
    s.hour,
    s.yoil,
    s.yoil_group,
    m.metric_id,
    m.value_num as value
  from bigquery.data_mart_1_social_match s
  join bigquery.weeks_view w
    on w.week = s.week
  cross join lateral (
    select
      kv.key as metric_id,
      case
        when kv.value is null then null
        when jsonb_typeof(kv.value) = 'number' then (kv.value::text)::double precision
        when jsonb_typeof(kv.value) = 'string'
          and trim(both '"' from kv.value::text) ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (trim(both '"' from kv.value::text))::double precision
        else null
      end as value_num
    from jsonb_each(
      to_jsonb(s)
      - '{_airbyte_raw_id,_airbyte_extracted_at,_airbyte_meta,_airbyte_generation_id,day,area,hour,time,week,year,yoil,month,quarter,stadium,area_group,yoil_group,period_type,stadium_group,dimension_type}'::text[]
    ) kv
    join bigquery.metric_store_native ms
      on ms.metric = kv.key
  ) m
  where s.period_type = 'week'
    and s.day is null
    and s.yoil is null
    and s.yoil_group is null
    and s.hour is null
    and s.time is null
    and m.value_num is not null
),
unit_rows as (
  select
    week,
    'all'::text as measure_unit,
    concat(chr(51204), chr(52404))::text as filter_value,
    metric_id,
    value
  from base
  where dimension_type = 'all'

  union all

  select week, 'area_group'::text, area_group, metric_id, value
  from base
  where dimension_type = 'area_group'
    and area_group is not null

  union all

  select week, 'area'::text, area, metric_id, value
  from base
  where dimension_type = 'area'
    and area is not null

  union all

  select week, 'stadium_group'::text, stadium_group, metric_id, value
  from base
  where dimension_type = 'stadium_group'
    and stadium_group is not null

  union all

  select week, 'stadium'::text, stadium, metric_id, value
  from base
  where dimension_type = 'stadium'
    and stadium is not null

  union all

  select week, 'area_group_and_time'::text, concat_ws(' | ', area_group, time), metric_id, value
  from base
  where dimension_type = 'area_group_and_time'
    and area_group is not null
    and time is not null

  union all

  select week, 'area_and_time'::text, concat_ws(' | ', area, time), metric_id, value
  from base
  where dimension_type = 'area_and_time'
    and area is not null
    and time is not null

  union all

  select week, 'stadium_group_and_time'::text, concat_ws(' | ', stadium_group, time), metric_id, value
  from base
  where dimension_type = 'stadium_group_and_time'
    and stadium_group is not null
    and time is not null

  union all

  select week, 'stadium_and_time'::text, concat_ws(' | ', stadium, time), metric_id, value
  from base
  where dimension_type = 'stadium_and_time'
    and stadium is not null
    and time is not null

  union all

  select week, 'time'::text, time, metric_id, value
  from base
  where dimension_type = 'time'
    and time is not null

  union all

  select week, 'hour'::text, hour, metric_id, value
  from base
  where dimension_type = 'hour'
    and hour is not null

)
select
  week,
  measure_unit,
  filter_value,
  metric_id,
  case
    when metric_id like '%\_rate' escape '\' then avg(value)
    else max(value)
  end as value
from unit_rows
group by week, measure_unit, filter_value, metric_id;

create unique index if not exists idx_weekly_agg_mv_uniq
  on bigquery.weekly_agg_mv (week, measure_unit, filter_value, metric_id);

create index if not exists idx_weekly_agg_mv_unit_week_metric
  on bigquery.weekly_agg_mv (measure_unit, week, metric_id);

create index if not exists idx_weekly_agg_mv_unit_filter_week_metric
  on bigquery.weekly_agg_mv (measure_unit, filter_value, week, metric_id);

create index if not exists idx_weekly_agg_mv_unit_metric_filter
  on bigquery.weekly_agg_mv (measure_unit, metric_id, filter_value);

create materialized view bigquery.weekly_expanded_agg_mv as
with recent_weeks as (
  select week
  from bigquery.weeks_view
  order by week_start_date desc
  limit 24
),
hierarchy_by_area as (
  select distinct area, area_group
  from bigquery.entity_hierarchy_mv
  where area is not null
),
hierarchy_by_stadium_group as (
  select distinct stadium_group, area, area_group
  from bigquery.entity_hierarchy_mv
  where stadium_group is not null
),
hierarchy_by_stadium as (
  select distinct stadium, stadium_group, area, area_group
  from bigquery.entity_hierarchy_mv
  where stadium is not null
),
base as (
  select
    s.week,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    coalesce(nullif(trim(s.area_group), ''), ha.area_group, hsg.area_group, hs.area_group) as area_group,
    coalesce(nullif(trim(s.area), ''), hsg.area, hs.area) as area,
    coalesce(nullif(trim(s.stadium_group), ''), hs.stadium_group) as stadium_group,
    nullif(trim(s.stadium), '') as stadium,
    nullif(trim(s.time), '') as time,
    nullif(trim(s.hour), '') as hour,
    nullif(trim(s.yoil), '') as yoil,
    nullif(trim(s.yoil_group), '') as yoil_group,
    m.metric_id,
    m.value_num as value
  from bigquery.data_mart_1_social_match s
  join recent_weeks rw
    on rw.week = s.week
  left join hierarchy_by_area ha
    on ha.area = nullif(trim(s.area), '')
  left join hierarchy_by_stadium_group hsg
    on hsg.stadium_group = nullif(trim(s.stadium_group), '')
  left join hierarchy_by_stadium hs
    on hs.stadium = nullif(trim(s.stadium), '')
  cross join lateral (
    select
      kv.key as metric_id,
      case
        when kv.value is null then null
        when jsonb_typeof(kv.value) = 'number' then (kv.value::text)::double precision
        when jsonb_typeof(kv.value) = 'string'
          and trim(both '"' from kv.value::text) ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (trim(both '"' from kv.value::text))::double precision
        else null
      end as value_num
    from jsonb_each(
      to_jsonb(s)
      - '{_airbyte_raw_id,_airbyte_extracted_at,_airbyte_meta,_airbyte_generation_id,day,area,hour,time,week,year,yoil,month,quarter,stadium,area_group,yoil_group,period_type,stadium_group,dimension_type}'::text[]
    ) kv
    join bigquery.metric_store_native ms
      on ms.metric = kv.key
  ) m
  where s.period_type = 'week'
    and s.day is null
    and s.dimension_type in (
      'area_group_and_time',
      'area_and_time',
      'stadium_group_and_time',
      'stadium_and_time',
      'time',
      'hour'
    )
    and m.value_num is not null
),
unit_rows as (
  select
    week,
    'area_group_and_time'::text as measure_unit,
    concat_ws(' | ', area_group, time) as filter_value,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
    metric_id,
    value
  from base
  where dimension_type = 'area_group_and_time'
    and area_group is not null
    and time is not null

  union all

  select
    week,
    'area_and_time'::text,
    concat_ws(' | ', area, time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
    metric_id,
    value
  from base
  where dimension_type = 'area_and_time'
    and area is not null
    and time is not null

  union all

  select
    week,
    'stadium_group_and_time'::text,
    concat_ws(' | ', stadium_group, time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
    metric_id,
    value
  from base
  where dimension_type = 'stadium_group_and_time'
    and stadium_group is not null
    and time is not null

  union all

  select
    week,
    'stadium_and_time'::text,
    concat_ws(' | ', stadium, time),
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
    metric_id,
    value
  from base
  where dimension_type = 'stadium_and_time'
    and stadium is not null
    and time is not null

  union all

  select
    week,
    'time'::text,
    time,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
    metric_id,
    value
  from base
  where dimension_type = 'time'
    and time is not null

  union all

  select
    week,
    'hour'::text,
    hour,
    area_group,
    area,
    stadium_group,
    stadium,
    time,
    hour,
    yoil,
    yoil_group,
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
  yoil,
  yoil_group,
  metric_id,
  case
    when metric_id like '%\_rate' escape '\' then avg(value)
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
  yoil,
  yoil_group,
  metric_id;

create index if not exists idx_weekly_expanded_agg_mv_week_unit_filter_metric
  on bigquery.weekly_expanded_agg_mv (week, measure_unit, filter_value, metric_id);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_metric
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, metric_id);

create index if not exists idx_weekly_expanded_agg_mv_unit_filter_week_metric
  on bigquery.weekly_expanded_agg_mv (measure_unit, filter_value, week, metric_id);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_area_group
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, area_group);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_area
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, area);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_stadium_group
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, stadium_group);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_stadium
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, stadium);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_time
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, time);

create index if not exists idx_weekly_expanded_agg_mv_unit_week_hour
  on bigquery.weekly_expanded_agg_mv (measure_unit, week, hour);

create index if not exists idx_weekly_expanded_agg_mv_unit_metric_week_area_group_time
  on bigquery.weekly_expanded_agg_mv (measure_unit, metric_id, week, area_group, time);

create index if not exists idx_weekly_expanded_agg_mv_unit_metric_week_area_time
  on bigquery.weekly_expanded_agg_mv (measure_unit, metric_id, week, area, time);

create index if not exists idx_weekly_expanded_agg_mv_unit_metric_week_stadium_group_time
  on bigquery.weekly_expanded_agg_mv (measure_unit, metric_id, week, stadium_group, time);

create index if not exists idx_weekly_expanded_agg_mv_unit_metric_week_stadium_time
  on bigquery.weekly_expanded_agg_mv (measure_unit, metric_id, week, stadium, time);

notify pgrst, 'reload schema';

reset statement_timeout;
