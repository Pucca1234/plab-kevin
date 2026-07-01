# 현재 TODO

## 즉시 처리할 항목

### OPS-001
- Status: `todo`
- Source: 2026-06-02 운영 점검
- Why: `app/lib/analytics/provider.ts`의 기본값이 `supabase`로 설정되어 있습니다. Vercel에 `ANALYTICS_BACKEND=bigquery`가 빠질 경우 Supabase fallback으로 조용히 전환되며 알아채기 어렵습니다.
- Next action: Vercel 환경변수 목록에서 `ANALYTICS_BACKEND=bigquery` 설정 여부를 확인하고, 미설정 시 등록합니다.
- References:
  - `app/lib/analytics/provider.ts`


## 이번 작업에서 완료한 항목

### UX-260701-001
- Status: `done`
- Source: 2026-07-01 사용자 요청
- Why: 좌우 스크롤 시 하단 fixed 버튼(Error Log 좌하단, Kevin AI 우하단)이 테이블 데이터를 가리는 이슈. 이전 작업(padding-bottom 100px)은 상하 스크롤만 해결.
- What:
  - Kevin AI: fixed 토글 버튼 제거 → ControlBar 상단에 채팅 말풍선 버튼으로 이동 (검색 버튼 바로 왼쪽)
  - Error Log: fixed 토글 버튼 제거 → `Shift+Alt+E` 단축키 이스터에그로만 진입
- References:
  - `app/components/AiChat.tsx`
  - `app/components/ErrorLogPanel.tsx`
  - `app/components/ControlBar.tsx`
  - `app/page.tsx`
  - `app/globals.css`



### UX-260624-001
- Status: `done`
- Source: 2026-06-24 사용자 요청
- Why: 하단 고정 버튼(Error Log, Kevin AI)이 테이블 스크롤 끝에서 마지막 행을 가림.
- What: `.table-scroll` `padding-bottom` 6px → 100px 변경.
- References:
  - `app/globals.css`

### UX-260624-002
- Status: `done`
- Source: 2026-06-24 사용자 요청
- Why: 새 탭 생성 시 이전 탭 설정이 잔상으로 남아 저장 안 된 상태에서 다른 탭 이동 시 초기화되는 문제. 기존 설정을 유지한 채 새 템플릿을 만들 수 없어 매번 처음부터 설정해야 하는 불편함.
- What:
  - 새 빈 탭(+) 생성 시 화면 state 즉시 초기화(잔상 제거)
  - 우측 액션 버튼 영역에 복제 버튼 추가 (모든 탭에서 표시)
  - 복제 시 현재 탭 설정 전체를 복사한 새 템플릿 생성, 이름은 "[원본이름] 복사본" 자동 설정
- References:
  - `app/page.tsx`
  - `app/components/ControlBar.tsx`



### OPS-260602-001
- Status: `done`
- Source: 2026-06-02 운영 점검
- Why: GitHub Actions cron `30 23 * * *`(의도 08:30 KST)이 실제로는 ~10:30 KST에 실행됐음. 14일 실행 이력 분석 결과 GitHub Actions 지연이 1h51m~2h07m(편차 16분)으로 안정적임을 확인.
- What: cron을 `0 22 * * *`으로 변경 → 실제 실행 ~09:00 KST, source 갱신(~07:40 KST) 대비 최소 1h11m 버퍼 확보.
- References:
  - `.github/workflows/bigquery-serving-rebuild.yml`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### OPS-260602-002
- Status: `done`
- Source: 2026-06-02 운영 점검
- Why: Data Validation / Weekly MV Rebuild 워크플로우가 실패 메일을 발송했음. Supabase 시크릿 미등록으로 한 번도 실제 작동한 적 없음. 분석 백엔드가 BigQuery로 전환된 이후 Supabase MV 관련 워크플로우의 실효성이 없음 (Vercel 프로덕션 `ANALYTICS_BACKEND=bigquery` 직접 확인).
- What:
  - `data-validation.yml` PR 자동 트리거 제거
  - `weekly-mv-rebuild.yml` 스케줄 트리거 제거 (첫 실행 2026-04-07부터 9회 전부 실패)
  - 두 파일 모두 비활성화 이유 주석 보존, 재활성화 방법 명시
- References:
  - `.github/workflows/data-validation.yml`
  - `.github/workflows/weekly-mv-rebuild.yml`

### OPS-260602-003
- Status: `done`
- Source: 2026-06-02 신규 지표 반영 요청
- Why: `metric_store_native`에 신규 지표 12개(등록일 2026-06-01)가 추가됐으나 오늘 아침 자동 빌드에 미반영 상태.
- What: 수동 `workflow_dispatch`로 즉시 반영. 빌드 지표 수 122개 → 134개(+12) 확인.
- References:
  - `scripts/bigquery/build-serving-layer.mjs`
  - `.github/workflows/bigquery-serving-rebuild.yml`

