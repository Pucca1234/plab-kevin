# BigQuery Migration Phase 0 Discovery

## 1. 현재 결론
- 현재 프로젝트에서 교체 대상은 "분석 데이터 조회 경로"다.
- 현재 프로젝트에서 유지 대상은 "인증/사용자 저장 기능"이다.
- 따라서 새 프로젝트는 UI를 새로 만드는 프로젝트가 아니라, 현재 앱을 기반으로 analytics backend만 교체하는 프로젝트로 보는 것이 맞다.

## 2. 현재 시스템 경계
### 2.1 Supabase에 남길 기능
- Google OAuth 로그인
- 세션 유지 및 서버 측 사용자 조회
- 템플릿 저장/수정/삭제
- 사용자별 기본 템플릿 지정
- 공유 템플릿 조회

### 2.2 BigQuery로 옮길 기능
- 최근 주차 목록 조회
- 지표 목록/지표 메타 조회
- 측정단위 목록 조회
- 필터 옵션 조회
- Heatmap 집계 조회
- Drilldown 가능 단위 판정

### 2.3 제거 또는 축소 대상
- Airbyte를 통한 분석 데이터 복제
- Supabase `bigquery` schema의 raw source 보관
- GitHub Actions 기반 weekly MV rebuild 운영 의존도

## 3. 현재 Supabase 유지 테이블
### 3.1 인증
- `auth.users`
- Supabase Auth 세션/쿠키

### 3.2 템플릿 저장
- `public.filter_templates`

### 3.3 filter_templates 스키마
- 출처: `supabase/migrations/202603050001_create_filter_templates.sql`
- 컬럼:
  - `id uuid primary key`
  - `user_id uuid not null references auth.users(id)`
  - `name text not null`
  - `config jsonb not null`
  - `is_default boolean not null default false`
  - `is_shared boolean not null default false`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- 정책:
  - 본인 템플릿 CRUD
  - 공유 템플릿 read
  - 사용자당 기본 템플릿 1개 unique index 보장

## 4. 현재 템플릿 config shape
- 출처: `app/types.ts`

```ts
type FilterTemplateConfig = {
  periodRangeValue: string;
  measurementUnit: string;
  filterValue: string;
  selectedMetricIds: string[];
};
```

## 5. 현재 분석 API 계약
### 5.1 `GET /api/weeks`
- 용도:
  - 최근 8/12/24주 또는 전체 주차 목록 조회
- 쿼리:
  - `n`: number, optional, max 520
  - `range=latest`: optional
  - `includeStartDate=1|true`: optional
- 응답:
  - 기본: `{ weeks: string[] }`
  - `includeStartDate`: `{ weeks: { week: string; startDate: string | null }[] }`
- 규칙:
  - 최신 주차 누락이 없어야 함
  - 현재는 `measure_unit='all'`, `filter_value='전체'`, `metric_id='total_match_cnt'` 기준 1주 1행으로 수집

### 5.2 `GET /api/metrics`
- 용도:
  - 지원 지표 목록, 지표명, 설명, 쿼리, 카테고리 반환
- 응답:
  - `{ metrics: Metric[] }`
- 현재 지원 기준:
  - `metric_store_native.metric`와 source metric column 교집합

### 5.3 `GET /api/measurement-units`
- 용도:
  - 현재 UI에 노출 가능한 측정단위 목록 조회
- 응답:
  - `{ units: { value: string; label: string }[] }`
- 특징:
  - 일부 retired 단위는 목록에서 제외

### 5.4 `GET /api/filter-options`
- 용도:
  - 선택된 측정단위/부모 컨텍스트/주차 범위 기준 entity 옵션 조회
- 쿼리:
  - `measureUnit`: required
  - `parentUnit`: optional
  - `parentValue`: optional
  - `week`: optional, repeated
- 응답:
  - `{ options: string[] }`

### 5.5 `GET /api/drilldown-options`
- 용도:
  - 현재 entity에서 실제 데이터가 있는 다음 drilldown 단위만 조회
- 쿼리:
  - `sourceUnit`: required
  - `sourceValue`: required
  - `candidate`: repeated
  - `week`: optional, repeated
- 응답:
  - `{ options: { value: string; label: string }[] }`

