# PLAB Kevin

플랩풋볼 운영/매칭 데이터를 연/분기/월/주/일 단위로 분석하는 내부 대시보드의 BigQuery 전환 프로젝트입니다.

## 핵심 목적
- 최근 8/12/24주 성과 추이 확인
- 측정단위(`all`, `area_group`, `area`, `stadium_group`, `stadium` 및 `dimension_type` 기반 확장 단위)별 비교
- 지표 기반 의사결정 및 AI 요약/질문 응답 지원

## 기술 스택
- Frontend: Next.js 14, React, TypeScript
- Data: Supabase(Postgres, schema `bigquery`)
- Analytics backend migration: provider-based split (`supabase` -> `bigquery`)
- Source Tables:
  - `bigquery.data_mart_1_social_match`
  - `bigquery.metric_store_native`
- Supporting Views:
  - `bigquery.weeks_view`
  - `bigquery.weekly_agg_mv`

## 전환 작업 상태
- 현재 analytics read path는 provider 구조로 분리되어 있습니다.
- 기본값은 `ANALYTICS_BACKEND=bigquery`이며, `plab-kevin`의 분석 응답은 BigQuery를 source of truth로 사용합니다.
- BigQuery provider 구현 완료 범위:
  - `metrics`
  - `measurement-units`
  - `weeks`
  - `filter-options`
  - `drilldown-options`
  - `heatmap`
- `kevin_serving` serving layer 구성 완료:
  - `weeks_view` (`VIEW`)
  - `entity_hierarchy` (`BASE TABLE`)
  - `weekly_agg` (`BASE TABLE`)
  - `weekly_expanded_agg` (`BASE TABLE`)
- BigQuery 런타임 검증 전제:
  - 지원 인증 방식:
    - `BIGQUERY_SERVICE_ACCOUNT_JSON`
    - `BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64`
    - `BIGQUERY_ACCESS_TOKEN`
    - 로컬 `gcloud auth login` fallback
  - Vercel 배포 시에는 service account JSON 계열 env 사용 권장

## 2026-04-01 BigQuery 전환 작업 이력
- 새 프로젝트 구성:
  - GitHub repo `Pucca1234/plab-kevin`
  - Vercel project `plab-kevin`
  - production URL `https://plab-kevin.vercel.app`
