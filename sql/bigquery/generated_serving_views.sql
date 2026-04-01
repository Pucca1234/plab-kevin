create or replace view `plabfootball-51bf5.kevin_serving.weeks_view` as
select distinct
  week,
  parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date
from `plabfootball-51bf5.data_mart.data_mart_1_social_match`
where period_type = 'week'
  and week is not null
  and length(trim(week)) >= 8
  and parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) <= current_date('Asia/Seoul');


begin
  if exists (
    select 1
    from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
    where table_name = 'entity_hierarchy'
  ) then
    execute immediate (
      select if(
        table_type = 'VIEW',
        'drop view `plabfootball-51bf5.kevin_serving.entity_hierarchy`',
        'drop table `plabfootball-51bf5.kevin_serving.entity_hierarchy`'
      )
      from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
      where table_name = 'entity_hierarchy'
      limit 1
    );
  end if;
end;


create table `plabfootball-51bf5.kevin_serving.entity_hierarchy`
cluster by area_group, area, stadium_group, stadium as
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


begin
  if exists (
    select 1
    from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
    where table_name = 'weekly_agg'
  ) then
    execute immediate (
      select if(
        table_type = 'VIEW',
        'drop view `plabfootball-51bf5.kevin_serving.weekly_agg`',
        'drop table `plabfootball-51bf5.kevin_serving.weekly_agg`'
      )
      from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
      where table_name = 'weekly_agg'
      limit 1
    );
  end if;
end;


