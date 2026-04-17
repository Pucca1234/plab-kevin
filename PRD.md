# Kevin MVP - Product Requirements Document

## 1. 문서 목적
본 문서는 Kevin 대시보드의 데이터 모델, API 계약, 집계 정확도 규칙, 운영/검증 프로세스를 정의합니다.

## 2. 제품 개요
- 제품명: Kevin Dashboard (MVP)
- 사용자: 운영팀, 매칭팀, PX팀
- 핵심 시나리오:
  - 최근 8/12/24주 성과 조회
  - 측정단위별(`all`, `area_group`, `area`, `stadium_group`, `stadium`) 드릴다운 분석
  - Heatmap 기반 비교
  - AI 요약 및 질문 응답

### 2.1 2026-04-01 전환 기준
- `plab-kevin`은 기존 `social-match-dashboard-mvp`와 분리된 별도 repo / 별도 Vercel 프로젝트다.
- `plab-kevin`의 분석 source of truth는 Supabase가 아니라 BigQuery다.
- BigQuery source는 read-only로 취급하며, 신규 객체는 `kevin_serving` dataset에만 생성한다.
- 실제 서비스 원천은 플랩풋볼 MySQL이며, BigQuery source 테이블은 예약 쿼리로 매일 07:50 KST 기준 갱신된다.
- 운영 메모:
  - 대부분 07:50 KST 전후 자동 완료
  - 간헐적으로 수동 재실행으로 늦게 반영되는 날이 있음
  - serving rebuild는 매일 08:30 KST 기준 실행하고, 늦은 반영분은 다음날 스케줄에서 따라잡는 것을 기본 정책으로 한다.

### 2.2 2026-04-16 현재 인수인계 메모
- 현재 프로젝트 기준:
  - 로컬 경로: `c:\Users\actio\Desktop\projects\plab-kevin`
  - GitHub repo: `Pucca1234/plab-kevin`
  - Vercel project: `plab-kevin`
  - production URL: `https://plab-kevin.vercel.app`
  - 최신 `main` 기준 커밋: `900a16b fix: render drilldown menu in portal`
  - 다음 작업은 최신 `origin/main`에서 새 브랜치를 생성해 진행한다.
- 새 채팅방에서 우선 파악할 문서:
  - `README.md`: 현재 시스템 상태, BigQuery 운영 기준, 최근 적용 이력
  - `PRD.md`: 제품 요구사항, API 계약, 집계/정확도 규칙, UX 결정사항
  - `AGENTS.md`: 문서 업데이트 및 커밋/푸시/머지 절차 규칙
- 현재 데이터/서빙 기준:
  - 분석 backend 기본값은 `ANALYTICS_BACKEND=bigquery`다.
  - read-only 원천:
    - `plabfootball-51bf5.data_mart.data_mart_1_social_match`
    - `plabfootball-51bf5.googlesheets.metric_store_native`
  - serving dataset:
    - `plabfootball-51bf5.kevin_serving.weeks_view`
    - `plabfootball-51bf5.kevin_serving.entity_hierarchy`
    - `plabfootball-51bf5.kevin_serving.weekly_agg`
    - `plabfootball-51bf5.kevin_serving.weekly_expanded_agg`
- 현재 주요 UX 요구사항:
  - 필터 영역은 지표/기간 필터 row와 측정단위/측정 필터/action row의 2줄 구조를 유지한다.
  - 기간 필터는 연/분기/월/주/일 선택값을 동적으로 노출하며 최신 값 우선 정렬을 유지한다.
  - 측정단위 필터는 source row의 `dimension_type` 기준 실제 값에서 동적으로 계산한다.
  - 지표 선택 패널에서 카테고리와 담당자 필터는 서로 연동한다. 카테고리 선택 시 담당자 목록은 해당 카테고리에 존재하는 담당자만 남는다.
  - 결과 테이블은 엔티티명 클릭으로 하위 측정단위 드릴다운 옵션을 노출해야 한다.
  - 드릴다운 메뉴는 테이블 내부 overflow에 갇히면 안 된다. 최신 구현은 `document.body` portal과 `position: fixed` 좌표를 사용해 짧은 결과 테이블의 하단 스크롤바 위에서도 메뉴가 잘리지 않도록 한다.
  - empty-state 영역은 `main-panel` 폭을 따라 100%로 보이고 좌측으로 쏠려 보이면 안 된다.
- 현재 주요 코드 소유 영역:
  - `app/page.tsx`: dashboard state, filter/template/drilldown orchestration
  - `app/components/EntityMetricTable.tsx`: 결과 테이블, 엔티티 드릴다운 메뉴, period sort, heatmap, resize
  - `app/components/MultiSelectDropdown.tsx`: dropdown 공통 UI
  - `app/lib/analytics/bigqueryProvider.ts`: BigQuery provider 및 query generation
  - `app/lib/analytics/bigqueryShared.ts`: 측정단위/필터/metric mapping
  - `app/lib/analytics/bigqueryClient.ts`: BigQuery 인증 및 client 생성
  - 주요 API: `/api/heatmap`, `/api/filter-options`, `/api/filter-options-batch`, `/api/filter-units`, `/api/period-filter-units`, `/api/drilldown-options`, `/api/measurement-units`, `/api/metrics`, `/api/weeks`, `/api/raw-data`
- 최근 적용된 버그 수정:
  - 신규 동기화 측정단위가 serving table에 없을 때 source query 경로로 조회한다.
  - `6p_cancel_match_rate` 등 숫자로 시작하는 metric identifier는 BigQuery SQL에서 backtick escape한다.
  - header/search/table spacing, `main-panel` width, empty-state width를 정리했다.
  - 드릴다운 메뉴가 표 뒤로 숨거나 스크롤바에 가려지는 문제를 portal 기반 렌더링으로 해결했다.
- 다음 작업 시 검증 기준:
  - `npm run build`가 통과해야 한다.
  - `git diff --check`로 whitespace conflict marker를 확인한다.
  - UI 변경은 가능한 경우 실제 브라우저에서 필터 선택, 조회, 엔티티 드릴다운 클릭까지 확인한다.
  - 커밋/푸시/머지 요청을 받으면 변경 내용에 맞춰 `README.md`와 `PRD.md`를 먼저 업데이트한다.
- 주의사항:
  - source BigQuery table은 수정하지 않는다. 필요한 신규 객체는 `kevin_serving` dataset에만 둔다.
  - `.env.local`은 로컬 전용이며 커밋하지 않는다.
  - 일부 기존 TSX 한글 문자열은 에디터/콘솔 인코딩에 따라 깨져 보일 수 있으므로, 기능 수정과 무관한 대규모 재인코딩은 하지 않는다.
  - PowerShell에서는 `&&` 대신 명령을 분리하거나 `;`를 사용한다.

## 3. 데이터 구조
### 3.1 원천 테이블 (Read-only)
- `plabfootball-51bf5.data_mart.data_mart_1_social_match`
- `plabfootball-51bf5.googlesheets.metric_store_native`