- analytics provider 분리:
  - `app/lib/analytics/provider.ts`
  - `app/lib/analytics/supabaseProvider.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
- BigQuery source 연결:
  - `plabfootball-51bf5.data_mart.data_mart_1_social_match`
  - `plabfootball-51bf5.googlesheets.metric_store_native`
- BigQuery serving layer 구축:
  - dataset: `plabfootball-51bf5.kevin_serving`
  - build script: `scripts/bigquery/build-serving-layer.mjs`
  - parity report: `BIGQUERY_PARITY_REPORT_20260401.md`
- Vercel 배포 이슈 해결:
  - 초기에는 프로젝트 preset이 `Other`로 잡혀 `@vercel/static-build`로 배포되며 production URL이 `404 NOT_FOUND`
  - 프로젝트 framework를 `nextjs`로 수정하고 `vercel.json`으로 Next.js builder 고정
  - middleware 제거 후 배포 안정화
  - 현재 production 배포에서 `/`, `/api/weeks`, `/api/filter-options`, `/api/heatmap` 확인 완료
- 인증/로그인 조정:
  - Supabase redirect URL에 `plab-kevin` 도메인 추가
  - 로그인 후 기존 `social-match-dashboard-mvp`로 튀는 문제 해결

## BigQuery 운영 기준
- `plab-kevin`의 분석 source of truth는 BigQuery입니다.
- BigQuery source는 read-only로 취급합니다.
- 실제 서비스 원천은 플랩풋볼 MySQL이며, 아래 BigQuery 테이블은 예약 쿼리로 갱신됩니다.
  - `data_mart.data_mart_1_social_match`
  - `googlesheets.metric_store_native`
- 현재 확인된 운영 기준:
  - 두 source 테이블 모두 매일 07:50 KST 기준 갱신
  - 대부분 자동 갱신되지만, 가끔 수동 재실행으로 늦게 반영되는 날이 있음
  - serving rebuild는 08:30 KST에 실행하고, 지연 반영분은 다음날 스케줄에서 반영하는 것을 기본 정책으로 함

## API
- `GET /api/metrics`
- `GET /api/measurement-units`
- `GET /api/weeks?n=...&periodUnit=year|quarter|month|week|day`
- `GET /api/filter-options?measureUnit=...`
- `POST /api/heatmap`
- `POST /api/ai/summary`
- `POST /api/ai/chat`

## 2026-04-05 기간 단위 확장
- 검색 조건에 `기간단위` 선택 추가:
  - `연`, `분기`, `월`, `주`, `일`
- 기간단위별 기본 범위:
  - `연`: `전체`, `최근 3년`, `최근 5년`
  - `분기`: `전체`, `최근 4분기`, `최근 8분기`, `최근 12분기`
  - `월`: `전체`, `최근 6개월`, `최근 12개월`, `최근 24개월`
  - `주`: `전체`, `최근 8주`, `최근 12주`, `최근 24주`
  - `일`: `전체`, `최근 7일`, `최근 30일`, `최근 90일`
- 조회 경로:
  - `week`는 기존과 동일하게 `kevin_serving` serving layer 기준 조회
  - `year/quarter/month/day`는 현재 `data_mart_1_social_match` 원천을 직접 조회
- 표시 개선:
  - 일 단위 결과 헤더는 `26.04.01 화` 형식으로 요일 축약 표기
  - 분기 단위 결과 헤더는 `26년 2분기` 형식으로 표시
- 향후 TODO:
  - `year/quarter/month/day`도 `week`와 동일하게 `kevin_serving` 기반 serving layer로 통일 검토

## 2026-04-05 운영 기능 복구
- 템플릿 저장 기능 복구:
  - 새 `plab-kevin` 프로젝트에서 템플릿 API가 서버 쿠키 세션만 기대하고 있어, 브라우저 로그인 상태와 API 인증 상태가 어긋나던 문제를 수정
  - 클라이언트가 Supabase access token을 함께 전달하고, 서버는 bearer token 기준으로도 사용자를 확인하도록 보강
  - 대상 API:
    - `GET /api/filter-templates`
    - `POST /api/filter-templates`
    - `PATCH /api/filter-templates/[id]`
    - `DELETE /api/filter-templates/[id]`
- Kevin AI 복구:
  - `plab-kevin` Vercel project에 `ANTHROPIC_API_KEY`를 추가해 새 프로젝트에서 직접 Anthropic API를 호출하도록 복구
  - 운영상 Kevin AI가 정상 동작하려면 아래 env가 필요:
    - `ANTHROPIC_API_KEY`
    - `NEXT_PUBLIC_APP_URL`

## 2026-04-09 드릴다운 옵션/결과 정합성 보강
- 드릴다운 옵션 노출 기준 변경:
  - 엔티티 클릭 시, 후보 단위를 단순 계층 관계로 노출하지 않고 `data_mart_1_social_match`에서 클릭한 엔티티 값을 가진 row들의 실제 `dimension_type` 기준으로만 노출
  - 예: `area_group=경기` 클릭 시 최근 선택 기간 안에서 `area_group='경기'`를 가진 row의 `dimension_type`이 실제로 존재하는 단위만 옵션으로 표시
- 상위 드릴다운 context 반영:
  - 드릴다운 옵션 판정 시 현재 클릭한 엔티티뿐 아니라 상위 `parentUnit/parentValue`까지 함께 반영
  - 이로 인해 상위 context 밖에서만 데이터가 있는 옵션이 잘못 노출되던 문제를 방지
- 성능 개선:
  - `GET /api/drilldown-options`는 후보 단위별 반복 조회 대신 source에서 `distinct dimension_type`를 한 번에 조회하도록 변경
  - 드릴다운 옵션 응답 시간을 단축
- 드릴다운 heatmap 정합성 수정:
  - `stadium_group -> stadium_and_time` 같은 확장 단위 drilldown에서 BigQuery provider가 불필요한 `queryUnit` 판정으로 조기 종료하며 빈 결과를 반환하던 문제 수정
  - drilldown(`parentUnit/parentValue` 포함) heatmap 요청은 TTL 캐시를 우회하고 항상 최신 계산 결과를 사용하도록 조정
  - 확인 케이스:
    - `지역그룹(전체) > 구장(경기) > 면 타임(고양 데일리 그라운드 풋살장 마두점)` 경로에서 `데일리_마두 | A 평일 비프라임(-17)` 등 실제 row가 정상 노출
    - 같은 경로에서 `stadium_and_time` 필터 옵션도 정상 노출

## 2026-04-15 동적 필터 UX 개편
- 측정단위 기반 동적 필터:
  - 선택한 `measureUnit`의 source row(`dimension_type`)에서 실제 값이 존재하는 엔티티 축만 필터로 노출
  - 별도 `필터 기준` 셀렉트는 제거
  - 대신 사용 가능한 필터 축을 각각 독립 드롭다운으로 병렬 노출
  - 예: `측정단위=지역(area)`일 때 `지역그룹`, `지역` 필터가 동시에 표시
- 기본 선택 정책:
  - 필터 드롭다운은 최초 로드 시 각 축의 모든 옵션이 기본 선택된 상태로 시작
  - UI 요약 라벨은 전체 선택 시 `전체`, 일부 선택 시 `첫 값 외 n건`, 미선택 시 `선택`
- 조회 정책:
  - 여러 필터 축을 동시에 선택하면 교집합 기준으로 heatmap을 조회
  - 특정 필터 축에서 `전체 해제`로 0개 선택 상태를 만들 수 있음
  - 0개 선택 상태는 실제 빈 필터로 취급하며, 조회 결과도 빈 결과로 처리
- 템플릿 저장:
  - 템플릿은 단일 `filterValue`가 아니라 `filterSelections`(`unit -> selectedValues[]`) 구조로 저장
  - 구버전 템플릿의 단일 `filterValue`는 현재 측정단위 기준으로 호환 복원

## 2026-04-15 동적 필터 후속 보정
- 선택 상태 의미 정리:
  - `전체 선택`과 `0개 선택`을 분리
  - 기본 진입 시 각 필터 축은 실제 `전체 선택` 상태로 로드
  - `전체 해제`는 실제 `빈 선택([])`으로 유지
- 조회 정합성 수정:
  - `전체`가 내부적으로 `없음`으로 해석되며 빈 결과가 나오던 문제 수정
  - 전체 선택 필터는 heatmap/filter-options 요청에서 제외하고, 빈 선택 필터만 실제 빈 결과 조건으로 전달
- 연동형(cascade) 필터:
  - 다른 필터의 현재 선택값을 반영해 다음 필터 옵션을 다시 계산
  - 예: `지역그룹=강원` 선택 시 `지역` 필터는 강원 소속 지역만 노출
- 성능 개선:
  - 브라우저에서 필터 축별 `GET /api/filter-options`를 순차 호출하던 구조를 배치 API로 통합
  - 신규 API: `GET /api/filter-options-batch`
  - 필터 옵션 로딩 시 여러 축 옵션을 한 번에 계산하고 300초 TTL 캐시 적용
- 표시 정책 보정:
  - 다른 필터 때문에 현재 옵션이 좁혀진 상태에서는, 남은 옵션을 전부 선택해도 `전체` 대신 실제 선택값 요약을 노출
  - 예: `지역그룹=강원, 경기`만 남아 있고 둘 다 선택된 경우 `전체`가 아니라 `강원, 경기`로 표시
- 기간단위 동적 필터 확장:
  - 기간단위(`period_type`)에도 측정단위와 동일한 방식의 동적 필터를 적용
  - 예: `periodUnit=month`일 때 source row에서 값이 존재하는 `year`, `quarter`, `month`만 기간 필터 축으로 노출
  - 신규 API: `GET /api/period-filter-units`
  - 기간 필터도 기본 전체 선택, `전체 해제`, cascade, heatmap 교집합 적용 방식을 동일하게 사용
- 기간 필터 옵션 정합성 수정:
  - `measureUnit=all` 상태에서 기간 필터(`year/quarter/month/week/day`) 옵션이 `전체`만 보이던 문제 수정
  - 원인: `getFilterOptions()`가 `measureUnit === "all"`이면 조기 반환하며 기간 필터 source 조회까지 가지 못함
  - 조치: 기간 필터는 `measureUnit=all`이어도 source query 경로로 내려가 실제 distinct period 값을 반환하도록 보정
- 검색 UI 2층 구조:
  - 1층: `기간단위`, `기간범위`, 기간 필터들
  - 2층: `측정단위`, 측정단위 기반 엔티티 필터들
- 다중 선택 라벨 통일:
  - 3개 이상 선택 시 항상 `첫 값 외 n (선택수/전체옵션수)` 형식으로 표시
  - 예: `계양구 외 39 (40/43)`, `계양구 외 42 (43/43)`
- 검색 옵션 셀렉트 UI 정리:
  - 검색 옵션 상단 제목은 제거하고, 각 셀렉트 박스 내부에 명칭/선택 상태를 직접 표시
  - 단일 선택 성격(`기간단위`, `기간범위`, `측정단위`)은 `셀렉트명 : 선택값` 형식으로 노출
  - 다중 선택 필터는 전체 선택 시 `셀렉트명`, 일부 선택 시 `셀렉트명 (n)` 형식으로 노출
  - 기간단위 변경 시 기간 기반 동적 필터는 이전 선택을 초기화하고, 새 옵션 기준 전체 선택 상태로 다시 로드
  - 단일 선택 드롭다운을 커스텀 UI로 바꿔, 펼쳤을 때 옵션 리스트에는 접두어(`기간단위 :`, `측정단위 :`) 없이 값만 노출
  - 기간 필터 옵션(`연/분기/월/주/일`)은 최신값이 먼저 오도록 내림차순 정렬
  - 모든 검색 셀렉트 박스는 가로 `150px`, `지표 선택` 버튼과 같은 폰트 크기/높이 기준으로 통일하고 긴 문자열은 말줄임(`...`) 처리
  - 단일 선택 박스와 동적 필터 박스의 글자 두께를 보통(`400`)으로 맞추고, 높이/패딩도 동일 기준으로 통일
  - 멀티 선택 드롭다운 편집 규칙:
    - `전체 해제`는 드롭다운 내부 임시 상태만 비우고, 0개 선택 상태를 즉시 결과로 확정하지 않음
    - 0개 선택 상태로 드롭다운을 닫으면 직전 적용 선택으로 복원
    - 마지막 1개 값을 해제하려고 하면 자동으로 전체 선택으로 복귀
    - 각 옵션 행 hover 시 `지정된 값만 보기` 버튼을 노출하고, 클릭 시 해당 값만 단독 선택한 뒤 즉시 결과에 반영
    - 옵션 라벨은 기본 상태에서는 가능한 한 원문 그대로 표시하고, hover/focus 시 `지정된 값만 보기` 버튼 공간이 생길 때에만 말줄임(`...`)을 적용
    - 드롭다운 메뉴 자체의 가로 폭은 고정하고, hover 시 메뉴가 늘어나지 않도록 옵션 행 내부 텍스트만 축약

## 2026-04-15 UI 표현 보정
- 기본 명칭 정리:
  - Kevin AI 첫 세션 제목을 `새 대화`에서 `대화`로 단순화
  - 기본 저장 탭 이름을 `기본 템플릿`에서 `템플릿`으로 변경
  - 새 탭 추가 시 이름은 `템플릿2`, `템플릿3`처럼 연속 번호 형식으로 생성
- 히트맵 색상 선택 단순화:
  - 지표 테이블/엔티티 테이블의 색상 프리셋을 18개에서 7개로 축소
  - 제공 색상은 `빨강`, `주황`, `노랑`, `초록`, `청록`, `파랑`, `보라`
- 결과 테이블 헤더 정렬 보정:
  - `측정단위`, `지표명` 등 텍스트 컬럼 헤더는 좌측 정렬
  - 스파크라인 컬럼 헤더는 중앙 정렬
  - 주차 값 컬럼 헤더는 우측 정렬
  - 엔티티 테이블의 `측정단위` 헤더는 정렬 아이콘 없이 텍스트 중심으로 표시

## 2026-04-16 측정단위 동기화
- BigQuery source 점검 결과, `data_mart.data_mart_1_social_match`에 기존 앱에서 노출되지 않던 `dimension_type`가 추가된 것을 확인
- 신규 반영 단위:
  - `ai_report_match`
  - `match_grade`
  - `match_level`
  - `match_player_cnt`
  - `match_sex`
  - `plab_stadium`
  - `plaber_match`
  - `yoil`
  - `yoil_group`
- 대응:
  - `bigqueryShared.ts`와 provider 매핑에 신규 단위/엔티티 컬럼 추가
  - `GET /api/measurement-units` 캐시 키를 갱신해 기존 목록 캐시 무효화
  - 측정단위 라벨은 `metric_store_native.korean_name`을 최우선으로 사용하고, 값이 없을 때만 코드 fallback 라벨을 사용
  - 신규 단위는 `legacy weekly_agg`/`weekly_expanded_agg` 대상이 아니므로, 주간 조회에서도 `source query` 경로를 사용하도록 `bigqueryProvider` 분기 보정
  - 이 조치로 새 단위 선택 시 결과 heatmap, 필터 옵션, 드릴다운 후보 확인 경로가 0건으로 비던 문제를 완화

## 2026-04-16 대시보드 레이아웃 미세조정
- 상단 레이아웃 정리:
  - 헤더 외곽 여백을 `top 10px / left-right 15px / bottom 10px` 기준으로 정리
  - 헤더 하단 구분선(`.app-header::after`) 제거
- 검색 영역 간격 보정:
  - 검색 패널 패딩을 `15px 15px 7px`로 조정
  - 기간 row 상단 간격은 `10px`, 측정단위 row는 `padding-top: 0`과 세로 가운데 정렬 기준으로 보정
- 결과 영역 폭/카드 표현 보정:
  - `main-panel`은 고정 폭 대신 `width: 100%` 기준으로 확장되도록 변경
  - 빈 상태 카드와 오류 카드가 좌측에 몰려 보이지 않도록 창 크기에 따라 자연스럽게 늘어나도록 수정
  - 결과 테이블 카드 외곽 테두리는 제거하고 내부 패딩/스크롤 여백만 유지

## 2026-04-16 BigQuery 숫자 시작 지표 조회 보정
- 현상:
  - 월 단위 조회에서 `6인 취소 매치 비율`, `7인 취소 매치 비율`, `8인 취소 매치 비율`, `9인 취소 매치 비율` 같은 지표를 선택하면 BigQuery가 `Syntax error: Expected keyword AS but got "p_cancel_match_rate"`로 실패
- 원인:
  - source query 경로에서 동적 metric column을 SQL identifier로 조립할 때, `6p_cancel_match_rate`처럼 숫자로 시작하는 컬럼명을 백틱 없이 사용
  - BigQuery에서는 숫자로 시작하는 컬럼 identifier를 반드시 백틱으로 감싸야 함
- 조치:
  - `app/lib/analytics/bigqueryProvider.ts`의 identifier sanitizer가 BigQuery용 식별자를 항상 백틱(`\``)으로 감싸도록 수정
  - 이 보정으로 source query / raw data query / 동적 metric struct 조립 경로에서 숫자 시작 metric도 동일하게 안전하게 조회 가능