create table `plabfootball-51bf5.kevin_serving.weekly_agg`
partition by week_start_date
cluster by measure_unit, metric_id, filter_value as
with base as (
  select
    week,
    parse_date('%Y.%m.%d', concat('20', substr(week, 1, 8))) as week_start_date,
    coalesce(nullif(trim(dimension_type), ''), 'all') as dimension_type,
    nullif(trim(area_group), '') as area_group,
    nullif(trim(area), '') as area,
    nullif(trim(stadium_group), '') as stadium_group,
    nullif(trim(stadium), '') as stadium,
    metric_id,
    value
  from `plabfootball-51bf5.data_mart.data_mart_1_social_match`,
  unnest([
    struct('0p_cancel_match_rate' as metric_id, cast(`0p_cancel_match_rate` as float64) as value),
    struct('1p_cancel_match_rate' as metric_id, cast(`1p_cancel_match_rate` as float64) as value),
    struct('2p_cancel_match_rate' as metric_id, cast(`2p_cancel_match_rate` as float64) as value),
    struct('3p_cancel_match_rate' as metric_id, cast(`3p_cancel_match_rate` as float64) as value),
    struct('4p_cancel_match_rate' as metric_id, cast(`4p_cancel_match_rate` as float64) as value),
    struct('5p_cancel_match_rate' as metric_id, cast(`5p_cancel_match_rate` as float64) as value),
    struct('6p_cancel_match_rate' as metric_id, cast(`6p_cancel_match_rate` as float64) as value),
    struct('7p_cancel_match_rate' as metric_id, cast(`7p_cancel_match_rate` as float64) as value),
    struct('8p_cancel_match_rate' as metric_id, cast(`8p_cancel_match_rate` as float64) as value),
    struct('9p_cancel_match_rate' as metric_id, cast(`9p_cancel_match_rate` as float64) as value),
    struct('a_time_progress_match_to_total_rate' as metric_id, cast(`a_time_progress_match_to_total_rate` as float64) as value),
    struct('a_time_setting_match_to_total_rate' as metric_id, cast(`a_time_setting_match_to_total_rate` as float64) as value),
    struct('active_manager_cnt' as metric_id, cast(`active_manager_cnt` as float64) as value),
    struct('active_stadium_cnt' as metric_id, cast(`active_stadium_cnt` as float64) as value),
    struct('active_user_cnt' as metric_id, cast(`active_user_cnt` as float64) as value),
    struct('added_setting_match_to_total_rate' as metric_id, cast(`added_setting_match_to_total_rate` as float64) as value),
    struct('apply_before_n_day_avg' as metric_id, cast(`apply_before_n_day_avg` as float64) as value),
    struct('apply_before_n_day_median' as metric_id, cast(`apply_before_n_day_median` as float64) as value),
    struct('apply_before_n_hour_avg' as metric_id, cast(`apply_before_n_hour_avg` as float64) as value),
    struct('apply_before_n_hour_median' as metric_id, cast(`apply_before_n_hour_median` as float64) as value),
    struct('apply_cancel_fee_per_enter_cnt' as metric_id, cast(`apply_cancel_fee_per_enter_cnt` as float64) as value),
    struct('apply_cancel_fee_to_sales_rate' as metric_id, cast(`apply_cancel_fee_to_sales_rate` as float64) as value),
    struct('apply_cnt' as metric_id, cast(`apply_cnt` as float64) as value),
    struct('apply_cnt_per_active_user' as metric_id, cast(`apply_cnt_per_active_user` as float64) as value),
    struct('b_time_progress_match_to_total_rate' as metric_id, cast(`b_time_progress_match_to_total_rate` as float64) as value),
    struct('b_time_setting_match_to_total_rate' as metric_id, cast(`b_time_setting_match_to_total_rate` as float64) as value),
    struct('c_time_progress_match_to_total_rate' as metric_id, cast(`c_time_progress_match_to_total_rate` as float64) as value),
    struct('c_time_setting_match_to_total_rate' as metric_id, cast(`c_time_setting_match_to_total_rate` as float64) as value),
    struct('cash_enter_cost_rate' as metric_id, cast(`cash_enter_cost_rate` as float64) as value),
    struct('cash_payment_amount_per_enter_cnt' as metric_id, cast(`cash_payment_amount_per_enter_cnt` as float64) as value),
    struct('cash_reward_cost_per_enter_cnt' as metric_id, cast(`cash_reward_cost_per_enter_cnt` as float64) as value),
    struct('cash_reward_cost_to_sales_rate' as metric_id, cast(`cash_reward_cost_to_sales_rate` as float64) as value),
    struct('contribution_margin' as metric_id, cast(`contribution_margin` as float64) as value),
    struct('contribution_margin_rate' as metric_id, cast(`contribution_margin_rate` as float64) as value),
    struct('d_time_progress_match_to_total_rate' as metric_id, cast(`d_time_progress_match_to_total_rate` as float64) as value),
    struct('d_time_setting_match_to_total_rate' as metric_id, cast(`d_time_setting_match_to_total_rate` as float64) as value),
    struct('e_time_progress_match_to_total_rate' as metric_id, cast(`e_time_progress_match_to_total_rate` as float64) as value),
    struct('e_time_setting_match_to_total_rate' as metric_id, cast(`e_time_setting_match_to_total_rate` as float64) as value),
    struct('enter_cnt' as metric_id, cast(`enter_cnt` as float64) as value),
    struct('enter_cnt_per_enter_user' as metric_id, cast(`enter_cnt_per_enter_user` as float64) as value),
    struct('enter_cnt_per_progress_match' as metric_id, cast(`enter_cnt_per_progress_match` as float64) as value),
    struct('enter_seat_cnt_per_progress_match' as metric_id, cast(`enter_seat_cnt_per_progress_match` as float64) as value),
    struct('enter_seat_occupancy_rate' as metric_id, cast(`enter_seat_occupancy_rate` as float64) as value),
    struct('enter_seat_price_per_enter_cnt' as metric_id, cast(`enter_seat_price_per_enter_cnt` as float64) as value),
    struct('enter_user_cnt' as metric_id, cast(`enter_user_cnt` as float64) as value),
    struct('f_time_progress_match_to_total_rate' as metric_id, cast(`f_time_progress_match_to_total_rate` as float64) as value),
    struct('f_time_setting_match_to_total_rate' as metric_id, cast(`f_time_setting_match_to_total_rate` as float64) as value),
    struct('fixed_setting_match_to_total_rate' as metric_id, cast(`fixed_setting_match_to_total_rate` as float64) as value),
    struct('g_time_progress_match_to_total_rate' as metric_id, cast(`g_time_progress_match_to_total_rate` as float64) as value),
    struct('g_time_setting_match_to_total_rate' as metric_id, cast(`g_time_setting_match_to_total_rate` as float64) as value),
    struct('h_time_progress_match_to_total_rate' as metric_id, cast(`h_time_progress_match_to_total_rate` as float64) as value),
    struct('h_time_setting_match_to_total_rate' as metric_id, cast(`h_time_setting_match_to_total_rate` as float64) as value),
    struct('i_time_progress_match_to_total_rate' as metric_id, cast(`i_time_progress_match_to_total_rate` as float64) as value),
    struct('i_time_setting_match_to_total_rate' as metric_id, cast(`i_time_setting_match_to_total_rate` as float64) as value),
    struct('j_time_progress_match_to_total_rate' as metric_id, cast(`j_time_progress_match_to_total_rate` as float64) as value),
    struct('j_time_setting_match_to_total_rate' as metric_id, cast(`j_time_setting_match_to_total_rate` as float64) as value),
    struct('manager_benefit_cost' as metric_id, cast(`manager_benefit_cost` as float64) as value),
    struct('manager_cancel_reward_cost' as metric_id, cast(`manager_cancel_reward_cost` as float64) as value),
    struct('manager_cost' as metric_id, cast(`manager_cost` as float64) as value),
    struct('manager_cost_per_progress_match_cnt' as metric_id, cast(`manager_cost_per_progress_match_cnt` as float64) as value),
    struct('manager_cost_to_sales_rate' as metric_id, cast(`manager_cost_to_sales_rate` as float64) as value),
    struct('manager_fixed_progress_cost' as metric_id, cast(`manager_fixed_progress_cost` as float64) as value),
    struct('manager_incentive_cost' as metric_id, cast(`manager_incentive_cost` as float64) as value),
    struct('manager_match_cnt' as metric_id, cast(`manager_match_cnt` as float64) as value),
    struct('manager_match_open_rate' as metric_id, cast(`manager_match_open_rate` as float64) as value),
    struct('manager_precipitation_compensation_cost' as metric_id, cast(`manager_precipitation_compensation_cost` as float64) as value),
    struct('manager_promotion_cost' as metric_id, cast(`manager_promotion_cost` as float64) as value),
    struct('match_loss_rate' as metric_id, cast(`match_loss_rate` as float64) as value),
    struct('match_open_rate' as metric_id, cast(`match_open_rate` as float64) as value),
    struct('matching_rate' as metric_id, cast(`matching_rate` as float64) as value),
    struct('new_enter_user_cnt' as metric_id, cast(`new_enter_user_cnt` as float64) as value),
    struct('new_user_cnt' as metric_id, cast(`new_user_cnt` as float64) as value),
    struct('not_cash_enter_cost_rate' as metric_id, cast(`not_cash_enter_cost_rate` as float64) as value),
    struct('over_6p_cancel_match_rate' as metric_id, cast(`over_6p_cancel_match_rate` as float64) as value),
    struct('pick_match_cnt_per_active_manager' as metric_id, cast(`pick_match_cnt_per_active_manager` as float64) as value),
    struct('plaber_match_cnt' as metric_id, cast(`plaber_match_cnt` as float64) as value),
    struct('plaber_match_open_rate' as metric_id, cast(`plaber_match_open_rate` as float64) as value),
    struct('point_reward_cost_to_sales_rate' as metric_id, cast(`point_reward_cost_to_sales_rate` as float64) as value),
    struct('precipitation_forecast_match_rate' as metric_id, cast(`precipitation_forecast_match_rate` as float64) as value),
    struct('progress_match_cnt' as metric_id, cast(`progress_match_cnt` as float64) as value),
    struct('progress_match_rate' as metric_id, cast(`progress_match_rate` as float64) as value),
    struct('reward_cost_to_sales_rate' as metric_id, cast(`reward_cost_to_sales_rate` as float64) as value),
    struct('sales' as metric_id, cast(`sales` as float64) as value),
    struct('sales_per_enter_cnt' as metric_id, cast(`sales_per_enter_cnt` as float64) as value),
    struct('setting_match_cnt' as metric_id, cast(`setting_match_cnt` as float64) as value),
    struct('setting_match_cnt_per_active_stadium' as metric_id, cast(`setting_match_cnt_per_active_stadium` as float64) as value),
    struct('stadium_fee' as metric_id, cast(`stadium_fee` as float64) as value),
    struct('stadium_fee_per_progress_match_cnt' as metric_id, cast(`stadium_fee_per_progress_match_cnt` as float64) as value),
    struct('stadium_fee_to_sales_rate' as metric_id, cast(`stadium_fee_to_sales_rate` as float64) as value),
    struct('total_match_cnt' as metric_id, cast(`total_match_cnt` as float64) as value),
    struct('under_6p_cancel_match_rate' as metric_id, cast(`under_6p_cancel_match_rate` as float64) as value),
    struct('user_self_cancel_rate' as metric_id, cast(`user_self_cancel_rate` as float64) as value),
    struct('variable_cost' as metric_id, cast(`variable_cost` as float64) as value)
  ])
  where period_type = 'week'
    and day is null
    and yoil is null
    and yoil_group is null
    and hour is null
    and time is null
    and value is not null
),
unit_rows as (
  select week, week_start_date, 'all' as measure_unit, '전체' as filter_value, metric_id, value
  from base
  where dimension_type = 'all'

  union all

  select week, week_start_date, 'area_group', area_group, metric_id, value
  from base
  where dimension_type = 'area_group' and area_group is not null

  union all

  select week, week_start_date, 'area', area, metric_id, value
  from base
  where dimension_type = 'area' and area is not null

  union all

  select week, week_start_date, 'stadium_group', stadium_group, metric_id, value
  from base
  where dimension_type = 'stadium_group' and stadium_group is not null

  union all

  select week, week_start_date, 'stadium', stadium, metric_id, value
  from base
  where dimension_type = 'stadium' and stadium is not null
)
select
  week,
  week_start_date,
  measure_unit,
  filter_value,
  metric_id,
  case
    when ends_with(metric_id, '_rate') then avg(value)
    else max(value)
  end as value