### 3.2 보조 뷰
- `bigquery.weeks_view`
  - 주차 기준 정렬/필터의 단일 소스

### 3.3 집계 MV
- `bigquery.weekly_agg_mv`
- 그레인: `(week, measure_unit, filter_value, metric_id)`
- 규칙:
  - `cnt` 계열: `MAX`
  - `rate` 계열: `AVG`

### 3.4 BigQuery serving layer (`plab-kevin`)
- dataset: `plabfootball-51bf5.kevin_serving`
- 객체:
  - `weeks_view` (`VIEW`)
  - `entity_hierarchy` (`BASE TABLE`)
  - `weekly_agg` (`BASE TABLE`)
  - `weekly_expanded_agg` (`BASE TABLE`)
- 생성 스크립트:
  - `scripts/bigquery/build-serving-layer.mjs`
- 검증 스크립트:
  - `scripts/bigquery/validate-serving-layer.mjs`
- 운영 원칙:
  - source BigQuery 테이블은 수정하지 않음
  - serving dataset만 재생성/갱신

## 4. 집계/정확도 규칙
### 4.1 측정 단위
- `all`
- `area_group`
- `area`
- `stadium_group`
- `stadium`
- `area_group_and_time`
- `area_and_time`
- `stadium_group_and_time`
- `stadium_and_time`
- `time`
- `hour`
- `yoil_and_hour`
- `yoil_group_and_hour`

### 4.2 all 정의
- `all`은 원천의 `dimension_type = all(or null)` 기준 집계값으로 생성
- 운영 검증 시 `all total_match_cnt`와 하위 단위 합(검증 쿼리 기준)의 정합성 확인

### 4.3 핵심 품질 기준
- 누락 금지: 단위별 원천 데이터가 있으면 MV에도 반드시 존재
- 오집계 금지: 동일 key(`week/unit/filter/metric`)에서 규칙 위반(MAX/AVG) 금지

## 5. API 계약
- `GET /api/metrics`
- `GET /api/measurement-units`
- `GET /api/weeks?n=...`
- `GET /api/filter-options?measureUnit=...`
- `POST /api/heatmap`
- `POST /api/ai/summary`
- `POST /api/ai/chat`

제약:
- 기존 응답 shape 유지
- 집계 정확도 규칙 우선
- 확장 측정단위는 운영 DB 자원 상황에 따라 MV 대신 원천 조회 경로를 사용할 수 있음

## 6. 성능/캐시 정책
- `/api/weeks`: 강한 캐시
- `/api/metrics`, `/api/heatmap`: TTL 캐시
- MV/인덱스 기반 조회

## 7. 2026-02 고도화 반영
### 7.1 MV 재구성
- 파일: `supabase/migrations/202602210001_weekly_agg_mv_v2.sql`
- 변경 요점:
  - `dimension_type` 기반으로 단위별 행을 명시적으로 생성
  - `stadium_group`, `stadium` 누락 문제 해결

### 7.2 지표 확장
- 고정 6개 지표 -> 동적 지표 지원
- 기준: `metric_store_native.metric` ∩ 원천 테이블 metric 컬럼

### 7.3 조회 방식 개선
- Heatmap 요청은 선택 지표만 조회하도록 변경
- fallback은 `HEATMAP_ALLOW_BASE_FALLBACK=0`이 아닐 때 허용(기본 ON)
- 대용량 단위(`area`, `stadium_group`, `stadium`)는 PostgREST 응답 제한(1000행) 회피를 위해 페이지네이션(`range`)으로 전체 row를 수집
- `GET /api/filter-options`도 동일하게 페이지네이션 적용
- `GET /api/filter-options`는 원천(`data_mart_1_social_match`) 스캔 대신 `weekly_agg_mv`(`metric_id=total_match_cnt`) 기준으로 조회
- `GET /api/filter-options` 응답은 TTL 600초 캐시
- `/api/heatmap` 내부의 지원 지표 ID 조회는 TTL 3600초 캐시

### 7.4 검색/결과 UI 개선
- 상단 브랜딩:
  - 아이콘 제거
  - `KEVIN` 클릭 시 대시보드 초기 URL(`/`)로 이동
- 결과 테이블:
  - 열 너비 리사이즈(마우스 드래그)
  - 페이지 전체 가로 스크롤이 생기지 않도록 레이아웃 경계 조정
    - `.table-scroll`는 내부 가로 스크롤 담당
    - `.main-panel`에 `min-width: 0` 적용
- 지표 선택:
  - 기존 리스트 직접 스크롤 방식 -> 사이드 패널 방식
  - 패널 내 지표 설명 제공
  - 쿼리 박스 대신 `쿼리 복사` 버튼 제공 (`metric_store_native.query`)
  - `선택완료` 버튼은 1개 이상 선택 시에만 활성
  - `선택 초기화` 버튼으로 패널 내 선택 상태 초기화
- 상단 탭 영역:
  - 개인별 저장 검색옵션/결과 진입을 위한 탭 UI PoC 완료
  - 현재 운영 화면에서는 비활성화 상태로 유지, 후속 버전에서 재도입 예정

### 7.7 2026-02-28 UI 개선(v5)
- 검색 영역:
  - 검색 옵션 박스를 상단형 레이아웃으로 재구성
  - 활성 지표 라인에 `지표 선택` 버튼/활성 지표 칩/`전체 해제` 흐름 정렬
  - 활성 지표 칩 클릭 시 즉시 비활성화
- 헤더:
  - 상단 sticky 헤더/검색 바 동작 유지
- 테이블 첫 행 sticky:
  - 스크롤/레이아웃 충돌 이슈로 현재 비활성화
  - 후속 브랜치에서 sticky 설계 재시도 예정

### 7.8 2026-03-08 데이터/UX 개선
- 최근 1~2주 데이터 보강:
  - `weekly_agg_mv` 최신 주차 누락 시, API 레벨에서 원천(`data_mart_1_social_match`) fallback 집계로 보강
  - `all` 단위의 `dimension_type='all'` 미적재 케이스는 `area` 단위 집계를 기반으로 `all` 값을 재구성
  - 주차 누락뿐 아니라 `주차+지표` 누락도 보강 대상으로 처리
- 지표 선택 패널 개선:
  - 상단 검색 입력 추가(지표명/ID/설명 검색)
  - `metric_store_native`의 카테고리2/3 기반 그룹 표시
- 결과 테이블 UX:
  - 우상단(테이블 헤더) `증감 노출` 체크박스 추가
  - 기본 ON, OFF 시 증감 텍스트만 숨김
  - 증감 스파크라인 색상: 검정
  - 추세선: 회색 점선 오버레이 추가

### 7.9 2026-03-08 운영 장애 대응 기록
- 증상:
  - Vercel 배포 후 로그인 시 `/login` 반복 또는 2~3회 시도 후 진입
  - 사용자 체감상 최신 기능 미반영
  - 로그인 완료 후 `social-match-dashboard-mvp-two.vercel.app`로 도메인이 변경됨