## 2026-04-16 드릴다운 메뉴 표시 보정
- 현상:
  - 엔티티명 클릭 시 드릴다운 옵션 요청과 렌더링은 동작하지만, 메뉴가 테이블 row/grid 뒤로 가려져 보이지 않는 것처럼 보임
- 원인:
  - 드릴다운 메뉴는 엔티티 셀 내부 `position: absolute`로 렌더링되는데, `data-grid`와 `data-entity`의 overflow clipping 및 stacking context 부족으로 셀 밖 영역이 잘림
- 조치:
  - 확장된 엔티티 셀과 row에 `position`/`z-index`/`overflow: visible`을 부여
  - `data-grid` overflow를 visible로 조정
  - 드릴다운 메뉴 z-index를 상향해 테이블 셀 위에 안정적으로 표시되도록 수정
- 후속 보정:
  - 결과 행이 적어 가로 스크롤바가 바로 아래에 붙는 경우, 메뉴가 스크롤 컨테이너 영역에 다시 가려지는 문제를 확인
  - 드릴다운 메뉴를 테이블 내부 absolute 요소가 아니라 `document.body` 포털 레이어로 렌더링하도록 변경
  - 클릭한 엔티티 셀의 viewport 좌표를 기준으로 `position: fixed` 배치하고, 스크롤/리사이즈 시 위치를 재계산하도록 수정

