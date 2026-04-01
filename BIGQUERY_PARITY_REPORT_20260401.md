# BigQuery Parity Report (2026-04-01)

## 범위
- Baseline: `https://social-match-dashboard-mvp.vercel.app`
- Candidate: `https://plab-kevin.vercel.app`
- 비교 스크립트: `npm run data:compare-apis`

## 현재 결론
- `plab-kevin`은 BigQuery 원천을 기준으로 동작하도록 전환 중이다.
- 기존 `social-match-dashboard-mvp`와의 차이 중 상당수는 candidate 오류보다 기존 Supabase MV stale 문제로 해석된다.
- `kevin_serving` serving layer를 BigQuery 내에 다시 만들었고, 현재 핵심 analytics read path는 이 serving layer를 보도록 옮겼다.

## 확인된 사실
### 1. Source-of-truth
- BigQuery source table
  - `plabfootball-51bf5.data_mart.data_mart_1_social_match`
  - `plabfootball-51bf5.googlesheets.metric_store_native`
- Serving dataset
  - `plabfootball-51bf5.kevin_serving`

### 2. Serving objects
- `weeks_view`: VIEW
- `entity_hierarchy`: BASE TABLE
- `weekly_agg`: BASE TABLE
- `weekly_expanded_agg`: BASE TABLE

### 3. 직접 검증한 값
- `weekly_agg`
  - latest visible week `26.03.30 - 04.05`
  - `all.manager_match_cnt = 3760`
  - BigQuery source 집계와 일치
- `weekly_agg`
  - `area_group.manager_match_cnt` latest top values
  - `경기 = 1360`
  - `서울 = 738`
  - `대구/경산 = 339`
  - `인천 = 324`
  - `대전 = 187`
- `weekly_expanded_agg`
  - `time.manager_match_cnt` latest values 정상 조회 확인

## 기존 앱과의 차이 해석
### 1. metrics
- candidate는 BigQuery `metric_store_native` 최신값을 직접 읽는다.
- baseline은 Supabase 복제본 상태에 영향을 받는다.
- 따라서 일부 metric 차이는 candidate 문제가 아니라 baseline freshness 문제일 가능성이 높다.

### 2. heatmap
- 예시: latest visible week `26.03.30 - 04.05`
  - baseline `all.manager_match_cnt = 3415`
  - candidate `all.manager_match_cnt = 3760`
  - BigQuery source 확인값도 `3760`
- 해석:
  - candidate가 BigQuery truth에 맞고
  - baseline MV가 stale했을 가능성이 높다.

### 3. drilldown
- 예시:
  - `area_group = 대전`
  - `area = 동구`
  - week `26.02.09 - 02.15`
- candidate 값은 BigQuery source row와 일치하는 방향이었다.
- baseline은 같은 조합에서 과대 집계로 보이는 차이가 있었다.

## 이번 작업에서 반영한 것
1. BigQuery serving layer 생성 스크립트 추가
2. Windows `bq` CLI 인코딩 문제를 우회하도록 REST 기반 실행으로 변경
3. `weekly_agg` / `weekly_expanded_agg`를 precomputed BASE TABLE로 생성
4. `bigqueryProvider`가 serving layer를 우선 읽도록 전환
5. metric metadata 조회는 serving layer 기준 캐시 추가

## 성능 메모
- 초기 raw/source 중심 경로에서는 heatmap 응답이 10초 이상까지 늘어났다.
- serving table + metadata cache 적용 후 동일 heatmap 요청이 로컬 기준 약 5~6초 수준까지 내려왔다.
- 아직 더 줄일 여지는 있다.
  - route-level cache
  - narrower metric queries
  - 추가 clustering / predicate tuning

## 남은 작업
1. 최신 branch를 Vercel에 다시 배포해서 실제 `plab-kevin.vercel.app`에 반영
2. 동일 비교 스크립트를 다시 실행
3. remaining diff를 "baseline stale" / "candidate bug"로 최종 분류
4. 운영 전환 판단 문서 갱신