- 원인:
  - OAuth Redirect URL이 `-two` 도메인으로 설정되어 있어 콜백이 잘못된 도메인으로 유입
  - middleware가 인증 조회 실패 시 즉시 `/login`으로 리다이렉트하여 루프 가능성 존재
  - 배포 도메인 혼선(`-two` vs canonical)으로 최신 반영 여부 판단이 어려움
- 조치:
  - middleware 안정화:
    - `/api` 경로 matcher 제외
    - `supabase.auth.getUser()` 실패 시 즉시 강제 리다이렉트하지 않도록 완화
  - OAuth canonical 고정:
    - 로그인 요청 redirectTo를 `NEXT_PUBLIC_APP_URL` 기준으로 고정
    - `/auth/callback` 완료 후 리다이렉트를 canonical URL로 고정
    - `/login?code=...` 유입 시 login page에서 코드 교환 처리 추가
  - 배포 식별:
    - 헤더에 `build: <commit>` 표시로 실제 배포 버전 즉시 확인

### 7.10 2026-03-11 UX 개선
- 지표 선택 사이드패널:
  - 카테고리2/3 그룹 간 간격과 구분선을 강화해 스캔 속도 개선
- 결과 테이블 엔티티 인터랙션:
  - 엔티티 컬럼 헤더에 드롭다운 필터 메뉴 제공
  - 필터 아이콘을 정렬형이 아닌 표준 필터(funnel) 아이콘으로 변경
  - 엔티티 값 셀 hover 시 연한 파란색 강조로 드릴다운 가능 상태를 명확히 표시
- 드릴다운 경로/복귀 동작:
  - 경로 표기 형식을 `지역그룹(전체) > 지역(고양시)`로 변경
  - 상위 경로 클릭 시 해당 단계의 전체 결과로 복귀하도록 수정
  - `지역그룹(전체)` 클릭 시 부모 엔티티 필터가 유지되지 않도록 로직 보정
- 레이아웃:
  - 상단 헤더/검색영역 sticky를 해제해 스크롤 시 결과 테이블 가림 현상 제거

### 7.11 2026-03-12 MV 자동복구 운영 이슈
- 배경:
  - Airbyte 주간 overwrite/refresh 방식으로 원천 테이블이 갱신될 때, 분석용 MV/인덱스 종속성이 깨질 수 있음
- 오늘 반영:
  - 주간 자동복구 워크플로(`.github/workflows/weekly-mv-rebuild.yml`) main 반영
  - 재생성 SQL(`supabase/sql/refresh_weekly_agg_mv.sql`) 및 최신 주차 헬스체크 연동
- 오늘 장애/조치:
  - Direct DB 경로는 GitHub Actions IPv4 환경에서 `Network is unreachable`로 실패
  - `SUPABASE_DB_URI` 기반으로 전환 후 재생성 단계 정상화
  - 헬스체크 실패 시 에러 메시지 컨텍스트 부족(`{ message: '' }`) 문제가 있어 스크립트 로그를 보강
  - PostgREST 기반 헬스체크는 GitHub Actions 환경에서 `stadium_group` count 조회 시 비어 있는 에러 payload로 실패할 수 있어, 워크플로 검증 경로를 DB 직결 SQL(`supabase/sql/validate_recent_refresh.sql`)로 전환
  - SQL 헬스체크 1차 적용 시 `DO $$` 블록 내부 `psql` 변수 치환 문제로 문법 오류가 발생했고, temp summary table 기반으로 수정
  - `scripts/validate-recent-refresh.mjs`는 로컬/수동 진단용으로 유지하고, 실패 시 `week/unit/metric/queryType`와 Supabase error payload(`code/details/hint/message`)를 함께 출력하도록 개선
  - `Weekly MV Rebuild #11` 수동 재실행 성공, 로컬 최신 3주 기준 `data:validate-recent-refresh` 및 전체 지원 지표 대상 `data:validate-mv`도 통과
- 후속 확인:
  - 배포 UI 기준 최근 3주 데이터에서 일부 빈 값이 확인됨
  - 원인 분석 결과, MV 자동복구 실패가 아니라 최신 주차 `26.03.09 - 03.15` 원천 적재가 진행 중인 상태로 판단
  - `all` 기준 완료 주차 `26.03.02 - 03.08`은 41개 지표, 최신 주차 `26.03.09 - 03.15`는 32개 지표만 존재
  - 최신 주차 누락 확인 지표:
    - `apply_cancel_fee_to_sales_rate`
    - `apply_cnt_per_active_user`
    - `cash_reward_cost_to_sales_rate`
    - `contribution_margin_rate`
    - `manager_cost_to_sales_rate`
    - `matching_rate`
    - `point_reward_cost_to_sales_rate`
    - `reward_cost_to_sales_rate`
    - `stadium_fee_to_sales_rate`
  - Airbyte를 통해 Supabase 원천을 다시 최신화한 직후, PostgREST에서 `bigquery.weeks_view`를 찾지 못하는 `PGRST205`가 재발
  - 후속 확인에서 GitHub Actions `Weekly MV Rebuild #12`가 `relation "bigquery.weeks_view" does not exist`로 실패해, schema cache뿐 아니라 view 오브젝트 자체 복구가 필요함을 확인
  - 대응으로 MV 재생성 SQL(`supabase/sql/refresh_weekly_agg_mv.sql`)과 신규 migration에 `bigquery.weeks_view` 재생성 + `notify pgrst, 'reload schema'`를 반영
  - 로컬 드릴다운 점검 중 `stadium_group` 이하 부모-자식 조회가 원천 테이블 full scan으로 timeout되어, `entity_hierarchy_mv`를 추가해 부모-자식 옵션/드릴다운 조회를 MV + 계층 MV 조합으로 전환
  - `/api/weeks`는 `weeks_view` 직접 조회 대신 `weekly_agg_mv` 기준 recent week 수집으로 전환해 timeout을 회피
  - `/api/heatmap`은 `all` 단위의 불필요한 원천 fallback을 제거하고, 드릴다운 시 child entity를 chunk 단위로 조회하도록 조정해 timeout을 완화
  - `data_improvement_260312_01` 브랜치 기준 워크플로 재실행/배포 후 기본 조회와 드릴다운 조회가 정상 동작하는 것 확인
  - 로컬 DB 자격증명으로는 원격 `db push` 인증이 실패해, 실제 원격 반영은 GitHub Actions 또는 올바른 `SUPABASE_DB_URI`/DB password 기준으로 후속 실행 필요
