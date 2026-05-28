# 템플릿 및 사용자 설정 PRD

## 목적
저장된 대시보드 설정이 어떻게 생성, 수정, 정렬, 복원되는지 정의하고, 검색 상태와 어떤 경계로 연결되는지 설명합니다.

## 구현 진입점
- `app/page.tsx`
- `app/components/ControlBar.tsx`
- `app/api/filter-templates/route.ts`
- `app/api/filter-templates/[id]/route.ts`
- `app/api/user-preferences/route.ts`

## 상태 모델
- `templates`
- `activeTemplateId`
- `defaultTabConfig`
- `defaultTabName`
- `FilterTemplate.config`

## 이 문서가 책임지는 범위
- 기본 탭과 저장 템플릿의 개념 차이를 정의합니다.
- 어떤 검색 상태가 저장 대상인지 정의합니다.
- 템플릿 생성, 수정, 삭제, 기본 지정, 기본 탭 이름 저장 규칙을 정의합니다.
- 템플릿이나 기본 탭을 적용할 때 어떤 상태가 복원되고 어떤 상태가 초기화되는지 정의합니다.

## 이 문서가 직접 책임지지 않는 범위
- 필터 축 계산 방식과 옵션 로딩 규칙
- 자동 재조회의 일반 정책
- 엔티티 드릴다운 후보 계산과 breadcrumb 규칙
- 기간 드릴다운 depth 이동 규칙

위 항목은 각각 `FILTER_AND_SEARCH_PRD.md`, `DRILLDOWN_PRD.md`에서 정의합니다. 다만 템플릿 문서는 “저장된 설정을 적용할 때 드릴다운 같은 transient 상태를 어떻게 정리하는가”까지는 다룹니다.

## 데이터 모델
### 저장 템플릿
- `id`
- `user_id`
- `name`
- `config`
- `is_shared`
- `is_default`

### 기본 탭 사용자 설정
- `default_tab_config`
- `default_tab_name`

### 현재 `config`에 포함되는 주요 값
- `periodUnit`
- `periodRangeValue`
- `measurementUnit`
- `filterSelections`
- `selectedMetricIds`
- `heatmapColorMap`
- `hiddenDeltaMetricIds`

저장 설정에는 드릴다운 breadcrumb, 현재 부모 엔티티, pending drilldown 같은 일시 상태를 포함하지 않습니다.

## 현재 동작
### 탭
- 기본 탭과 저장 템플릿 탭은 별도 개념입니다.
- 기본 탭은 `activeTemplateId=null` 상태를 의미합니다.
- 기본 탭 이름은 사용자 환경설정으로 저장됩니다.
- 저장 템플릿은 이름 변경, 삭제, 기본 템플릿 지정이 가능합니다.
- 사용자가 새 빈 탭을 만들면 저장 템플릿이 하나 생성되고, 탭 목록의 가장 오른쪽에 추가됩니다.

### 정렬
- 템플릿 API는 `created_at asc` 기준으로 반환합니다.
- 새 템플릿은 탭 목록의 가장 오른쪽에 추가되어야 합니다.

### 저장 및 복원
- 템플릿 읽기/쓰기는 인증된 사용자만 가능합니다.
- shared 템플릿은 본인 템플릿과 함께 보입니다.
- 저장 템플릿의 기본 지정은 사용자별로 하나만 유지되어야 합니다.
- 기본 탭 설정은 별도 `user_preferences` 레코드에 저장되며, 저장 템플릿의 기본 지정과는 다른 계층입니다.

### 초기 로드 우선순위
- 초기 진입 시 저장 템플릿 목록과 사용자 기본 탭 설정을 함께 불러옵니다.
- 사용자 기본 템플릿이 있으면 그 템플릿 설정을 우선 적용합니다.
- 기본 템플릿이 없고 `default_tab_config`가 있으면 기본 탭 설정을 적용합니다.
- 둘 다 없으면 코드 기본값(`week`, `recent_8`, `all`)에서 시작합니다.

