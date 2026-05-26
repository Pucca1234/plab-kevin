# 필터 및 검색 PRD

## 목적
상단 검색 컨트롤, 동적 필터 계산, 결과 재조회 트리거의 동작을 정의합니다.

## 사용자 목표
사용자는 시간 축, 집계 단위, 지표, 필터를 선택하고 그 조건이 정확히 반영된 결과를 안정적으로 받아야 합니다.

## 구현 진입점
- `app/page.tsx`
- `app/components/ControlBar.tsx`
- `app/components/MultiSelectDropdown.tsx`
- `app/api/filter-units/route.ts`
- `app/api/filter-options/route.ts`
- `app/api/filter-options-batch/route.ts`
- `app/api/period-filter-units/route.ts`

## 상태 모델
- `periodUnit`
- `periodRangeValue`
- `measurementUnit`
- `selectedMetricIds`
- `filterUnitOptions`
- `filterOptionsByUnit`
- `filterSelectionsByUnit`
- `autoSearchPending`
- `isLoadingFilter`

## 현재 동작
### 검색 영역 구성
- 1행: 기간단위, 기간범위, 기간 필터
- 2행: 측정단위, 측정단위 기반 필터, 액션 버튼

### 기간 preset
- `year`: `all`, `recent_3`, `recent_5`
- `quarter`: `all`, `recent_4`, `recent_8`, `recent_12`
- `month`: `all`, `recent_6`, `recent_12`, `recent_24`
- `week`: `all`, `recent_8`, `recent_12`, `recent_24`
- `day`: `all`, `recent_7`, `recent_30`, `recent_90`

### 동적 필터 로딩
- 기간 필터 축은 현재 `periodUnit`에 따라 달라집니다.
- 엔티티 필터 축은 현재 `measurementUnit`, 부모 컨텍스트, 데이터 존재 여부, 기간 범위를 기준으로 달라집니다.
- 여러 필터 옵션은 `/api/filter-options-batch`로 한 번에 계산합니다.
- 특정 필터 축의 후보를 계산할 때는 그 필터 축 자신의 active condition을 제외합니다.

### 선택 의미
- 최초 로드 시 각 필터 축은 사용 가능한 전체 값을 선택한 상태로 시작합니다.
- 선택값이 비어 있으면 결과 없음으로 처리합니다.
- 현재 가능한 값을 전부 선택한 상태는 제한 없음으로 처리하며, 실제 좁힘 조건으로 보내지 않습니다.
- 다른 필터 때문에 후보값이 줄어들어도 선택 상태를 임의로 초기화하지 않고 값 기준으로 유지합니다.

### 조회 실행
- 조회는 다음 조건을 함께 사용해야 합니다.
  - 현재 필터에서 계산된 표시 대상 기간
  - 선택한 지표
  - 엔티티/기간 필터의 교집합
  - 존재할 경우 현재 드릴다운 컨텍스트
- 자동 재조회는 필터 로딩 완료 자체가 아니라 실제 사용자 입력 변화에 의해 실행되어야 합니다.

## 관련 API
### `GET /api/weeks`
- 기간 목록과 기간 메타데이터 로딩에 사용

### `GET /api/filter-units`
- 현재 측정단위에서 사용할 수 있는 엔티티 필터 축 탐색

### `GET /api/period-filter-units`
- 현재 기간단위에서 사용할 수 있는 기간 필터 축 탐색

### `GET /api/filter-options-batch`
- 여러 필터 축의 옵션 목록을 한 번에 계산

## 예외 케이스
- `measureUnit=all`이어도 기간 필터는 정상 동작해야 합니다.
- source-only 필터 축이 포함되면 backend provider는 source-query 경로를 사용해야 합니다.
- 자동 재조회가 더 최신 검색 결과를 덮어쓰면 안 됩니다.
- 드릴다운 상태에서 필터 변경이 일어나도 현재 depth를 유지해야 합니다.

## 검증 항목
- `periodUnit` 변경 시 해당 축에 맞는 기간 필터들만 노출되는지 확인
- source-only 또는 확장 측정단위 선택 시 필터 옵션이 정상 로드되는지 확인
- 한 필터를 선택했을 때 다른 필터 후보는 좁혀지되 자기 자신의 선택이 초기화되지 않는지 확인
- 0개 선택 상태에서 결과가 빈 상태로 처리되는지 확인
- 결과가 이미 표시된 후 필터를 바꾸면 자동 재조회가 정확히 1회만 실행되는지 확인

## 변경 이력
- 2026-04-15: 동적 병렬 엔티티 필터와 `filterSelections` 모델 도입
- 2026-04-15: `filter-options-batch` 도입 및 cascade 로딩 보정
- 2026-05-06: 필터 로딩 완료와 자동 재조회 트리거 분리
- 2026-05-10: 필터 자동 재조회와 기간 필터 반영 복구
- 2026-05-19: 후보 계산 시 현재 필터 축의 active condition 제외