- 다음 작업 TODO:
  - 진행 중 주차를 기본 조회에서 제외할지, `집계 진행 중` 상태로 노출할지 정책 결정
  - Airbyte 최신화 직후 `PGRST205` 재발 여부를 모니터링하고, 필요 시 자동 복구 워크플로에 schema reload 단계 유지
  - DB 직결 헬스체크 전환 후 워크플로 재실행 결과 확인
  - `actions/checkout@v5`, `actions/setup-node@v5` 반영 후 워크플로 annotation 경고 제거 확인
  - pooler URI 형식/인코딩/sslmode 점검

### 7.12 2026-03-14 측정단위 확장 및 드릴다운 재설계
- 측정단위 확장:
  - 검색 옵션의 `측정단위`는 고정 리스트가 아니라 `dimension_type` 기반 동적 목록으로 제공
  - 신규 지원 단위:
    - `area_group_and_time`, `area_and_time`
    - `stadium_group_and_time`, `stadium_and_time`
    - `time`, `hour`
    - `yoil_and_hour`, `yoil_group_and_hour`
- 드릴다운 UX:
  - 엔티티 셀 클릭 시 셀 아래에 드롭다운 리스트를 띄우고, 선택 즉시 드릴다운
  - 별도 `드릴다운` 확인 버튼 없이 헤더 엔티티 필터와 동일한 리스트 UI 재사용
  - 드릴다운 옵션은 단순/복합 단위를 함께 보여주되, 실제 조회는 부모 단위와 대상 단위 조합을 만족하는 최소 그레인으로 자동 매핑
  - 예시:
    - `time -> area_group`는 내부적으로 `area_group_and_time` 원천 데이터를 사용해 `area_group` 기준 결과를 생성
    - `time -> area`는 내부적으로 `area_and_time` 원천 데이터를 사용
- 조회 경로 정책:
  - legacy 단위(`all/area_group/area/stadium_group/stadium`)는 `weekly_agg_mv` 우선 유지
  - 확장 단위의 필터 옵션과 heatmap은 선택된 최근 주차 범위 기준 원천 테이블 직접 조회
  - `GET /api/filter-options`는 `week` 파라미터를 받아 확장 단위 범위를 축소해 로딩 시간과 timeout을 완화
