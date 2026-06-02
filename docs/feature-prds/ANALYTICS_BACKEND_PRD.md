# 분석 백엔드 PRD

## 목적
분석 조회가 provider 계층을 통해 어떻게 라우팅되는지, 그리고 언제 serving table 경로와 source query 경로를 쓰는지 정의합니다.

## 구현 진입점
- `app/lib/dataQueries.ts`
- `app/lib/analytics/provider.ts`
- `app/lib/analytics/bigqueryProvider.ts`
- `app/lib/analytics/bigqueryShared.ts`
- `app/lib/analytics/bigqueryClient.ts`

## 제품 규칙
- 분석 source of truth는 BigQuery입니다.
- source table은 read-only입니다.
- 신규 또는 재생성되는 분석 객체는 `kevin_serving`에 둡니다.
- provider 변경이 있더라도 UI가 의존하는 API 응답 shape는 유지해야 합니다.

## 현재 조회 전략
### serving table 경로
- 주 단위 legacy/expanded 측정단위에서 serving table에 필요한 데이터가 있는 경우 우선 사용합니다.
- 주요 serving 객체:
  - `kevin_serving.weeks_view`
  - `kevin_serving.entity_hierarchy`
  - `kevin_serving.weekly_agg`
  - `kevin_serving.weekly_expanded_agg`

### source query 경로
- 아래 경우에는 source query 경로를 사용합니다.
  - `periodUnit`이 `week`가 아님
  - serving table이 다루지 못하는 기간 필터가 포함됨
  - source-only filter unit이 포함됨
  - 현재 측정단위나 부모 컨텍스트가 serving 경로를 지원하지 않음

## 백엔드 책임
- 지원 지표 ID 목록 계산
- 지표 사전 구성
- 측정단위와 라벨 계산
- 사용 가능한 필터 축과 필터 옵션 계산
- 실제 데이터 존재 여부 기준 드릴다운 후보 계산
- UI 호환 heatmap row shape 생성

## 데이터 규칙
- count 성격 지표는 `MAX(value)` 사용
- rate 성격 지표는 `AVG(value)` 사용
- Kevin 수치 지표 후보는 `metric_store_native`와 source table에 함께 존재하는 컬럼 중 숫자형 source column만 포함합니다.
- `metric_store_native`에 있더라도 문자열 차원 컬럼은 수치 지표로 승격하지 않습니다.
- BigQuery SQL에서 metric identifier는 안전하게 escape해야 함
- 명시적으로 허용하지 않는 한 미래 또는 미완료 기간은 기본 조회에서 제외해야 함

## 운영 의존성
- `BIGQUERY_SERVICE_ACCOUNT_JSON`
- `BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64`
- `BIGQUERY_ACCESS_TOKEN`
- 로컬 `gcloud auth` fallback

## 운영 기준
- source BigQuery 테이블 갱신 기준 시각은 매일 07:50 KST 전후입니다.
- serving rebuild 기본 기준 시각은 매일 09:00 KST 전후입니다. (cron 22:00 UTC + GitHub Actions ~2h 지연)
- source 반영이 지연된 날에는 serving rebuild에 늦은 데이터가 포함되지 않을 수 있으며, 다음 스케줄에서 따라잡는 것을 허용합니다.
- Vercel 배포 환경에서는 service account JSON 계열 env 사용을 우선합니다.

## 권장 자동화 구조
- source scheduler 완료 직후 numeric metric candidate와 source 최신 주차를 먼저 검증합니다.
- 그 다음 serving rebuild를 실행합니다.
- rebuild 직후 `bq:validate-serving`으로 latest week row와 metric sync를 함께 검증합니다.
- 검증 실패 시 Kevin 운영 반영으로 간주하지 않고 알림을 보내며, 마지막 성공 상태를 추적할 수 있어야 합니다.

### 권장 일일 순서
1. source freshness check
2. numeric metric candidate sync check
3. `bq:build-serving`
4. `bq:validate-serving`
5. 성공/실패 알림 및 로그 적재

## 검증 항목
- `npm run build`
- serving layer 동작 변경 시 `npm run bq:validate-serving`
- `bq:validate-serving`은 최신 주차 샘플 row뿐 아니라 numeric metric candidate와 serving metric set의 동기화도 검증해야 합니다.
- representative unit 기준으로 source-only filter 동작과 weekly serving 동작 비교

## 알려진 리스크
- source query 경로와 serving query 경로 중 하나만 수정하면 동작 차이가 벌어질 수 있습니다.
- 주 외 기간단위 동작은 source query 정확성에 크게 의존합니다.
- 일부 참고 문서는 인코딩 문제 또는 내용 노후화로 별도 정리가 필요합니다.

## GitHub Actions 워크플로우 현황
| 워크플로우 | 파일 | 스케줄 | 상태 | 비고 |
|---|---|---|---|---|
| BigQuery Serving Rebuild | `bigquery-serving-rebuild.yml` | 매일 `0 22 * * *` (실제 ~09:00 KST) | ✅ 활성 | Slack 알림 포함 |
| Weekly MV Rebuild | `weekly-mv-rebuild.yml` | 스케줄 트리거 비활성화 | ⏸ 비활성 | BigQuery 전환 후 실효성 없음. 재활성화 시 Supabase 시크릿 3개 등록 필요 |
| Data Validation | `data-validation.yml` | PR 트리거 비활성화 | ⏸ 비활성 | BigQuery 전환 후 실효성 없음. 재활성화 시 Supabase 시크릿 등록 필요 |

## 변경 이력
- 2026-04-01: provider 분리와 BigQuery serving 전환
- 2026-04-16: serving coverage가 없는 신규 측정단위를 source query로 라우팅
- 2026-05-19: source-only filter를 명시적으로 source query 경로로 라우팅
- 2026-05-28: metric dictionary 내 문자열 차원 컬럼을 수치 지표 후보에서 제외하고, serving metric sync 검증 기준 보강
- 2026-06-02: serving rebuild cron `30 23 * * *` → `0 22 * * *` (GitHub Actions 실제 지연 반영, 실행 ~09:00 KST)
- 2026-06-02: Data Validation 워크플로우 PR 트리거 비활성화 (Supabase MV 검증 실효성 없음, 시크릿 미등록)
- 2026-06-02: Weekly MV Rebuild 워크플로우 스케줄 트리거 비활성화 (BigQuery 전환 후 실효성 없음, GitHub Actions 시크릿 미등록으로 첫 실행부터 9회 전부 실패)
