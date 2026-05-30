# 현재 TODO

## 즉시 처리할 항목

없음

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
- Source: 2026-05-30 필터 UX 개선 작업
- Why: 현재 양방향 cascade로 인해 이전 필터의 옵션이 이후 필터에 의해 좁혀지며, 원래 목록을 다시 볼 수 없는 문제가 있습니다.
- Spec:
  - **단방향 cascade**: upstream 필터 변경 시 downstream 스냅샷만 재계산, 선택값은 병합 알고리즘으로 보존
  - **선택값 병합 알고리즘**:
    - `신규항목 = 새 스냅샷 - 이전 스냅샷` → 자동 선택
    - `유효한_이전선택 = 이전 선택 ∩ 새 스냅샷` → 선택 유지
    - `최종 선택 = 유효한_이전선택 + 신규항목`; [] 이면 전체 선택 fallback
  - "이 값만 조회하기" → downstream 전체 선택 (mode="single-only")
- Implementation note: downstream 감지는 UI 순서 기반 인덱스(`[...periodFilterUnitOptions, ...filterUnitOptions]`)로 결정. committedUnit 이후에 위치한 필터만 downstream으로 간주 (단방향 보장). 초기 context 추적 방식(`filterSnapshotContextByUnit`)은 전체 선택 시 empty context 문제로 제거.
- References:
  - `app/page.tsx` (reloadDownstreamFilters, handleFilterChange)
  - `app/components/MultiSelectDropdown.tsx` (applyOnlyValue, onChange type)
  - `app/components/ControlBar.tsx` (onFilterChange type)

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