- 운영 DB 반영:
  - `supabase/migrations/202603140003_add_indexes_for_expanded_dimension_queries.sql` 적용
  - 목적:
    - 확장 단위 원천조회 경로(`dimension_type`, `week`, entity columns`) 최적화
- 운영 제약:
  - `weekly_agg_mv`를 확장 단위까지 직접 포함시키는 재생성 SQL은 원격 DB에서 temp disk 부족으로 실패
  - 따라서 확장 단위는 현재 MV 확장 대신 원천 조회 + 인덱스 전략을 운영 기준으로 사용

### 7.13 2026-03-18 확장 단위 MV 전환 및 최신 주차 노출 보정
- 측정단위 표시명 변경:
  - `stadium_group` -> `구장`
  - `stadium` -> `면`
  - `stadium_group_and_time` -> `구장 타임`
  - `stadium_and_time` -> `면 타임`
- 측정단위 목록 정리:
  - 원천 제거에 따라 `yoil_and_hour`, `yoil_group_and_hour`는 검색 옵션 `측정단위` 목록에서 retired 처리
  - `GET /api/measurement-units`는 캐시 버전을 올려 제거된 단위가 기존 응답 캐시에 남지 않도록 조정
- 확장 단위 집계 전략 변경:
  - 기존 원칙:
    - 확장 단위는 원천 조회 + 인덱스 fallback
  - 현재 원칙:
    - 최근 24주 범위의 확장 단위는 `bigquery.weekly_expanded_agg_mv` 우선 사용
    - legacy 단위는 계속 `bigquery.weekly_agg_mv` 우선 사용
  - 신규 migration:
    - `supabase/migrations/202603180001_add_weekly_expanded_agg_mv.sql`
    - `supabase/migrations/202603180002_enrich_weekly_expanded_agg_mv_parent_dimensions.sql`
- `weekly_expanded_agg_mv` 설계:
  - 대상 단위:
    - `area_group_and_time`, `area_and_time`
    - `stadium_group_and_time`, `stadium_and_time`
    - `time`, `hour`
    - `yoil_and_hour`, `yoil_group_and_hour`
  - 최근 24주만 유지
  - 상위 드릴다운 parent 대응을 위해 `entity_hierarchy_mv` 기반 지역 축(`area_group`, `area`, `stadium_group`)을 child row에 보강
  - parent filter 최적화를 위해 `measure_unit + metric_id + week + parent columns` 복합 인덱스 추가
- API/캐시 정책 변경:
  - `GET /api/drilldown-options` 추가:
    - 엔티티 클릭 시 실제 데이터가 있는 드릴다운 단위만 노출
    - 다중 `filter-options` 호출 대신 단일 존재성 체크 요청 사용
  - `GET /api/filter-options` 캐시 키는 `measureUnit + parent context + weeks` 기준으로 분기
  - `GET /api/weeks`는 1시간 `unstable_cache`를 제거
    - 이유:
      - Airbyte 화요일 적재 직후 최신 주차가 DB에는 있으나 API가 이전 주차를 계속 반환하는 현상 방지
  - 클라이언트 드릴다운 옵션 캐시는 `sourceUnit + sourceValue + parent/filter/week context`를 모두 포함
- 운영 확인:
  - source 최신 적재 시각 확인:
    - `_airbyte_extracted_at = 2026-03-17T00:07:11.295+00:00`
  - `data:validate-recent-refresh` 기준 최근 3주(`26.03.16 - 03.22`, `26.03.09 - 03.15`, `26.03.02 - 03.08`) 정상
  - `/api/weeks?n=8`은 현재 최신 주차 `26.03.16 - 03.22`를 즉시 반환
  - 특정 parent/child 조합은 timeout이 아니라 실제 `0 rows` 조합으로 정리:
    - 예: `area_group_and_time=경기 | A 평일 비프라임(-17)` -> `stadium_group_and_time`

### 7.14 2026-03-31 주간 MV 재생성 장애 원인 및 최신 주차 누락 수정
- 주간 MV 재생성 장애:
  - GitHub Actions `Weekly MV Rebuild`는 `2026-03-24`, `2026-03-31` 스케줄 런에서 연속 실패했고, `2026-03-17` 런은 성공
  - 직접 원격 DB에서 `supabase/sql/refresh_weekly_agg_mv.sql`을 실행해 확인한 결과, `weekly_expanded_agg_mv`가 `entity_hierarchy_mv`를 참조하는 상태에서 `entity_hierarchy_mv`를 먼저 drop하려 해 재생성이 중단됨
  - 원격 DB `statement_timeout=2min`도 설정돼 있어 장시간 재생성에 추가 리스크가 있었음
- 조치:
  - `refresh_weekly_agg_mv.sql`
    - `weekly_expanded_agg_mv`와 type을 먼저 drop하도록 순서 수정
    - 실행 전후 `set statement_timeout = 0` / `reset statement_timeout` 추가
    - retired 단위 `yoil_and_hour`, `yoil_group_and_hour` 관련 rebuild/index 제거

### 7.15 2026-04-15 측정단위 기반 동적 필터 구조 변경
- 문제:
  - 기존 검색 UI는 `측정단위 -> 필터 기준 -> 필터 값` 2단 선택 구조라, 사용자가 실제 사용할 수 있는 필터 축을 한 번 더 선택해야 했음
  - 기본 상태가 `0/n` 미선택이라 첫 조회 전 UX가 불명확했음
- 변경:
  - `필터 기준` 셀렉트를 제거
  - `measureUnit`의 실제 source row(`dimension_type`)에서 값이 존재하는 엔티티 축만 찾아 각 축을 독립 필터로 직접 노출
  - 예:
    - `measureUnit=area` -> `area_group`, `area`
    - `measureUnit=stadium` -> `area_group`, `area`, `stadium_group`, `stadium`
- 필터 상태 모델:
  - 단일 `filterValue` 중심에서 `filterSelections: Record<unit, string[]>` 구조로 전환
  - 최초 로드 시 각 필터 축은 모든 옵션이 기본 선택 상태
  - `전체 해제`로 0개 선택 상태를 만들 수 있으며, 이는 실제 빈 필터로 취급
- API 반영:
  - `GET /api/measurement-units`
    - 측정단위 목록은 source의 실제 `dimension_type`/provider 매핑을 기준으로 노출
    - 표시 라벨은 `metric_store_native.korean_name`을 최우선으로 사용하고, 값이 없을 때만 코드 fallback 라벨을 사용
  - `GET /api/filter-units`
    - `measureUnit` 기준 사용 가능한 필터 축 목록 제공
  - `GET /api/filter-options`
    - `filterUnit`별 옵션 목록 제공
    - 다른 필터 축의 활성 선택은 `activeFilters` 컨텍스트로 반영
  - `POST /api/heatmap`
    - `filters: [{ unit, values[] }]` 구조로 여러 필터 축의 교집합을 전달
    - 특정 축이 0개 선택이면 빈 결과 반환
- 템플릿/호환성:
  - 템플릿 저장 형식은 `filterSelections` 기준으로 확장
  - 구버전 단일 `filterValue` 템플릿은 현재 측정단위 기준으로 호환 복원
  - `.github/workflows/weekly-mv-rebuild.yml`
    - rebuild step에 `PGOPTIONS="-c statement_timeout=0"` 추가
- 후속 보정:
  - `전체 선택`과 `0개 선택`을 분리해 기본 표시와 실제 조회 의미를 일치시킴
  - 전체 선택 필터는 API 요청에서 제외하고, 빈 선택 필터만 empty 조건으로 전달
  - 각 필터 축 옵션 계산 시 다른 필터의 선택값을 반영하는 cascade 구조로 보강
  - 브라우저의 다중 순차 옵션 호출을 `GET /api/filter-options-batch` 1회 요청으로 통합
  - 배치 옵션 조회는 TTL 300초 캐시를 사용해 반복 로딩 비용을 줄임
  - 다른 필터로 인해 현재 옵션 집합이 축소된 경우, 축소된 옵션 전체를 선택해도 UI 요약은 `전체` 대신 실제 값 요약을 표시
  - 기간단위(`period_type`)에도 동일한 방식의 동적 필터를 확장
    - `year`, `quarter`, `month`, `week`, `day` 중 실제 값이 존재하는 컬럼만 기간 필터 축으로 노출
    - 신규 API: `GET /api/period-filter-units`
    - `measureUnit=all` 상태에서도 기간 필터는 source query 기준으로 실제 distinct 값을 제공
  - 검색 UI를 2층 구조로 재배치
    - 1층: `기간단위`, `기간범위`, 기간 필터들
    - 2층: `측정단위`, 측정단위 기반 엔티티 필터들
  - 다중 선택 라벨을 `첫 값 외 n (선택수/전체옵션수)` 형식으로 통일
    - 예: `계양구 외 39 (40/43)`, `계양구 외 42 (43/43)`
  - 기간 필터 옵션 정합성 수정:
    - `measureUnit=all`일 때도 기간 필터(`year/quarter/month/week/day`)는 `전체`로 고정하지 않고 실제 옵션값을 계산
    - 조기 `all` 반환 로직이 기간 필터 source 조회를 가로막던 문제를 제거
  - 검색 옵션 셀렉트 UI 정책:
    - 각 셀렉트 위의 별도 제목은 제거하고, 박스 내부 텍스트만으로 명칭/선택 상태를 표현
    - 단일 선택 박스는 `셀렉트명 : 선택값` 형식
      - 예: `기간단위 : 월`, `측정단위 : 지역`
    - 다중 선택 박스는 전체 선택 시 `셀렉트명`, 일부 선택 시 `셀렉트명 (n)` 형식
      - 예: `지역그룹`, `지역 (2)`
    - 기간단위를 변경하면 기간 기반 필터 선택/옵션은 초기화하고, 새 주기 기준 전체 선택 상태로 다시 로드
    - 단일 선택 드롭다운은 커스텀 UI를 사용해, 펼쳤을 때 옵션 리스트에는 접두어 없이 값만 노출
    - 기간 필터 옵션(`year/quarter/month/week/day`)은 최신값 우선의 내림차순으로 정렬
    - 모든 검색 셀렉트 박스는 가로 `150px`, `지표 선택` 버튼과 동일한 높이/폰트 기준으로 통일하고 긴 값은 말줄임(`...`) 처리
    - 단일 선택 박스와 동적 필터 박스의 글자 두께는 보통(`400`)으로 맞추고, 패딩/높이도 동일 기준으로 유지
    - 멀티 선택 드롭다운 편집 규칙:
      - `전체 해제`는 즉시 결과에 반영하지 않고 드롭다운 내부 임시 상태만 비움
      - 0개 선택 상태로 드롭다운을 닫으면 직전 적용 선택으로 복원
      - 마지막 1개 값을 해제하려 하면 자동으로 전체 선택으로 복귀
      - 각 옵션 행 hover 시 `지정된 값만 보기` 버튼을 노출하고, 클릭 시 해당 값만 단독 선택 후 즉시 결과에 반영
      - 옵션 라벨은 기본 상태에서는 원문을 최대한 그대로 노출하고, hover/focus 시 버튼 공간이 필요할 때에만 말줄임(`...`)을 적용
      - 드롭다운 메뉴 가로 폭은 고정하고, hover 시 메뉴 박스 전체가 늘어나지 않도록 옵션 행 내부 텍스트만 축약
- 2026-04-16 source 단위 추가 반영:
  - BigQuery source(`data_mart_1_social_match`)에서 신규 `dimension_type`를 확인하고 앱 측정단위 목록에 반영
  - 추가 대상:
    - `ai_report_match`
    - `match_grade`
    - `match_level`
    - `match_player_cnt`
    - `match_sex`
    - `plab_stadium`
    - `plaber_match`
    - `yoil`
    - `yoil_group`
  - 관련 조치:
    - `UNIT_CONFIG_BY_UNIT`, `COLUMN_BY_UNIT`, 정렬 순서, 라벨 매핑 확장
    - `measurement-units` API 캐시 키 갱신
    - 신규 단위는 `legacy`/`weekly_expanded_agg` 집계 테이블 대상이 아니므로, 주간 조회에서도 `source query` 경로를 사용하도록 `bigqueryProvider` 분기 보정
    - 이 보정으로 새 단위 선택 시 결과/필터/드릴다운 확인 경로가 집계 테이블 미존재 때문에 0건으로 떨어지던 문제를 줄임
- 2026-04-16 레이아웃 미세조정:
  - 헤더 외곽 여백은 `10px / 15px / 10px` 기준으로 정리하고 하단 장식선은 제거
  - 상단 검색 카드 패딩은 `15px 15px 7px`로 축소하고, 기간 row/측정단위 row 간격을 분리 조정
  - 측정단위 row는 액션 버튼 묶음과 세로 가운데 정렬되도록 보정
  - `main-panel`은 고정 폭 대신 `width: 100%`로 확장해 빈 상태/오류 카드가 좌측으로 몰려 보이지 않도록 수정
  - 결과 테이블 카드는 외곽 border를 제거하고 내부 패딩과 스크롤 여백만 유지
- 2026-04-16 BigQuery 숫자 시작 metric identifier 보정:
  - 증상:
    - 월 단위 source query 경로에서 `6p_cancel_match_rate`, `7p_cancel_match_rate` 등 숫자로 시작하는 metric을 선택하면 BigQuery가 문법 오류(`Expected keyword AS`)를 반환
  - 원인:
    - 동적 metric column을 SQL 식별자로 조립할 때 백틱 없이 raw identifier를 사용
    - BigQuery는 숫자로 시작하는 컬럼명을 반드시 백틱으로 감싸야 함
  - 조치:
    - `bigqueryProvider.ts`의 identifier sanitizer를 BigQuery 식별자용 백틱 래핑 형태로 보정
    - 이에 따라 heatmap/source/raw-data 경로의 동적 metric SELECT/STRUCT 조립에서 숫자 시작 metric도 안전하게 조회 가능
- 2026-04-16 드릴다운 메뉴 표시 보정:
  - 증상:
    - 엔티티 셀 클릭 시 드릴다운 옵션은 로드되지만 메뉴가 테이블 뒤로 가려지거나 셀 영역 밖에서 잘려 보임
  - 원인:
    - 엔티티 셀 내부 absolute 메뉴가 `data-grid`/`data-entity` overflow clipping과 낮은 stacking context 영향을 받음
  - 조치:
    - 확장된 엔티티 셀과 row를 별도 stacking context로 올리고 overflow를 visible로 보정
    - 드릴다운 메뉴 z-index를 테이블 셀보다 높게 설정해 옵션 목록이 클릭한 엔티티 아래에 노출되도록 수정
  - 후속 보정:
    - 결과 행이 적어 가로 스크롤바가 메뉴와 겹치는 케이스는 CSS stacking만으로 안정적으로 해결하기 어려워, 메뉴를 `document.body` 포털로 분리
    - 클릭한 엔티티 셀의 viewport 좌표를 기준으로 `position: fixed` 드롭다운을 띄우고, window scroll/resize 시 위치를 재계산
- UI 표현 보정:
  - Kevin AI 첫 세션 기본 제목을 `대화`로 단순화
  - 기본 저장 탭 이름을 `템플릿`으로 축약하고, 추가 탭은 `템플릿2`, `템플릿3` 규칙으로 생성
  - heatmap 색상 프리셋은 운영 혼선을 줄이기 위해 7개(`빨강/주황/노랑/초록/청록/파랑/보라`)만 제공
  - 결과 테이블 헤더 정렬 기준을 컬럼 성격별로 고정
    - 텍스트 컬럼: 좌측
    - 스파크라인 컬럼: 중앙
    - 기간 값 컬럼: 우측
  - 엔티티 테이블 `측정단위` 헤더의 보조 정렬 아이콘은 제거하고 텍스트 위주로 단순화
- 2026-04-17 디자인 시스템 프로토타입:
  - 기존 운영 화면에 바로 적용하지 않고 `/prototype` 하위 별도 라우트에서 UI 후보를 비교한다.
  - 공통 컨셉은 흰색 바탕과 맨체스터 시티 블루 계열 포인트 컬러다.
  - 후보:
    - `/prototype/design-a`: Dense Operations
    - `/prototype/design-b`: Modern SaaS Analytics
    - `/prototype/design-c`: Command Center
  - 프로토타입은 실제 API/DB 연결 없이 더미데이터로 구성한다.
  - 포함 기능 표면:
    - 템플릿 탭
    - 지표 선택 row
    - 기간/측정단위 2줄 필터
    - 지표 선택 패널
    - 다중 선택 드롭다운
    - heatmap 테이블
    - sparkline
    - 엔티티 드릴다운
    - Kevin AI 패널
  - 실제 운영 화면의 정보 구조와 UI 구성은 유지하며, 후보별 차이는 색상, border, radius, density, emphasis로 제한한다.
  - 운영 화면과 전역 스타일을 변경하지 않도록 `app/prototype/` 하위와 CSS Module로 격리한다.
  - 디자인 검토 접근성을 위해 `/prototype` 하위 라우트는 앱 Supabase 로그인 미들웨어에서 제외한다.
  - 후보 폐기 시 `app/prototype/` 및 `DESIGN_SYSTEM_RESEARCH.md` 제거만으로 되돌릴 수 있어야 한다.
- 운영 검증:
  - 원격 DB 수동 재생성 성공
  - 재생성 완료 시간 약 19분, 현재 workflow `timeout-minutes: 30` 내에서 수용 가능
  - `validate_recent_refresh.sql` 기준 최근 3주(`26.03.16 - 03.22`, `26.03.23 - 03.29`, `26.03.30 - 04.05`)의 legacy 단위(`all/area_group/area/stadium_group/stadium`) 데이터 존재 확인
- 최신 주차 누락 수정:
  - 증상:
    - 로컬 `/api/weeks?n=8`이 최신 2주를 누락하고 `26.03.16 - 03.22`까지만 반환
  - 원인:
    - `getWeeksData()`가 `weekly_agg_mv`의 `all` 단위 전체 row에서 주차를 수집했고, 주차당 다수 metric row가 존재해 정렬/페이지네이션이 왜곡됨
  - 조치:
    - `getWeeksData()`는 `measure_unit='all'`, `filter_value='전체'`, `metric_id='total_match_cnt'` 기준 1 row per week만 읽도록 수정
  - 결과:
    - `/api/weeks`는 최신 주차를 안정적으로 반환하며, Airbyte 반영 후 최신 8/12/24주 노출 누락을 줄임

### 7.14 2026-04-01 BigQuery 전환 프로젝트(`plab-kevin`)
- 새 프로젝트 구성:
  - GitHub repo `Pucca1234/plab-kevin`
  - Vercel project `plab-kevin`
  - branch 기반 개발 후 별도 production URL로 검증
- analytics provider 분리:
  - `dataQueries.ts` facade 유지
  - `provider.ts`, `supabaseProvider.ts`, `bigqueryProvider.ts` 구조 도입
- BigQuery serving layer 반영:
  - `kevin_serving.weeks_view`
  - `kevin_serving.entity_hierarchy`
  - `kevin_serving.weekly_agg`
  - `kevin_serving.weekly_expanded_agg`
- 정합성 원칙:
  - `plab-kevin`은 legacy Supabase 결과가 아니라 BigQuery 원천 기준으로 판단
  - parity 비교 결과 차이는 우선 BigQuery source와 대조해 해석
- 배포 이슈/조치:
  - 초기 Vercel project preset이 `Other`로 설정되어 `@vercel/static-build`가 선택되며 production에서 `404 NOT_FOUND` 발생
  - project framework를 `nextjs`로 수정하고 `vercel.json`으로 Next.js builder를 고정
  - Supabase redirect URL에 `plab-kevin` 도메인 추가
  - middleware 제거 후 production 배포 안정화
  - 현재 production 핵심 확인:
    - `/`
    - `/api/weeks`
    - `/api/filter-options`
    - `/api/heatmap`

### 7.15 2026-04-05 기간 단위 확장
- 목표:
  - 기존 주 단위 중심 조회를 `연/분기/월/주/일` 단위까지 확장
  - 검색 UI는 셀렉트 박스를 늘리지 않고, 먼저 `기간단위`를 고른 뒤 그 단위에 맞는 기본 기간 범위를 제시
- UI 정책:
  - `기간단위`: `연`, `분기`, `월`, `주`, `일`
  - 단위별 기간 범위:
    - `연`: `전체`, `최근 3년`, `최근 5년`
    - `분기`: `전체`, `최근 4분기`, `최근 8분기`, `최근 12분기`
    - `월`: `전체`, `최근 6개월`, `최근 12개월`, `최근 24개월`
    - `주`: `전체`, `최근 8주`, `최근 12주`, `최근 24주`
    - `일`: `전체`, `최근 7일`, `최근 30일`, `최근 90일`
- API/데이터 경로:
  - `/api/weeks`, `/api/filter-options`, `/api/drilldown-options`, `/api/heatmap`는 `periodUnit(year|quarter|month|week|day)`를 지원
  - `week`는 기존 `kevin_serving` 기반 serving layer를 유지
  - `year/quarter/month/day`는 현재 `data_mart_1_social_match` 원천 직접 조회로 우선 반영
- 표시 정책:
  - 일 단위 컬럼 헤더는 `YY.MM.DD 요일약어` 형식으로 표기
  - 분기 단위 컬럼 헤더는 `YY년 N분기` 형식으로 표기
  - 연/월은 현재 날짜 이후 future bucket은 제외
- 후속 TODO:
  - `year/quarter/month/day`도 `week`와 동일한 수준의 `kevin_serving` serving layer를 설계해 조회 경로를 통일
  - 특히 `day`는 장기적으로 스캔량/비용 영향이 가장 커질 가능성이 높아 우선 serving화 검토

### 7.16 2026-04-05 템플릿 저장 / Kevin AI 복구
- 템플릿 저장 기능:
  - 현상:
    - 새 `plab-kevin` 프로젝트에서 로그인 후에도 템플릿 생성/수정/삭제가 정상 동작하지 않음
  - 원인:
    - 템플릿 API가 서버 쿠키 기반 세션만 기대하고 있었고, 신규 프로젝트의 브라우저 로그인 세션과 API 인증 판단이 일치하지 않음
  - 조치:
    - 클라이언트가 Supabase access token을 `Authorization: Bearer ...` 형태로 함께 전달
    - 서버는 쿠키 세션이 없더라도 bearer token 기준으로 사용자를 확인하도록 보강
  - 반영 파일:
    - `app/api/filter-templates/route.ts`
    - `app/api/filter-templates/[id]/route.ts`
    - `app/lib/supabase/requestUser.ts`
    - `app/page.tsx`
- Kevin AI:
  - 현상:
    - `plab-kevin`에서 Kevin AI가 기존 운영 프로젝트와 달리 정상 응답하지 않음
  - 원인:
    - 새 Vercel project에 `ANTHROPIC_API_KEY`가 누락되어 Anthropic 직접 호출이 불가능했음
  - 조치:
    - `plab-kevin` Vercel project에 `ANTHROPIC_API_KEY`를 추가
    - Kevin AI는 신규 프로젝트에서 직접 Anthropic API를 호출하는 구조를 유지
- 운영 메모:
  - `plab-kevin`에서 Kevin AI를 정상 운영하려면 최소 env:
    - `ANTHROPIC_API_KEY`
    - `NEXT_PUBLIC_APP_URL`

### 7.17 2026-04-09 드릴다운 옵션/결과 정합성 보강
- 드릴다운 옵션 노출 기준 변경:
  - 엔티티 클릭 시, 후보 단위를 단순 계층 추론으로 노출하지 않고 `data_mart_1_social_match`에서 클릭한 엔티티 값을 가진 row들의 실제 `dimension_type` 기준으로만 노출
  - 예: `area_group=경기` 클릭 시, 최근 선택 기간 내 `area_group='경기'` row가 실제로 존재하는 `dimension_type`만 옵션으로 표시
- 상위 parent context 반영:
  - 드릴다운 옵션 판정 시 현재 클릭한 엔티티뿐 아니라 상위 `parentUnit/parentValue`를 함께 반영
  - 이로 인해 상위 context를 벗어난 데이터 때문에 옵션이 과노출되던 문제를 방지
- 성능 조정:
  - `GET /api/drilldown-options`는 후보 단위별 개별 조회 대신 source에서 `distinct dimension_type`를 한 번에 조회하는 방식으로 변경
  - 후보 수가 많을 때 응답 시간을 단축
- heatmap 결과 정합성 수정:
  - `stadium_group -> stadium_and_time` 같은 확장 단위 drilldown에서 BigQuery provider가 불필요한 `queryUnit` 판정으로 조기 종료하며 빈 결과를 반환하던 버그 수정
  - drilldown(`parentUnit/parentValue` 포함) heatmap 요청은 TTL 캐시를 우회해 최신 계산 결과를 사용
- 검증 기준:
  - `지역그룹(전체) > 구장(경기) > 면 타임(고양 데일리 그라운드 풋살장 마두점)` 경로에서 `데일리_마두 | A 평일 비프라임(-17)` 등 실제 row 노출 확인
  - 동일 경로에서 `stadium_and_time` 필터 옵션 정상 노출 확인

## 8. 운영 도메인 원칙
- Canonical 운영 도메인은 단일값만 사용:
  - `https://social-match-dashboard-mvp.vercel.app`
- Supabase Auth URL 정책:
  - `Site URL` = canonical 운영 도메인
  - Redirect URLs:
    - `https://social-match-dashboard-mvp.vercel.app/auth/callback`
    - `http://localhost:3000/auth/callback`
- `-two` 같은 보조 도메인은 운영 로그인 경로에 등록하지 않음(필요 시 Preview 전용으로만 사용)

### 7.5 2026-02-22 장애 원인 및 조치
- 현상:
  - `area/stadium_group/stadium` 최근 주차 조회 시 0 값 과다 노출
- 원인:
  - API 조회가 단건 호출로 끝나면서 대용량 row가 1000행으로 절단됨
  - 절단 이후 프론트 표시에서 일부 지표가 0 중심으로 보이는 왜곡 발생
- 재현 근거(최근 8주, 주요 6지표):
  - `area`: `rowsReturned=1000`, `exactCount=4228`
  - `stadium_group`: `rowsReturned=1000`, `exactCount=15677`
  - `stadium`: `rowsReturned=1000`, `exactCount=24639`
- 조치:
  - `app/lib/dataQueries.ts`에 공통 페이지네이션 유틸 도입
  - heatmap/fallback/filter 옵션 조회 경로 모두 페이지네이션 적용

### 7.6 2026-02-22 속도 개선(v4)
- 배경:
  - `stadium_group`, `stadium`는 엔티티 수가 많아 필터 옵션 로딩과 조회 준비 단계 지연 발생
- 개선:
  - `weekly_agg_mv`에 인덱스 추가:
    - 마이그레이션: `supabase/migrations/202602220001_weekly_agg_mv_filter_options_idx.sql`
    - 인덱스: `(measure_unit, metric_id, filter_value)`
  - 필터 옵션 API를 MV 기반으로 전환하고 TTL 캐시 적용
  - heatmap API의 지원 지표 목록 조회 캐시 적용

## 9. 검증 체계
### 8.1 로컬 검증
- 스크립트: `scripts/validate-weekly-agg-mv.mjs`
- 명령: `npm run data:validate-mv`
- 기본: 최근 8주, 지원 가능한 전체 지표, 5개 단위
- 튜닝 환경변수:
  - `MV_VALIDATE_WEEKS`
  - `MV_VALIDATE_EPSILON`
  - `MV_VALIDATE_METRICS`

### 8.2 PR 자동 검증
- 워크플로: `.github/workflows/data-validation.yml`
- 트리거: `pull_request`
- 실행: `npm run data:validate-mv`
- GitHub Secrets 필수:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 10. 운영 자동화
### 9.1 Supabase CLI
- 가이드: `SUPABASE_CLI_WORKFLOW.md`
- 스크립트:
  - `npm run sb:doctor`
  - `npm run sb:link`
  - `npm run sb:push`
  - `npm run sb:bootstrap`

### 9.2 릴리즈 준비 자동화
- 스크립트: `scripts/release/prepare-pr.ps1`
- 명령: `npm run release:prepare`
- 기능:
  - build + data validation + commit
  - 옵션으로 push/PR 생성

### 9.3 주간 MV 복구 스케줄 (Airbyte overwrite 대응)
- 목적:
  - Airbyte 주간 overwrite/refresh 이후 `weekly_agg_mv` 및 인덱스 종속성 이탈 자동 복구
- 실행 시각:
  - 매주 화요일 10:00 KST (GitHub Actions cron: `0 1 * * 2`)
- 워크플로:
  - `.github/workflows/weekly-mv-rebuild.yml`
- 실행 순서:
  - `supabase/sql/refresh_weekly_agg_mv.sql` 실행 (MV 재생성 + 인덱스 보장)
  - `supabase/sql/validate_recent_refresh.sql` 실행 (최근 3주/주요 지표 존재 헬스체크)
- 운영 주의사항:
  - 재생성 SQL은 `weekly_expanded_agg_mv` -> `entity_hierarchy_mv` -> `weekly_agg_mv` 순서로 의존성을 해소한 뒤 다시 생성해야 함
  - 원격 DB 기본 `statement_timeout` 영향 없이 끝까지 수행되도록 workflow와 SQL 양쪽에서 timeout을 해제
- 필요 Secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URI`

### 9.4 BigQuery serving rebuild 스케줄 (`plab-kevin`)
- 목적:
  - BigQuery source 갱신 이후 `kevin_serving` 집계 레이어를 자동 재생성
  - `plab-kevin`이 BigQuery source와 가장 가까운 serving 데이터를 사용하도록 유지
- 실행 시각:
  - 매일 08:30 KST (GitHub Actions cron: `30 23 * * *`)
- 워크플로:
  - `.github/workflows/bigquery-serving-rebuild.yml`
- 실행 순서:
  - `npm run bq:build-serving`
  - `npm run bq:validate-serving`
- 재생성 대상:
  - `kevin_serving.entity_hierarchy`
  - `kevin_serving.weekly_agg`
  - `kevin_serving.weekly_expanded_agg`
- 참고:
  - `kevin_serving.weeks_view`는 source를 바라보는 `VIEW`
  - source 예약 쿼리 반영이 지연되거나 수동 반영이 늦어진 날은, 당일 08:30 KST rebuild에 포함되지 않을 수 있으며 다음날 스케줄에서 반영하는 것을 허용
- 필요 Secrets:
  - `BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64`
## 11. 비기능 요구사항
- UTF-8 인코딩 강제(`predev`, `prebuild`)
- 원천 테이블 스키마 변경 금지
- 신규 리소스는 별도 파일/마이그레이션으로 관리

## 12. 수용 기준 (현재)
- `stadium_group`, `stadium` 조회 결과 정상 노출
- 전체 지표 검증(`data:validate-mv`) 결과:
  - `missingRows = 0`
  - `mismatchRows = 0` (허용 오차 `MV_VALIDATE_EPSILON` 기준)
- PR 시 `Data Validation` 워크플로 성공

## 13. 후속 아키텍처 전환 검토
- 분석 데이터 read path를 `Supabase raw + MV`에서 `BigQuery serving layer`로 전환하는 별도 프로젝트를 검토한다.
- 목적:
  - Airbyte 동기화 및 주간 MV 복구 배치 의존도 제거
  - Supabase는 인증, 템플릿 저장, 사용자 설정 등 앱 기능 데이터 저장소로 유지
  - 분석 쿼리는 BigQuery를 서버에서 직접 조회
- 상세 계획 문서:
  - `BIGQUERY_MIGRATION_PLAN.md`
  - `BIGQUERY_PHASE0_DISCOVERY.md`
  - `ANALYTICS_API_CONTRACT.md`
  - `BIGQUERY_SERVING_SQL_DRAFT.md`
  - `ANALYTICS_PROVIDER_INTERFACE.md`
