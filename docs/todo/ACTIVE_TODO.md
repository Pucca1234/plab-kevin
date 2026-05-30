# 현재 TODO

## 즉시 처리할 항목

### FIL-004
- Status: `pending`
- Source: 2026-05-31 필터 cascade 버그 수정 중 발견
- Why: 측정단위 '구장' > 구장그룹 '서울' 선택 후 '부산' 추가 시, 구장 필터에 부산 지역이 해운대구만 노출됨. 코드 레벨 cascade 로직은 정상(activeFilter=stadium_group:[서울,부산]으로 올바르게 요청). 데이터 이슈로 추정.
- Next action: BigQuery에서 `kevin_serving.weekly_agg`(또는 source 테이블)에서 `stadium_group='부산'`에 해당하는 stadium 값 목록 조회해 실제로 해운대구만 존재하는지 확인.
- References:
  - `app/api/filter-options-batch/route.ts` (API 호출 파라미터 검증)
  - BigQuery: `kevin_serving.weekly_agg` or `data_mart_1_social_match`

## 이번 작업에서 완료한 항목

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
