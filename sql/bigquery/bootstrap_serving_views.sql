create schema if not exists `plabfootball-51bf5.kevin_serving`;

create or replace view `plabfootball-51bf5.kevin_serving.weeks_view` as
select distinct
  week,
  parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date
from `plabfootball-51bf5.data_mart.data_mart_1_social_match`
where period_type = 'week'
  and week is not null
  and length(trim(week)) >= 8
  and parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) <= current_date('Asia/Seoul');

create or replace view `plabfootball-51bf5.kevin_serving.entity_hierarchy` as
select distinct
  nullif(trim(area_group), '') as area_group,
  nullif(trim(area), '') as area,
  nullif(trim(stadium_group), '') as stadium_group,
  nullif(trim(stadium), '') as stadium
from `plabfootball-51bf5.data_mart.data_mart_1_social_match`
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
