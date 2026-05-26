# 템플릿 및 사용자 설정 PRD

## 목적
저장된 대시보드 설정이 어떻게 생성, 수정, 정렬, 복원되는지 정의합니다.

## 구현 진입점
- `app/components/ControlBar.tsx`
- `app/api/filter-templates/route.ts`
- `app/api/filter-templates/[id]/route.ts`
- `app/api/user-preferences/route.ts`

## 데이터 모델
- Template:
  - `id`
  - `user_id`
  - `name`
  - `config`
  - `is_shared`
  - `is_default`
- 현재 `config`에 포함되는 주요 값:
  - `periodUnit`
  - `periodRangeValue`
  - `measurementUnit`
  - `filterSelections`
  - `selectedMetricIds`
  - heatmap 및 표시 관련 설정

## 현재 동작
### 탭
- 기본 탭과 저장 템플릿 탭은 별도 개념입니다.
- 기본 탭 이름은 UI에서 로컬 수정이 가능합니다.
- 저장 템플릿은 이름 변경, 삭제, 기본 템플릿 지정이 가능합니다.

### 정렬
- 템플릿 API는 `created_at asc` 기준으로 반환합니다.
- 새 템플릿은 탭 목록의 가장 오른쪽에 추가되어야 합니다.

### 저장 및 복원
- 템플릿 읽기/쓰기는 인증된 사용자만 가능합니다.
- shared 템플릿은 본인 템플릿과 함께 보입니다.
- 새로운 기본 템플릿을 저장하거나 지정하면 기존 기본 템플릿은 해제됩니다.

### 호환성
- 과거의 단일 `filterValue` 템플릿은 가능할 경우 새 `filterSelections` 구조로 복원합니다.

## 예외 케이스
- 브라우저 인증 상태와 API 인증 상태가 어긋날 수 있으므로 bearer token 처리가 안정적으로 동작해야 합니다.
- 템플릿 업데이트가 사용자가 기대하지 않은 탭 순서 재배치를 만들면 안 됩니다.
- 기본 탭 적용 시 드릴다운과 transient UI 상태는 함께 초기화되어야 합니다.

## 검증 항목
- 로그인한 사용자로 템플릿 목록이 로드되는지 확인
- 새 템플릿 생성 시 가장 오른쪽 탭에 추가되는지 확인
- 템플릿 업데이트 후 선택 상태와 설정이 유지되는지 확인
- 기본 템플릿 지정 시 기본값이 하나만 유지되는지 확인
- 구버전 템플릿이 있으면 새 필터 구조로 복원되는지 확인

## 변경 이력
- 2026-04-05: bearer token 기반 템플릿 인증 흐름 복구
- 2026-04-15: 템플릿 설정 구조를 `filterSelections`로 확장
- 2026-05-19: 새 탭이 오른쪽 끝에 유지되도록 정렬 정책 보정
