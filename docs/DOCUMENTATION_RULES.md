# 문서 작성 규칙

## 목적
이 저장소는 온보딩 정보, 제품 규칙, 작업 연속성을 분리해서 새 작업자가 긴 이력 로그를 뒤지지 않고도 바로 작업을 시작할 수 있어야 합니다.

## 기준 우선순위
- 현재 동작의 최우선 기준은 코드입니다.
- 제품 규칙은 `docs/MASTER_PRD.md`와 `docs/feature-prds/*`에 기록합니다.
- 실행 방법, 명령어, 환경 변수, 문서 진입점은 루트 `README.md`를 기준으로 봅니다.
- 미완료 작업과 후속 과제는 `docs/todo/*`를 기준으로 관리합니다.

## 문서별 역할
### 루트 `README.md`
- 프로젝트 요약
- 로컬 실행 방법
- 환경 변수
- 운영용 명령어
- 핵심 문서 링크

상세 UX 정책이나 긴 기능 규칙은 여기에 장문으로 넣지 않습니다.

### `docs/MASTER_PRD.md`
- 제품 전체 범위
- 여러 기능에 공통으로 적용되는 규칙
- 공통 용어
- 데이터 및 품질 기준
- 공통 수용 기준

### `docs/feature-prds/*.md`
- 기능 영역별 상세 문서
- 사용자 흐름
- 상태 모델
- 해당 기능이 사용하는 API 계약
- 예외 케이스
- 구현 진입점 파일
- 검증 체크리스트
- 기능별 변경 이력

### 루트 `PRD.md`
- 현재 PRD 진입 문서
- 공통 원칙 요약과 기능별 PRD 링크 제공

### `docs/todo/ACTIVE_TODO.md`
- 다음 작업자가 바로 이어서 처리해야 할 작업
- 현재 진행 중이거나 즉시 처리할 항목
- 방금 끝난 작업에서 파생된 후속 과제

### `docs/todo/BACKLOG_TODO.md`
- 바로 처리하지 않을 작업
- 구조 개선
- 추가 조사 필요 항목

## 커밋 전 필수 갱신 규칙
변경을 커밋하거나 푸시하기 전에는 아래 순서를 따릅니다.
1. 코드를 먼저 수정합니다.
2. 관련 기능 PRD 또는 `MASTER_PRD.md`를 갱신합니다.
3. 실행 방법이나 운영 가이드가 바뀌었으면 `README.md`를 갱신합니다.
4. 후속 작업이 생겼으면 `docs/todo/ACTIVE_TODO.md`에 추가합니다.
5. 바로 하지 않을 작업은 `docs/todo/BACKLOG_TODO.md`로 옮깁니다.

## 데이터 파이프라인 안전성 체크
**데이터에 영향을 줄 수 있는 작업 시 반드시 아래를 점검하고 커밋한다.**

### 영향을 줄 수 있는 변경 유형
아래 중 하나라도 해당하면 데이터 파이프라인 점검이 필요하다:
- `scripts/bigquery/build-serving-layer.mjs` 수정
- `scripts/bigquery/validate-serving-layer.mjs` 수정
- `googlesheets.metric_store_native` 시트 구조 변경
- `data_mart.data_mart_1_social_match` 스키마에 영향을 주는 변경
- serving layer 빌드 쿼리(SQL) 수정
- `metricColumnBlacklist` 또는 `NUMERIC_DATA_TYPES` 등 metric 필터 로직 수정
- BigQuery 인증/클라이언트(`bigqueryClient.ts`) 변경
- `.github/workflows/bigquery-serving-rebuild.yml` 수정

### 점검 체크리스트
1. **SQL ↔ JS 정합성**: SQL에서 SELECT한 컬럼과 JS 코드가 참조하는 필드가 일치하는지 확인
   - 특히 CTE에 컬럼을 추가할 때 최종 SELECT절에도 반드시 포함할 것
2. **로컬 빌드 테스트**: `npm run bq:build-serving` 직접 실행해 에러 없이 완료되는지 확인
3. **검증 스크립트**: `npm run bq:validate-serving` 실행해 지표 커버리지 이상 없는지 확인
4. **워크플로우 수동 실행**: GitHub Actions → BigQuery Serving Rebuild → Run workflow로 실제 파이프라인 검증

### 실제 사례 (2026-05-31)
> `build-serving-layer.mjs`에 `NUMERIC_DATA_TYPES` 필터를 JS에 추가하면서
> SQL CTE에는 `data_type` 컬럼을 추가했으나 최종 `SELECT`절에서 누락.
> 결과: `row.data_type = undefined` → 모든 metrics 필터아웃 → 빌드 실패.
> GitHub Actions daily build 4일간 연속 실패, `weekly_agg`가 5/28 상태로 고정됨.
> **교훈: SQL 쿼리 수정 시 JS 코드가 읽는 컬럼이 SELECT에 포함되어 있는지 반드시 검토.**

## TODO 작성 규칙
모든 TODO 항목은 아래 정보를 포함합니다.
- ID: 예시 `DOC-001`, `FILTER-003`
- 상태: `todo`, `in_progress`, `blocked`, `done`
- 발생 출처
- 왜 중요한지
- 다음 액션
- 참고 파일 또는 문서

## 문체 규칙
- 채팅 로그처럼 쓰지 말고 규칙 문장으로 씁니다.
- 현재 동작과 제안 상태를 구분합니다.
- 코드에서 추론한 규칙이면 그 사실을 명시합니다.
- 코드와 예전 문서가 충돌하면 차이를 기록하고 TODO를 남깁니다.

## 이력 관리 규칙
- 루트 `README.md`에 날짜별 긴 로그를 계속 쌓지 않습니다.
- 기능별 변경 이력은 해당 기능 PRD 안에 둡니다.
- 저장소 차원의 후속 작업은 `docs/todo/*`에 둡니다.
- 별도 changelog를 도입하더라도 같은 내용을 여러 문서에 반복 복제하지 않습니다.

## 작업 전후 확인 순서
- 작업 시작 전: `docs/README.md`, 관련 기능 PRD, `docs/todo/ACTIVE_TODO.md` 확인
- 작업 종료 후: 수정한 기능 PRD와 TODO 문서 갱신