### 5.6 `POST /api/heatmap`
- 용도:
  - 선택한 주차/측정단위/필터/지표 기준 heatmap row 반환
- body:

```json
{
  "measureUnit": "area_group",
  "weeks": ["26.03.09 - 03.15", "26.03.16 - 03.22"],
  "metrics": ["total_match_cnt", "manager_match_cnt"],
  "filterValue": null,
  "primaryMetricId": "total_match_cnt",
  "parentUnit": null,
  "parentValue": null
}
```

- 응답:

```json
{
  "rows": [
    {
      "entity": "경기",
      "week": "26.03.09 - 03.15",
      "metrics": {
        "total_match_cnt": 123,
        "manager_match_cnt": 80
      }
    }
  ]
}
```

## 6. 현재 앱이 기대하는 분석 데이터 의미
### 6.1 legacy 단위
- `all`
- `area_group`
- `area`
- `stadium_group`
- `stadium`

### 6.2 expanded 단위
- `area_group_and_time`
- `area_and_time`
- `stadium_group_and_time`
- `stadium_and_time`
- `time`
- `hour`

### 6.3 retired 단위
- `yoil_and_hour`
- `yoil_group_and_hour`
- 새 프로젝트에서는 기본적으로 제외하는 방향이 맞다.

## 7. BigQuery serving layer 초안
### 7.1 dataset
- 후보: `kevin_serving`

### 7.2 객체
- `kevin_serving.weeks_view`
  - 컬럼:
    - `week string`
    - `week_start_date date`

- `kevin_serving.entity_hierarchy`
  - 컬럼:
    - `area_group string`
    - `area string`
    - `stadium_group string`
    - `stadium string`

- `kevin_serving.weekly_agg`
  - 대상:
    - `all`, `area_group`, `area`, `stadium_group`, `stadium`
  - 컬럼:
    - `week string`
    - `measure_unit string`
    - `filter_value string`
    - `metric_id string`
    - `value float64`

- `kevin_serving.weekly_expanded_agg`
  - 대상:
    - `area_group_and_time`
    - `area_and_time`
    - `stadium_group_and_time`
    - `stadium_and_time`
    - `time`
    - `hour`
  - 컬럼:
    - `week string`
    - `measure_unit string`
    - `filter_value string`
    - `area_group string`
    - `area string`
    - `stadium_group string`
    - `stadium string`
    - `time string`
    - `hour string`
    - `metric_id string`
    - `value float64`

## 8. BigQuery 설계 원칙
- raw source table 직접 조회는 fallback 또는 검증 용도로만 사용
- 서빙 레이어는 API 응답 shape를 바로 만들 수 있는 수준으로 전처리
- 최근 주차 위주 조회가 많으므로 주차 기준 partition/cluster 전략 검토
- 비용 제어를 위해 아래 중 하나를 우선 검토
  - scheduled query 결과 테이블
  - materialized view
  - incremental table rebuild

## 9. 새 프로젝트에서 필요한 환경변수 초안
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `BIGQUERY_PROJECT_ID`
- `BIGQUERY_DATASET_SOURCE`
- `BIGQUERY_DATASET_SERVING`
- `GOOGLE_APPLICATION_CREDENTIALS` 또는 서버 런타임용 service account secret

## 10. 현재 확인된 운영 사실
- `Weekly MV Rebuild` 스케줄:
  - 화요일 10:00 KST
- 최근 실제 source 적재 시각:
  - `2026-03-31 09:14:06 KST`
- 의미:
  - 현재 구조는 source 적재 후 약 45분 내 추가 복구 배치가 필요
  - BigQuery 직접 서빙으로 가면 이 배치 의존을 제거할 수 있다

## 11. Phase 0 종료 조건
- Supabase에 남길 기능/테이블 목록 확정
- 교체 대상 API 계약 확정
- BigQuery serving layer 대상 객체 확정
- 새 프로젝트의 최소 범위 정의 완료

## 12. Phase 1 바로 다음 작업
1. `weekly_agg` BigQuery SQL 초안 작성
2. `weekly_expanded_agg` BigQuery SQL 초안 작성
3. `entity_hierarchy` BigQuery SQL 초안 작성
4. `dataQueries.ts` 기준 provider interface 도출
5. 새 프로젝트 생성 방식 결정
   - repo clone
   - directory copy
   - mono-repo 내 sibling app