## 데이터 집계 규칙
- `cnt` 계열: `MAX(value)`
- `rate` 계열: `AVG(value)`
- 집계 그레인: `(week, measure_unit, filter_value, metric_id)`

## 최근 반영 사항 (2026-02)
- `weekly_agg_mv` 재구성:
  - `dimension_type` 기반으로 단위별(`all/area_group/area/stadium_group/stadium`) 집계
  - 기존 `stadium_group/stadium` 누락 이슈 해소
- 지표 처리 확장:
  - 고정 6개 지표에서 벗어나, `metric_store_native`와 원천 컬럼 교집합 기준의 동적 지표 지원
- 조회 효율화:
  - Heatmap API 요청 시 선택 지표만 조회
  - `area/stadium_group/stadium` 대용량 조회 시 PostgREST 1000행 제한으로 누락되던 문제를 페이지네이션(`range`) 조회로 개선
  - 필터 옵션 조회(`GET /api/filter-options`)도 페이지네이션 적용해 옵션 누락 방지
  - 필터 옵션 조회를 원천 테이블 스캔이 아닌 `weekly_agg_mv` 기반으로 전환해 로딩 시간 개선
  - `GET /api/filter-options` 응답에 TTL 캐시(600초) 적용
  - `/api/heatmap`의 지원 지표 목록 조회(`getSupportedMetricIds`)에 TTL 캐시(3600초) 적용
