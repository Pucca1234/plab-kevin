# PLAB Kevin

> Draft document. Do not replace `README.md` yet.

## 1. 문서 목적
- 이 문서는 새로 들어온 개발자나 AI가 프로젝트를 빠르게 이해하고 바로 작업을 시작할 수 있도록 돕는 온보딩/운영 안내서다.
- 구현 규칙과 제품 정책의 기준은 `PRD_RESTRUCTURED_DRAFT.md`를 따른다.
- 날짜별 변경 이력은 `CHANGELOG_DRAFT.md`를 따른다.

## 2. 작성 규칙
### 2.1 문서 역할
- 이 문서는 “프로젝트를 이해하고 실행하는 데 필요한 정보”에 집중한다.
- 기능 세부 명세나 정책을 장문으로 중복 서술하지 않는다.

### 2.2 포함할 내용
- 프로젝트 개요
- 현재 아키텍처
- 실행 방법
- 운영 자동화
- 주요 파일 지도
- 작업 시작 시 알아야 할 원칙

### 2.3 포함하지 않을 내용
- 기능별 세부 상태 전이
- API 응답 계약의 상세 규칙
- 날짜별 상세 변경 이력

### 2.4 업데이트 원칙
- 작업 시작자가 혼란을 느낄 수 있는 구조/실행/운영 정보가 바뀌면 먼저 갱신한다.
- 정책 변경 자체는 PRD를 먼저 갱신하고, README는 요약만 반영한다.

## 3. 프로젝트 소개
- `plab-kevin`은 플랩풋볼 운영/매칭 데이터를 `BigQuery` 기반으로 조회하고 비교하는 내부 분석 대시보드다.

## 4. 현재 시스템 개요
- 분석 source of truth: `BigQuery`
- 앱 운영 데이터 저장소: `Supabase`
- frontend: `Next.js 14`, `React`, `TypeScript`
- production URL: `https://plab-kevin.vercel.app`
- GitHub repo: `Pucca1234/plab-kevin`

## 5. 데이터 구조 한눈에 보기
### 5.1 Source
- `plabfootball-51bf5.data_mart.data_mart_1_social_match`
- `plabfootball-51bf5.googlesheets.metric_store_native`

### 5.2 Serving layer
- dataset: `plabfootball-51bf5.kevin_serving`
- objects:
  - `weeks_view`
  - `entity_hierarchy`
  - `weekly_agg`
  - `weekly_expanded_agg`

### 5.3 역할 분리
- BigQuery:
  - 분석 조회
  - 필터 옵션 계산
  - 기간/드릴다운 조회
- Supabase:
  - 인증
  - 템플릿 저장
  - 사용자 설정 등 운영 데이터

## 6. 핵심 사용자 경험 요약
- 기간단위: `연/분기/월/주/일`
- 측정단위: `지역그룹`, `지역`, `구장`, `면` 및 source 기반 확장 단위
- 핵심 기능:
  - 동적 기간 필터
  - 동적 엔티티 필터
  - 엔티티 드릴다운
  - 기간 드릴다운
  - 히트맵
  - 추이
  - 증감
  - 정렬
  - 템플릿
  - 데이터 내보내기
  - Kevin AI

## 7. 빠른 실행
### 7.1 필수 환경변수
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `ANALYTICS_BACKEND=bigquery`
- `BIGQUERY_PROJECT_ID`
- `BIGQUERY_LOCATION`
- `BIGQUERY_DATASET_SOURCE_DATA_MART`
- `BIGQUERY_DATASET_SOURCE_GOOGLESHEETS`
- `BIGQUERY_DATASET_SERVING`

### 7.2 개발 실행
```bash
npm install
npm run dev
```

### 7.3 기본 검증
```bash
npm run build
git diff --check
```

## 8. 운영 자동화
### 8.1 BigQuery serving rebuild
- workflow: `.github/workflows/bigquery-serving-rebuild.yml`
- schedule: 매일 `08:30 KST`
- commands:
  - `npm run bq:build-serving`
  - `npm run bq:validate-serving`

### 8.2 데이터 검증
- local:
  - `npm run data:validate-mv`
  - `npm run data:validate-recent-refresh`