from unit_rows
group by week, week_start_date, measure_unit, filter_value, metric_id;


begin
  if exists (
    select 1
    from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
    where table_name = 'weekly_expanded_agg'
  ) then
    execute immediate (
      select if(
        table_type = 'VIEW',
        'drop view `plabfootball-51bf5.kevin_serving.weekly_expanded_agg`',
        'drop table `plabfootball-51bf5.kevin_serving.weekly_expanded_agg`'
      )
      from `plabfootball-51bf5.kevin_serving.INFORMATION_SCHEMA.TABLES`
      where table_name = 'weekly_expanded_agg'
      limit 1
    );
  end if;
end;


create table `plabfootball-51bf5.kevin_serving.weekly_expanded_agg`
partition by week_start_date
cluster by measure_unit, metric_id, filter_value as
with recent_weeks as (
  select week
  from `plabfootball-51bf5.kevin_serving.weeks_view`
  order by week_start_date desc
  limit 24
),
base as (
  select
    s.week,
    parse_date('%Y.%m.%d', concat('20', substr(s.week, 1, 8))) as week_start_date,
    nullif(trim(s.area_group), '') as area_group,
    nullif(trim(s.area), '') as area,
    nullif(trim(s.stadium_group), '') as stadium_group,
    nullif(trim(s.stadium), '') as stadium,
    nullif(trim(s.time), '') as time,
    nullif(trim(cast(s.hour as string)), '') as hour,
    nullif(trim(s.yoil), '') as yoil,
    nullif(trim(s.yoil_group), '') as yoil_group,
    coalesce(nullif(trim(s.dimension_type), ''), 'all') as dimension_type,
    metric_id,
    value
  from `plabfootball-51bf5.data_mart.data_mart_1_social_match` s
  join recent_weeks rw on rw.week = s.week,
  unnest([
    struct('0p_cancel_match_rate' as metric_id, cast(`0p_cancel_match_rate` as float64) as value),
    struct('1p_cancel_match_rate' as metric_id, cast(`1p_cancel_match_rate` as float64) as value),
    struct('2p_cancel_match_rate' as metric_id, cast(`2p_cancel_match_rate` as float64) as value),
    struct('3p_cancel_match_rate' as metric_id, cast(`3p_cancel_match_rate` as float64) as value),
    struct('4p_cancel_match_rate' as metric_id, cast(`4p_cancel_match_rate` as float64) as value),
    struct('5p_cancel_match_rate' as metric_id, cast(`5p_cancel_match_rate` as float64) as value),
    struct('6p_cancel_match_rate' as metric_id, cast(`6p_cancel_match_rate` as float64) as value),
    struct('7p_cancel_match_rate' as metric_id, cast(`7p_cancel_match_rate` as float64) as value),
    struct('8p_cancel_match_rate' as metric_id, cast(`8p_cancel_match_rate` as float64) as value),
    struct('9p_cancel_match_rate' as metric_id, cast(`9p_cancel_match_rate` as float64) as value),
    struct('a_time_progress_match_to_total_rate' as metric_id, cast(`a_time_progress_match_to_total_rate` as float64) as value),
    struct('a_time_setting_match_to_total_rate' as metric_id, cast(`a_time_setting_match_to_total_rate` as float64) as value),
    struct('active_manager_cnt' as metric_id, cast(`active_manager_cnt` as float64) as value),
    struct('active_stadium_cnt' as metric_id, cast(`active_stadium_cnt` as float64) as value),
    struct('active_user_cnt' as metric_id, cast(`active_user_cnt` as float64) as value),
    struct('added_setting_match_to_total_rate' as metric_id, cast(`added_setting_match_to_total_rate` as float64) as value),
    struct('apply_before_n_day_avg' as metric_id, cast(`apply_before_n_day_avg` as float64) as value),
    struct('apply_before_n_day_median' as metric_id, cast(`apply_before_n_day_median` as float64) as value),
    struct('apply_before_n_hour_avg' as metric_id, cast(`apply_before_n_hour_avg` as float64) as value),
    struct('apply_before_n_hour_median' as metric_id, cast(`apply_before_n_hour_median` as float64) as value),
    struct('apply_cancel_fee_per_enter_cnt' as metric_id, cast(`apply_cancel_fee_per_enter_cnt` as float64) as value),
    struct('apply_cancel_fee_to_sales_rate' as metric_id, cast(`apply_cancel_fee_to_sales_rate` as float64) as value),
    struct('apply_cnt' as metric_id, cast(`apply_cnt` as float64) as value),
    struct('apply_cnt_per_active_user' as metric_id, cast(`apply_cnt_per_active_user` as float64) as value),
    struct('b_time_progress_match_to_total_rate' as metric_id, cast(`b_time_progress_match_to_total_rate` as float64) as value),
    struct('b_time_setting_match_to_total_rate' as metric_id, cast(`b_time_setting_match_to_total_rate` as float64) as value),
    struct('c_time_progress_match_to_total_rate' as metric_id, cast(`c_time_progress_match_to_total_rate` as float64) as value),
    struct('c_time_setting_match_to_total_rate' as metric_id, cast(`c_time_setting_match_to_total_rate` as float64) as value),
    struct('cash_enter_cost_rate' as metric_id, cast(`cash_enter_cost_rate` as float64) as value),
    struct('cash_payment_amount_per_enter_cnt' as metric_id, cast(`cash_payment_amount_per_enter_cnt` as float64) as value),
    struct('cash_reward_cost_per_enter_cnt' as metric_id, cast(`cash_reward_cost_per_enter_cnt` as float64) as value),
    struct('cash_reward_cost_to_sales_rate' as metric_id, cast(`cash_reward_cost_to_sales_rate` as float64) as value),
    struct('contribution_margin' as metric_id, cast(`contribution_margin` as float64) as value),
    struct('contribution_margin_rate' as metric_id, cast(`contribution_margin_rate` as float64) as value),
    struct('d_time_progress_match_to_total_rate' as metric_id, cast(`d_time_progress_match_to_total_rate` as float64) as value),
    struct('d_time_setting_match_to_total_rate' as metric_id, cast(`d_time_setting_match_to_total_rate` as float64) as value),
    struct('e_time_progress_match_to_total_rate' as metric_id, cast(`e_time_progress_match_to_total_rate` as float64) as value),
    struct('e_time_setting_match_to_total_rate' as metric_id, cast(`e_time_setting_match_to_total_rate` as float64) as value),
    struct('enter_cnt' as metric_id, cast(`enter_cnt` as float64) as value),
    struct('enter_cnt_per_enter_user' as metric_id, cast(`enter_cnt_per_enter_user` as float64) as value),
    struct('enter_cnt_per_progress_match' as metric_id, cast(`enter_cnt_per_progress_match` as float64) as value),
    struct('enter_seat_cnt_per_progress_match' as metric_id, cast(`enter_seat_cnt_per_progress_match` as float64) as value),
    struct('enter_seat_occupancy_rate' as metric_id, cast(`enter_seat_occupancy_rate` as float64) as value),
    struct('enter_seat_price_per_enter_cnt' as metric_id, cast(`enter_seat_price_per_enter_cnt` as float64) as value),
    struct('enter_user_cnt' as metric_id, cast(`enter_user_cnt` as float64) as value),
    struct('f_time_progress_match_to_total_rate' as metric_id, cast(`f_time_progress_match_to_total_rate` as float64) as value),
    struct('f_time_setting_match_to_total_rate' as metric_id, cast(`f_time_setting_match_to_total_rate` as float64) as value),
    struct('fixed_setting_match_to_total_rate' as metric_id, cast(`fixed_setting_match_to_total_rate` as float64) as value),
    struct('g_time_progress_match_to_total_rate' as metric_id, cast(`g_time_progress_match_to_total_rate` as float64) as value),
    struct('g_time_setting_match_to_total_rate' as metric_id, cast(`g_time_setting_match_to_total_rate` as float64) as value),
    struct('h_time_progress_match_to_total_rate' as metric_id, cast(`h_time_progress_match_to_total_rate` as float64) as value),
    struct('h_time_setting_match_to_total_rate' as metric_id, cast(`h_time_setting_match_to_total_rate` as float64) as value),
    struct('i_time_progress_match_to_total_rate' as metric_id, cast(`i_time_progress_match_to_total_rate` as float64) as value),
    struct('i_time_setting_match_to_total_rate' as metric_id, cast(`i_time_setting_match_to_total_rate` as float64) as value),
    struct('j_time_progress_match_to_total_rate' as metric_id, cast(`j_time_progress_match_to_total_rate` as float64) as value),
    struct('j_time_setting_match_to_total_rate' as metric_id, cast(`j_time_setting_match_to_total_rate` as float64) as value),
    struct('manager_benefit_cost' as metric_id, cast(`manager_benefit_cost` as float64) as value),
    struct('manager_cancel_reward_cost' as metric_id, cast(`manager_cancel_reward_cost` as float64) as value),
    struct('manager_cost' as metric_id, cast(`manager_cost` as float64) as value),
    struct('manager_cost_per_progress_match_cnt' as metric_id, cast(`manager_cost_per_progress_match_cnt` as float64) as value),
    struct('manager_cost_to_sales_rate' as metric_id, cast(`manager_cost_to_sales_rate` as float64) as value),
    struct('manager_fixed_progress_cost' as metric_id, cast(`manager_fixed_progress_cost` as float64) as value),
    struct('manager_incentive_cost' as metric_id, cast(`manager_incentive_cost` as float64) as value),
    struct('manager_match_cnt' as metric_id, cast(`manager_match_cnt` as float64) as value),
    struct('manager_match_open_rate' as metric_id, cast(`manager_match_open_rate` as float64) as value),
    struct('manager_precipitation_compensation_cost' as metric_id, cast(`manager_precipitation_compensation_cost` as float64) as value),
    struct('manager_promotion_cost' as metric_id, cast(`manager_promotion_cost` as float64) as value),
    struct('match_loss_rate' as metric_id, cast(`match_loss_rate` as float64) as value),
    struct('match_open_rate' as metric_id, cast(`match_open_rate` as float64) as value),
    struct('matching_rate' as metric_id, cast(`matching_rate` as float64) as value),
    struct('new_enter_user_cnt' as metric_id, cast(`new_enter_user_cnt` as float64) as value),
    struct('new_user_cnt' as metric_id, cast(`new_user_cnt` as float64) as value),
    struct('not_cash_enter_cost_rate' as metric_id, cast(`not_cash_enter_cost_rate` as float64) as value),
    struct('over_6p_cancel_match_rate' as metric_id, cast(`over_6p_cancel_match_rate` as float64) as value),
    struct('pick_match_cnt_per_active_manager' as metric_id, cast(`pick_match_cnt_per_active_manager` as float64) as value),
    struct('plaber_match_cnt' as metric_id, cast(`plaber_match_cnt` as float64) as value),
    struct('plaber_match_open_rate' as metric_id, cast(`plaber_match_open_rate` as float64) as value),
    struct('point_reward_cost_to_sales_rate' as metric_id, cast(`point_reward_cost_to_sales_rate` as float64) as value),
    struct('precipitation_forecast_match_rate' as metric_id, cast(`precipitation_forecast_match_rate` as float64) as value),
    struct('progress_match_cnt' as metric_id, cast(`progress_match_cnt` as float64) as value),
    struct('progress_match_rate' as metric_id, cast(`progress_match_rate` as float64) as value),
    struct('reward_cost_to_sales_rate' as metric_id, cast(`reward_cost_to_sales_rate` as float64) as value),
    struct('sales' as metric_id, cast(`sales` as float64) as value),
    struct('sales_per_enter_cnt' as metric_id, cast(`sales_per_enter_cnt` as float64) as value),
    struct('setting_match_cnt' as metric_id, cast(`setting_match_cnt` as float64) as value),
    struct('setting_match_cnt_per_active_stadium' as metric_id, cast(`setting_match_cnt_per_active_stadium` as float64) as value),
    struct('stadium_fee' as metric_id, cast(`stadium_fee` as float64) as value),
    struct('stadium_fee_per_progress_match_cnt' as metric_id, cast(`stadium_fee_per_progress_match_cnt` as float64) as value),
    struct('stadium_fee_to_sales_rate' as metric_id, cast(`stadium_fee_to_sales_rate` as float64) as value),
    struct('total_match_cnt' as metric_id, cast(`total_match_cnt` as float64) as value),
    struct('under_6p_cancel_match_rate' as metric_id, cast(`under_6p_cancel_match_rate` as float64) as value),
    struct('user_self_cancel_rate' as metric_id, cast(`user_self_cancel_rate` as float64) as value),
    struct('variable_cost' as metric_id, cast(`variable_cost` as float64) as value)
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
  select week, week_start_date, 'area_group_and_time' as measure_unit, concat(area_group, ' | ', time) as filter_value, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'area_group_and_time' and area_group is not null and time is not null

  union all

  select week, week_start_date, 'area_and_time', concat(area, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'area_and_time' and area is not null and time is not null

  union all

  select week, week_start_date, 'stadium_group_and_time', concat(stadium_group, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'stadium_group_and_time' and stadium_group is not null and time is not null

  union all

  select week, week_start_date, 'stadium_and_time', concat(stadium, ' | ', time), area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'stadium_and_time' and stadium is not null and time is not null

  union all

  select week, week_start_date, 'time', time, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'time' and time is not null

  union all

  select week, week_start_date, 'hour', hour, area_group, area, stadium_group, stadium, time, hour, metric_id, value
  from base
  where dimension_type = 'hour' and hour is not null
)
select
  week,
  week_start_date,
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
group by week, week_start_date, measure_unit, filter_value, area_group, area, stadium_group, stadium, time, hour, metric_id;