- 운영 안정화:
  - `HEATMAP_ALLOW_BASE_FALLBACK=0`이 아닐 때 원천 fallback 허용(기본 ON)
  - 최신 1~2주 MV 누락 시 원천 집계로 보강
  - `all` 단위에서 `dimension_type='all'` 데이터가 비는 경우 `area` 기반으로 `all` 재구성
- 자동 검증:
  - 전체 지원 지표 대상 원천 vs MV 정합성 검증 스크립트 추가
  - PR마다 GitHub Actions에서 자동 검증
- 검색 UI 개선:
  - 상단 브랜드 아이콘 제거, `KEVIN` 클릭 시 `/`로 이동
  - 검색 박스를 좌측 사이드바에서 상단 배치로 재구성 (`ui_improvement_v5`)
  - 활성 지표 영역 UX 개선:
    - `지표 선택` 버튼 + 활성 지표 칩 + `전체 해제` 흐름으로 정리
    - 활성 지표 칩 클릭 시 비활성(해제)
  - 데이터 결과 테이블 열 너비 마우스 드래그 리사이즈 지원
  - 페이지 전체 가로 스크롤 이슈 수정:
    - 스크롤 범위를 데이터 테이블 컨테이너로 제한(`.table-scroll { overflow-x: auto; }`)
    - 메인 패널 오버플로우 방지(`.main-panel { min-width: 0; }`)
  - 지표 선택 UX 개선:
    - 사이드 패널 방식으로 변경
    - 사이드 패널 상단 검색 기능 추가
    - 카테고리2/3 기반 그룹 표시
    - 카테고리2/3 섹션 간 여백/구분선 강화로 가독성 개선
    - 지표 설명 + 쿼리 복사 버튼 제공
    - `선택완료`/`선택 초기화` 동작 및 선택 0건 시 완료 버튼 비활성
  - 엔티티 테이블 드릴다운/필터 UX 개선:
    - 엔티티 헤더에 드롭다운 필터 메뉴 추가
    - 필터 트리거 아이콘을 표준 필터(funnel) 형태로 변경
    - 엔티티 셀 hover 시 연한 파란색 강조(클릭 가능 상태 명확화)
    - 드릴다운 경로를 `지역그룹(전체) > 지역(고양시)` 형태로 표기
    - 경로의 상위 단계 클릭 시 부모 엔티티 필터를 해제하고 해당 단계 전체 결과로 복귀
  - 데이터 결과 테이블 우상단에 `증감 노출` 체크박스 추가(기본 ON)
  - 추이 스파크라인을 검정색으로 조정하고 회색 점선 추세선 추가
  - 상단 탭 영역(개인 저장 보고서용)은 레이아웃 PoC 후 현재 화면에서 비활성화
    - 추후 재도입 예정 (GA 보고서 탭과 유사한 개념)
  - 상단 헤더/검색 영역 sticky 해제
    - 스크롤 시 데이터 영역 가림 현상을 방지하기 위해 일반 스크롤 레이아웃으로 복귀
  - 데이터 결과 테이블 첫 행 sticky 고정은 현재 비활성화
    - 스크롤/레이아웃 충돌 이슈로 별도 브랜치에서 재설계 예정

## 2026-03-08 운영 이슈 기록
- 증상:
  - 로그인 시 `/login` 반복 진입(루프)
  - 로그인 완료 후 `social-match-dashboard-mvp-two.vercel.app`로 이동
  - 최신 기능 미반영처럼 보이는 혼선
- 원인:
  - Supabase Auth Redirect URL이 `-two` 도메인으로 설정
  - middleware 인증 실패 시 즉시 로그인 리다이렉트
  - canonical 도메인과 보조 도메인 혼용
- 조치:
  - middleware에서 `/api` 제외 및 인증 조회 실패 시 강제 리다이렉트 완화
  - OAuth redirect/callback을 `NEXT_PUBLIC_APP_URL` 기준 canonical URL로 고정
  - `/login?code=...` 유입 시 로그인 페이지에서 코드 교환 처리
  - 헤더에 `build: <commit>` 표시로 배포 버전 식별

## 운영 도메인 원칙
- Canonical 운영 도메인:
  - `https://social-match-dashboard-mvp.vercel.app`
- Supabase Auth URL 설정:
  - Site URL = `https://social-match-dashboard-mvp.vercel.app`
  - Redirect URLs:
    - `https://social-match-dashboard-mvp.vercel.app/auth/callback`
    - `http://localhost:3000/auth/callback`
- `-two` 도메인은 운영 로그인 경로에서 제외(필요 시 Preview 전용)

