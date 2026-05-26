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
- BigQuery SQL에서 metric identifier는 안전하게 escape해야 함
- 명시적으로 허용하지 않는 한 미래 또는 미완료 기간은 기본 조회에서 제외해야 함

## 운영 의존성
- `BIGQUERY_SERVICE_ACCOUNT_JSON`
- `BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64`
- `BIGQUERY_ACCESS_TOKEN`
- 로컬 `gcloud auth` fallback

## 검증 항목
- `npm run build`
- serving layer 동작 변경 시 `npm run bq:validate-serving`
- representative unit 기준으로 source-only filter 동작과 weekly serving 동작 비교

## 알려진 리스크
- source query 경로와 serving query 경로 중 하나만 수정하면 동작 차이가 벌어질 수 있습니다.
- 주 외 기간단위 동작은 source query 정확성에 크게 의존합니다.
- 일부 참고 문서는 인코딩 문제 또는 내용 노후화로 별도 정리가 필요합니다.

## 변경 이력
- 2026-04-01: provider 분리와 BigQuery serving 전환
- 2026-04-16: serving coverage가 없는 신규 측정단위를 source query로 라우팅
- 2026-05-19: source-only filter를 명시적으로 source query 경로로 라우팅