### 저장 대상 상태
- 다음 상태는 템플릿 또는 기본 탭 설정으로 저장됩니다.
  - `periodUnit`
  - `periodRangeValue`
  - `measurementUnit`
  - `filterSelections`
  - `selectedMetricIds`
  - `heatmapColorMap`
  - `hiddenDeltaMetricIds`
- 저장 시 기존 단일 `filterValue` 필드는 신규 상태 저장에 사용하지 않고, 호환성 복원용으로만 남습니다.

### 적용 시 복원되는 상태
- 저장된 `periodUnit`, `periodRangeValue`, `measurementUnit`을 복원합니다.
- 저장된 `filterSelections`를 복원합니다.
- 저장된 `selectedMetricIds`, heatmap 표시 설정, delta 숨김 설정을 복원합니다.
- 구버전 템플릿만 존재하면 `filterValue`를 현재 `measurementUnit` 기준 `filterSelections`로 변환해 복원합니다.

### 적용 시 초기화되는 상태
- 저장 템플릿 적용과 기본 탭 적용은 모두 현재 드릴다운 상태를 초기화해야 합니다.
  - `periodDrilldownHistory`
  - `drilldownParent`
  - `appliedDrilldownHistory`
  - `pendingDrilldown`
- 엔티티 단일 선택 UI 값은 `ALL`로 되돌립니다.
- 저장 템플릿 적용 시 `activeTemplateId`는 해당 템플릿 ID가 됩니다.
- 기본 탭 적용 시 `activeTemplateId`는 `null`이어야 합니다.

### 검색 상태 모델과의 연결
- 템플릿은 “어떤 검색 상태를 저장하고 복원할지”를 정의합니다.
- 템플릿 적용 직후 실제 재조회 예약은 별도 동작입니다.
- 저장 템플릿 탭 클릭과 기본 탭 적용은 `setAutoSearchPending(true)`로 후속 재조회를 예약합니다.
- 반면 내부 복원 함수 자체는 조회를 직접 실행하지 않고 상태만 갱신합니다.
- 필터 초기화 버튼은 편집 상태를 초기값으로 되돌리지만, 그 자체로 저장이나 템플릿 업데이트를 의미하지 않습니다.

### 호환성
- 과거의 단일 `filterValue` 템플릿은 가능할 경우 새 `filterSelections` 구조로 복원합니다.

## 예외 케이스
- 브라우저 인증 상태와 API 인증 상태가 어긋날 수 있으므로 bearer token 처리가 안정적으로 동작해야 합니다.
- 템플릿 업데이트가 사용자가 기대하지 않은 탭 순서 재배치를 만들면 안 됩니다.
- 기본 탭 적용과 저장 템플릿 적용이 서로 다른 저장소를 쓰더라도 사용자 입장에서는 같은 검색 편집 상태 복원처럼 일관되게 보여야 합니다.
- 템플릿 저장에는 드릴다운 상태가 포함되지 않으므로, 깊은 drilldown 화면을 저장한 뒤 복원해도 루트 검색 편집 상태로 돌아오는 것이 정상입니다.

## 검증 항목
- 로그인한 사용자로 템플릿 목록이 로드되는지 확인
- 새 템플릿 생성 시 가장 오른쪽 탭에 추가되는지 확인
- 기본 템플릿이 있으면 초기 진입 시 그 설정이 우선 적용되는지 확인
- 기본 템플릿이 없으면 `default_tab_config`가 적용되는지 확인
- 템플릿 업데이트 후 선택 상태와 설정이 유지되는지 확인
- 기본 템플릿 지정 시 기본값이 하나만 유지되는지 확인
- 구버전 템플릿이 있으면 새 필터 구조로 복원되는지 확인
- 저장 템플릿 적용 또는 기본 탭 적용 시 기존 드릴다운 breadcrumb가 초기화되는지 확인

## 변경 이력
- 2026-04-05: bearer token 기반 템플릿 인증 흐름 복구
- 2026-04-15: 템플릿 설정 구조를 `filterSelections`로 확장
- 2026-05-19: 새 탭이 오른쪽 끝에 유지되도록 정렬 정책 보정
- 2026-05-28: 검색 상태 모델과의 경계, 기본 탭/저장 템플릿 우선순위, 드릴다운 초기화 규칙 정리