## 이슈 진단 메모 (2026-02-22)
- 증상:
  - `all`, `area_group`는 정상이나 `area`, `stadium_group`, `stadium`에서 최근값이 0으로 과다 노출
- 진단 결과:
  - DB 원천 부족이 아니라, 대용량 단위에서 API 단건 조회가 `rows=1000, exactCount>>1000`으로 잘리는 현상 확인
  - 예시(최근 8주, 기본 6지표): `area 1000/4228`, `stadium_group 1000/15677`, `stadium 1000/24639`
- 조치:
  - `app/lib/dataQueries.ts`의 heatmap/filter/fallback 조회를 모두 페이지네이션으로 변경

## 실행
1. 의존성 설치
```bash
npm install
```

2. 환경변수 설정 (`.env.local`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (운영: `https://plab-kevin.vercel.app`)
- `ANALYTICS_BACKEND=bigquery`
- `BIGQUERY_PROJECT_ID=plabfootball-51bf5`
- `BIGQUERY_LOCATION=asia-northeast3`
- `BIGQUERY_DATASET_SOURCE_DATA_MART=data_mart`
- `BIGQUERY_DATASET_SOURCE_GOOGLESHEETS=googlesheets`
- `BIGQUERY_DATASET_SERVING=kevin_serving`

3. 개발 실행
```bash
npm run dev
```

## 데이터 검증
- 로컬 전체 지표 검증
```bash
npm run data:validate-mv
```

- 로컬 최신 주차 헬스체크(경량)
```bash
npm run data:validate-recent-refresh
```

- PR 자동 검증
  - 워크플로: `.github/workflows/data-validation.yml`
  - 필요한 GitHub Secrets:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`

- 주간 MV 자동 재생성/검증
  - 워크플로: `.github/workflows/weekly-mv-rebuild.yml`
  - 스케줄: 매주 화요일 10:00 KST (UTC `0 1 * * 2`)
  - 실행 SQL: `supabase/sql/refresh_weekly_agg_mv.sql`
  - 헬스체크 SQL: `supabase/sql/validate_recent_refresh.sql`
  - 필요한 GitHub Secrets:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_DB_URI`

- BigQuery serving 자동 재생성/검증
  - 워크플로: `.github/workflows/bigquery-serving-rebuild.yml`
  - 스케줄: 매일 08:30 KST (UTC `30 23 * * *`)
  - 실행:
    - `npm run bq:build-serving`
    - `npm run bq:validate-serving`
  - 재생성 대상:
    - `kevin_serving.entity_hierarchy`
    - `kevin_serving.weekly_agg`
    - `kevin_serving.weekly_expanded_agg`
  - 참고:
    - `kevin_serving.weeks_view`는 source를 바라보는 `VIEW`
    - source 예약 쿼리 반영이 지연되거나 수동 반영이 늦어진 날은, 08:30 KST rebuild에 포함되지 않을 수 있으며 다음날 스케줄에서 반영
  - 필요한 GitHub Secrets:
    - `BIGQUERY_SERVICE_ACCOUNT_JSON_BASE64`

## 2026-03-12 운영 메모 (MV 자동복구)
- 오늘 확인한 흐름:
  - Airbyte 주간 overwrite 이후 `weekly_agg_mv` 기반 조회 누락 가능성 확인
  - 주간 자동 복구 워크플로(`Weekly MV Rebuild`)를 main에 반영
  - 재생성 SQL + 최신 3주 헬스체크 스크립트 연결
- 오늘 발생한 오류/조치:
  - 초기: GitHub Actions에서 Direct DB 접속 시 `Network is unreachable` (IPv6 경로)
  - 조치: 워크플로를 `SUPABASE_DB_URI` 기반 접속으로 변경
  - PostgREST 기반 헬스체크는 GitHub Actions 환경에서 대용량 단위(`stadium_group`) count 조회 시 비어 있는 에러 payload로 실패할 수 있어, 워크플로 검증 경로를 DB 직결 SQL(`supabase/sql/validate_recent_refresh.sql`)로 전환
  - SQL 헬스체크 1차 적용 시 `DO $$` 블록 내부의 `psql` 변수 치환 문제로 문법 오류가 발생했고, temp summary table 재사용 방식으로 수정
  - `scripts/validate-recent-refresh.mjs`는 로컬/수동 진단용으로 유지하고, query context(`week/unit/metric/queryType`)와 Supabase error payload(`code/details/hint/message`)를 함께 출력하도록 보강
  - `Weekly MV Rebuild #11` 수동 재실행 결과 `rebuild-and-validate` 전체 성공 확인
  - 로컬에서도 `npm run data:validate-recent-refresh`, `npm run data:validate-mv`(최근 3주, 전체 지원 지표) 재검증 통과
- 운영 확인 결과:
  - 배포 UI에서 최근 3주 데이터는 일부 빈 값이 남아 있음
  - 원인 분석 결과, MV/헬스체크 실패가 아니라 최신 주차 `26.03.09 - 03.15` 원천 적재가 진행 중인 상태로 판단
  - `all` 기준 완료 주차 `26.03.02 - 03.08`은 41개 지표가 존재하지만, `26.03.09 - 03.15`는 32개 지표만 존재
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
- 2026-03-12 추가 점검:
  - Airbyte를 통해 Supabase 원천이 다시 최신화된 직후, PostgREST에서 `bigquery.weeks_view`를 찾지 못하는 `PGRST205`가 재발
  - 후속 확인에서 GitHub Actions `Weekly MV Rebuild #12`가 `relation "bigquery.weeks_view" does not exist`로 실패해, schema cache뿐 아니라 view 오브젝트 자체 복구가 필요함을 확인
  - 대응으로 MV 재생성 SQL(`supabase/sql/refresh_weekly_agg_mv.sql`)과 신규 migration에 `bigquery.weeks_view` 재생성 + `notify pgrst, 'reload schema'`를 포함
  - 로컬 드릴다운 점검 중 `stadium_group` 이하 부모-자식 조회가 원천 테이블 full scan으로 timeout되어, `entity_hierarchy_mv`를 추가해 부모-자식 옵션/드릴다운 조회를 MV + 계층 MV 조합으로 전환
  - `/api/weeks`는 `weeks_view` timeout을 피하기 위해 `weekly_agg_mv` 기준 recent week 수집 방식으로 변경
  - `/api/heatmap`은 `all` 단위의 불필요한 fallback을 제거하고, 드릴다운 시 child entity를 chunk 단위로 조회하도록 조정해 `area_group -> area`, `area -> stadium_group` 드릴다운 timeout을 완화
  - `data_improvement_260312_01` 브랜치 기준 워크플로 재실행/배포 후 기본 조회와 드릴다운 조회가 정상 동작하는 것 확인
  - 로컬 DB 자격증명으로는 원격 `db push` 인증이 실패해, 실제 원격 반영은 GitHub Actions 또는 올바른 `SUPABASE_DB_URI`/DB password 기준으로 별도 실행 필요
- 다음 TODO:
  - 진행 중 주차를 기본 조회에서 제외할지, `집계 진행 중` 상태로 노출할지 정책 결정
  - 다음 수동/정기 실행에서 DB 직결 헬스체크와 annotation 경고 제거 여부 확인
  - `SUPABASE_DB_URI` 운영값 점검:
    - pooler URI 사용 여부, 비밀번호 인코딩, `sslmode` 포함 여부 재확인

## 2026-03-14 측정단위 확장 반영
- 측정단위 목록:
  - 검색박스 `측정단위`는 고정 4개가 아니라 `dimension_type`/`metric_store_native` 기반 동적 목록으로 전환
  - 신규 API: `GET /api/measurement-units`
  - 현재 노출 단위:
    - `all`
    - `area_group`, `area`, `stadium_group`, `stadium`
    - `area_group_and_time`, `area_and_time`
    - `stadium_group_and_time`, `stadium_and_time`
    - `time`, `hour`
    - `yoil_and_hour`, `yoil_group_and_hour`
- 드릴다운 UX:
  - 엔티티 셀 전체 클릭 시 드릴다운 메뉴 노출
  - 드릴다운 메뉴는 엔티티 헤더 필터와 동일한 드롭다운 리스트 UI 사용
  - 리스트 항목 선택 즉시 드릴다운 실행
  - `_and_` 단위는 사용자에게 직접 강제하지 않고, 부모/대상 단위 조합에 맞는 실제 조회 그레인으로 내부 매핑
  - 예시:
    - `time -> area_group` 조회는 내부적으로 `area_group_and_time` 원천 그레인 사용
    - `time -> area` 조회는 내부적으로 `area_and_time` 원천 그레인 사용
- 조회 경로:
  - 기존 legacy 단위(`all/area_group/area/stadium_group/stadium`)는 계속 `weekly_agg_mv` 우선 사용
  - 확장 단위는 원격 DB 자원 한계로 `weekly_agg_mv` 확장을 운영에 적용하지 않고, 최근 선택 주차 범위 기준 원천 테이블 직접 조회로 처리
  - 필터 옵션도 확장 단위는 선택된 최근 주차 범위 기준으로 원천 조회
- 원격 DB 반영:
  - 적용 완료 migration:
    - `supabase/migrations/202603140003_add_indexes_for_expanded_dimension_queries.sql`
  - 목적:
    - `dimension_type + week + entity columns` 패턴의 확장 단위 조회 성능 개선
  - 참고:
    - `weekly_agg_mv`를 확장 단위까지 직접 재생성하는 시도는 원격 DB에서 temp disk 부족(`No space left on device`)으로 운영 반영 보류
- 로컬 확인 기준:
  - `time` 필터 옵션 약 1초대
  - `area_and_time` 필터 옵션/heatmap 약 4~5초대
  - `npm run build` 통과

## 2026-03-18 확장 단위 성능/드릴다운 안정화
- 측정단위 라벨 변경:
  - `stadium_group` 표시명 `구장그룹` -> `구장`
  - `stadium` 표시명 `구장` -> `면`
  - 복합 단위도 동일 규칙 반영:
    - `stadium_group_and_time` -> `구장 타임`
    - `stadium_and_time` -> `면 타임`
- 측정단위 노출 정리:
  - 원천 데이터에서 제거된 `yoil_and_hour`, `yoil_group_and_hour`는 검색 옵션 `측정단위` 목록에서 제외
  - `GET /api/measurement-units` 캐시 키를 갱신해 기존 목록 캐시도 즉시 무효화
- 확장 단위 집계 경로 재구성:
  - 원격 DB에 최근 24주 기준 `bigquery.weekly_expanded_agg_mv` 추가
  - 파일:
    - `supabase/migrations/202603180001_add_weekly_expanded_agg_mv.sql`
    - `supabase/migrations/202603180002_enrich_weekly_expanded_agg_mv_parent_dimensions.sql`
  - 목적:
    - `area_group_and_time`, `area_and_time`, `stadium_group_and_time`, `stadium_and_time`, `time`, `hour`, `yoil_*` 조회를 raw source fallback 대신 recent MV 우선 경로로 전환
  - parent drilldown 대응:
    - `entity_hierarchy_mv`를 활용해 `stadium_group_and_time`, `stadium_and_time`, `area_and_time` row에도 상위 지역 축(`area_group`, `area`, `stadium_group`)을 보강
    - `measure_unit + metric_id + week + parent columns` 복합 인덱스 추가
- API/프론트 보강:
  - `GET /api/drilldown-options` 추가:
    - 엔티티 클릭 시 실제 데이터가 있는 드릴다운 단위만 단일 요청으로 조회
  - `/api/filter-options` 캐시 키에 `week/parent context` 포함
  - `/api/weeks`의 `unstable_cache` 제거:
    - Airbyte 화요일 적재 후 최신 주차(`26.03.16 - 03.22`) 노출 지연 방지
  - 클라이언트 드릴다운 옵션 캐시는 현재 parent/filter/week context까지 포함하도록 보강
- 2026-03-18 기준 확인:
  - source 최신 `_airbyte_extracted_at`: `2026-03-17T00:07:11.295+00:00`
  - `npm run data:validate-recent-refresh` 기준 최신 3주(`26.03.16 - 03.22` 포함) 정상
  - 로컬 API 재현:
    - `area_group_and_time` 12주 heatmap: 약 0.4~0.7초
    - 같은 조건 filter options: 약 0.02~0.15초
    - 같은 조건 drilldown options: 약 0.03~0.22초
  - 특정 조합(예: `area_group_and_time=경기 | A 평일 비프라임(-17)` -> `stadium_group_and_time`)은 timeout이 아니라 실제 `0 rows` 조합으로 정리되었고, 드릴다운 옵션 노출은 서버 재기동/새로고침 후 최신 결과 기준으로 동작

## 2026-03-31 운영 점검 (주간 MV 재생성/최신 주차 노출)
- 주간 MV 재생성 실패 원인:
  - GitHub Actions `Weekly MV Rebuild`가 `2026-03-24`, `2026-03-31` 두 차례 연속 실패
  - 직접 원격 DB 실행으로 확인한 결과, `refresh_weekly_agg_mv.sql`에서 `entity_hierarchy_mv`를 먼저 drop하고 있었고, 이 시점에 `weekly_expanded_agg_mv`가 해당 MV를 참조 중이라 재생성이 즉시 중단됨
  - 원격 DB `statement_timeout=2min`도 존재해, 재생성 시간이 긴 상황에서 실패 위험을 더 키우고 있었음
- 조치:
  - `refresh_weekly_agg_mv.sql`에서 `weekly_expanded_agg_mv`/type을 먼저 drop하도록 순서 수정
  - 재생성 SQL 시작/종료에 `set statement_timeout = 0` / `reset statement_timeout` 추가
  - `.github/workflows/weekly-mv-rebuild.yml` 재생성 step에 `PGOPTIONS="-c statement_timeout=0"` 추가
  - 이미 retired된 `yoil_and_hour`, `yoil_group_and_hour` rebuild/index 로직 제거
- 검증:
  - 원격 DB에서 재생성 SQL 수동 실행 성공
  - 실제 재생성 소요 시간은 약 19분
  - `supabase/sql/validate_recent_refresh.sql` 기준 최근 3주(`26.03.16 - 03.22`, `26.03.23 - 03.29`, `26.03.30 - 04.05`) 정상
- `/api/weeks` 최신 주차 누락 수정:
  - 증상:
    - 로컬에서 최근 8주 조회 시 최신 2주(`26.03.23 - 03.29`, `26.03.30 - 04.05`)가 빠지고 `26.03.16 - 03.22`까지만 노출
  - 원인:
    - 주차 목록을 `weekly_agg_mv`의 전체 `all` 행에서 가져오면서, 주차당 다수 metric row(83행) 기준 정렬/페이지네이션이 섞여 최신 주차가 누락됨
  - 조치:
    - `getWeeksData()`는 `measure_unit='all'`, `filter_value='전체'`, `metric_id='total_match_cnt'` 기준 1행/주만 조회하도록 수정
  - 결과:
    - `/api/weeks?n=8`이 최신 8주를 안정적으로 반환

## Supabase 배포 워크플로
- 마이그레이션: `supabase/migrations/202602210001_weekly_agg_mv_v2.sql`
- 마이그레이션: `supabase/migrations/202602220001_weekly_agg_mv_filter_options_idx.sql`
- 빠른 실행 가이드: `SUPABASE_CLI_WORKFLOW.md`
- 수동 MV 재생성:
```bash
npm run sb:refresh-mv
```

## 참고 문서
- 요구사항/운영 기준: `PRD.md`
- 성능/SQL 참고: `PERF_OPTIMIZATION.md`
- BigQuery 직접 조회 전환 계획: `BIGQUERY_MIGRATION_PLAN.md`
- BigQuery 전환 Phase 0 정리: `BIGQUERY_PHASE0_DISCOVERY.md`
- 유지해야 할 분석 API 계약: `ANALYTICS_API_CONTRACT.md`
- BigQuery serving SQL 초안: `BIGQUERY_SERVING_SQL_DRAFT.md`
- analytics provider 분리 초안: `ANALYTICS_PROVIDER_INTERFACE.md`