- GitHub Actions:
  - `.github/workflows/data-validation.yml`

## 9. 주요 코드 지도
- [app/page.tsx](/C:/Users/actio/Desktop/projects/plab-kevin/app/page.tsx): 대시보드 상태, 필터, 조회, 드릴다운 orchestration
- [app/components/EntityMetricTable.tsx](/C:/Users/actio/Desktop/projects/plab-kevin/app/components/EntityMetricTable.tsx): 엔티티 결과 테이블, 엔티티 드릴다운, 기간 정렬
- [app/components/MetricTable.tsx](/C:/Users/actio/Desktop/projects/plab-kevin/app/components/MetricTable.tsx): 전체 결과 테이블
- [app/components/MultiSelectDropdown.tsx](/C:/Users/actio/Desktop/projects/plab-kevin/app/components/MultiSelectDropdown.tsx): 다중 선택 필터 공통 UI
- [app/lib/analytics/bigqueryProvider.ts](/C:/Users/actio/Desktop/projects/plab-kevin/app/lib/analytics/bigqueryProvider.ts): BigQuery provider
- [app/lib/analytics/bigqueryShared.ts](/C:/Users/actio/Desktop/projects/plab-kevin/app/lib/analytics/bigqueryShared.ts): 측정단위/필터/라벨 매핑
- [scripts/bigquery/build-serving-layer.mjs](/C:/Users/actio/Desktop/projects/plab-kevin/scripts/bigquery/build-serving-layer.mjs): serving rebuild
- [scripts/bigquery/validate-serving-layer.mjs](/C:/Users/actio/Desktop/projects/plab-kevin/scripts/bigquery/validate-serving-layer.mjs): serving validation

## 10. 작업 시작 전에 알아야 할 원칙
- 분석 source of truth는 `BigQuery`다.
- source BigQuery 테이블은 read-only다.
- 신규/재생성 객체는 `kevin_serving`에만 만든다.
- `.env.local`은 로컬 전용이며 커밋하지 않는다.
- 기능 정책은 `PRD_RESTRUCTURED_DRAFT.md`를 기준으로 본다.
- 날짜별 이력은 `CHANGELOG_DRAFT.md`에 쌓는다.

## 11. 이 문서에 없는 내용
- 필터/드릴다운/미완료 기간 처리의 상세 로직
- API 계약의 세부 shape
- 날짜별 버그 수정 이력

이 내용은 아래 문서에서 본다.
- 기능/정책 기준: [PRD_RESTRUCTURED_DRAFT.md](/C:/Users/actio/Desktop/projects/plab-kevin/PRD_RESTRUCTURED_DRAFT.md)
- 변경 이력: [CHANGELOG_DRAFT.md](/C:/Users/actio/Desktop/projects/plab-kevin/CHANGELOG_DRAFT.md)

## 12. 관련 문서
- 현재 운영 문서: [README.md](/C:/Users/actio/Desktop/projects/plab-kevin/README.md), [PRD.md](/C:/Users/actio/Desktop/projects/plab-kevin/PRD.md)
- API 계약 참고: [ANALYTICS_API_CONTRACT.md](/C:/Users/actio/Desktop/projects/plab-kevin/ANALYTICS_API_CONTRACT.md)
- BigQuery 전환 참고: [BIGQUERY_MIGRATION_PLAN.md](/C:/Users/actio/Desktop/projects/plab-kevin/BIGQUERY_MIGRATION_PLAN.md)
- provider 구조 참고: [ANALYTICS_PROVIDER_INTERFACE.md](/C:/Users/actio/Desktop/projects/plab-kevin/ANALYTICS_PROVIDER_INTERFACE.md)

## 13. Next To-Do
- 작업 시작용 체크리스트를 추가해 새 개발자/AI의 첫 30분 행동을 표준화
- 환경변수 섹션에 로컬 인증 방식(`service account`, `access token`, `gcloud`) 차이를 짧게 정리
- 주요 API와 주요 UI 컴포넌트의 연결 관계를 한 장 요약으로 추가
- `/prototypes` 라우트의 목적과 롤백 기준을 운영 문서 관점에서 한 줄로 정리