### FIL-001
- Status: `done`
- Source: 2026-05-30 필터 UX 개선 작업
- Why: 필터 선택 변경 시 이전 데이터 쿼리를 취소하지 않아 요청이 중첩 실행되고, 결과가 덮어씌워지는 문제가 있습니다.
- Spec:
  - 필터 선택 변경 시 이전 heatmap/raw-data 요청 즉시 `AbortController.abort()` 후 새 요청 시작
  - 스냅샷 옵션 로딩에도 동일한 AbortController 패턴 적용
  - 마지막 요청만 유효하며, 결과 도착 순서에 관계없이 최신 요청의 결과만 반영
- References:
  - `app/page.tsx` (runSearch, abortRef, handleFilterChange)

### FIL-002
- Status: `done`
- Source: 2026-05-30 필터 UX 개선 작업
- Why: 필터 선택값 변경 시 옵션 배치 재조회가 즉시 실행되어 불필요한 로딩이 반복되고, 로딩 중 선택값이 의도치 않게 초기화됩니다.
- Spec:
  - 드롭다운 내부에서는 staged state만 변경, 닫을 때만 commit
  - 전체 해제 후 드롭다운 닫으면 → entry state로 revert, API 없음
  - 1개 이상 선택 후 드롭다운 닫으면 → onChange 호출하여 커밋
  - loadFilters deps에서 filterSelectionsByUnit 제거 → 선택값 변경만으로 재로드 없음
- References:
  - `app/page.tsx` (loadFilters effect deps)
  - `app/components/MultiSelectDropdown.tsx` (staged state, closeMenu)

### FIL-003
- Status: `done`
- Source: 2026-05-30 필터 UX 개선 작업 (2026-05-31 버그 수정 완료)
- Why: 양방향 cascade로 인한 필터 옵션 오염 + 기간↔측정단위 필터 cross-influence 문제
- **최종 구현 스펙 (2026-05-31 기준)**:
  - 기간 필터 그룹(year/quarter/month/week/day), 측정단위 필터 그룹 각각 독립 cascade
  - cascade 방향: downstream(idx > committedIndex) = 옵션+선택 모두 업데이트, upstream = 선택만 업데이트
  - cross-group 격리: `committedIsPeriod !== targetIsPeriod` → cascade 대상 제외, active params 제외
  - abort 격리: `periodCascadeAbortRef` + `entityCascadeAbortRef` 별도 관리 (기간↔측정단위 cascade가 서로를 abort하지 않음)
  - **선택값 병합 알고리즘**:
    - `addedValues = newCommittedSelection - filterSelectionsByUnit[committedUnit]` (delta)
    - `addedValues.length > 0` 이고 downstream 존재 시 → extra API call (병렬) with `activeFilter=committedUnit:[addedValues]`
    - `신규항목 = extra API 결과 ∩ mainAPI 결과` (실제로 추가된 값으로 인해 생긴 옵션만)
    - `validPrevSelection = prevSelection ∩ newOptions`
    - `merged = validPrevSelection + 신규항목`; 빈 경우 전체선택 fallback
  - "이 값만 조회하기" → downstream 전체선택 (mode="single-only")
  - 초기 로드: `loadFilters` 1회, cascade는 사용자 commit 이후부터만 동작
- References:
  - `app/page.tsx` (`reloadDownstreamFilters`, `periodCascadeAbortRef`, `entityCascadeAbortRef`)
  - `app/components/MultiSelectDropdown.tsx` (staged state, `applyOnlyValue`, `onChange` type)
  - `app/components/ControlBar.tsx` (`onFilterChange` type)

### DOC-010
- Status: `done`
- Source: 2026-05-28 신규 지표 미노출 이슈 조사
- Why: BigQuery 확인 결과 `metric_store_native`와 `data_mart_1_social_match`에는 존재하지만 `kevin_serving.weekly_agg`/`weekly_expanded_agg`에는 없는 지표가 확인됐고, 현재 `bq:validate-serving`은 `manager_match_cnt`만 검증해서 이런 누락을 잡지 못합니다.
- Next action: 신규 자동화 구조 설계는 `DOC-011`에서 이어갑니다.
- References:
  - `scripts/bigquery/build-serving-layer.mjs`
  - `scripts/bigquery/validate-serving-layer.mjs`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-002
- Status: `done`
- References:
  - `docs/SYSTEM_MAP.md`
  - `docs/feature-prds/AUTH_AND_ACCESS_PRD.md`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-004
- Status: `done`
- References:
  - `README.md`
  - `PRD.md`
  - `레거시_README.md`
  - `레거시_PRD.md`

### DOC-005
- Status: `done`
- References:
  - `README.md`
  - `PRD.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_RULES.md`

### DOC-001
- Status: `done`
- References:
  - `레거시_README.md`
  - `레거시_PRD.md`
  - `README.md`
  - `PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-006
- Status: `done`
- References:
  - `docs/MASTER_PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`

### DOC-007
- Status: `done`
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`

### DOC-008
- Status: `done`
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`
