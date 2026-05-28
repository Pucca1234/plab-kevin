# 내보내기 및 원본 데이터 PRD

## 목적
현재 조회 결과를 외부 파일 또는 시트 형태로 내보내는 기능과, 이를 위해 원본 데이터가 어떻게 구성되는지를 정의합니다.

## 구현 진입점
- `app/page.tsx`
- `app/components/ControlBar.tsx`
- `app/api/raw-data/route.ts`
- `app/api/export-sheets/route.ts`
- `app/lib/analytics/bigqueryProvider.ts`

## 이 문서가 책임지는 범위
- 운영 화면에서 사용자가 누르는 내보내기 버튼의 주 경로를 정의합니다.
- 조회 데이터 시트와 원본 데이터 시트가 어떤 데이터로 구성되는지 정의합니다.
- 보조 경로인 Google Sheets 생성 API의 현재 역할을 정의합니다.

## 이 문서가 직접 책임지지 않는 범위
- 화면 조회용 heatmap 계산 규칙 자체
- 검색 상태 저장과 템플릿 복원 규칙
- 드릴다운 후보 계산 규칙

위 항목은 각각 `ANALYTICS_BACKEND_PRD.md`, `TEMPLATES_AND_PREFERENCES_PRD.md`, `DRILLDOWN_PRD.md`에서 정의합니다. 다만 내보내기 문서는 “현재 적용된 검색/드릴다운 컨텍스트를 어떤 수준까지 내보내기 경로가 전달하는가”는 다룹니다.

## 현재 동작
### 운영 주 경로
- 운영 화면의 내보내기 버튼은 현재 `downloadExcel()`을 통해 브라우저에서 Excel 파일을 생성합니다.
- 첫 번째 시트는 화면에 보이는 조회 데이터입니다.
- 두 번째 시트는 `/api/raw-data`를 통해 가져온 원본 row 데이터입니다.
- 현재 운영 기준 주 경로는 이 클라이언트 Excel 다운로드입니다.

### 보조 경로
- `/api/export-sheets`는 Google Sheets API를 직접 호출해 새 스프레드시트를 생성합니다.
- 첫 번째 시트에는 조회 데이터, 두 번째 시트에는 원본 데이터를 넣습니다.
- 인증에는 BigQuery access token 획득 로직을 재사용합니다.
- 현재 UI에서 직접 호출하는 기본 경로는 아니며, 보조/실험 경로로 취급합니다.

### 조회 데이터 시트
- `measureUnit=all`이면 지표 중심 테이블 형태로 내보냅니다.
- 엔티티 단위면 `엔티티`, `지표`, 기간 컬럼 형태로 내보냅니다.
- 현재 화면에 보이는 기간 축과 선택 지표 기준으로 구성합니다.
- 이 시트는 화면 렌더에 사용 중인 결과를 그대로 시트로 옮기는 역할입니다.

### 원본 데이터 시트
- `/api/raw-data`는 현재 `periodUnit`, `measureUnit`, `weeks`, `metrics`, `parent context`를 기준으로 row를 반환합니다.
- 현재 구현은 화면에서 적용된 active `filterSelections` 전체와 `parent context`를 함께 전달합니다.
- provider는 `filterSelections`가 있으면 이를 우선 사용하고, 없을 때만 `filterValue` 기반의 구버전 호출을 호환 처리합니다.
- null 또는 undefined만 존재하는 컬럼은 내보내기에서 제외합니다.
- 값이 없는 셀은 빈 문자열로 기록합니다.
- 원본 row는 BigQuery source table에서 직접 조회합니다.
- `measureUnit=all`이면 dimension type이 `all`인 row만 대상으로 합니다.

## 운영 규칙
- 내보내기 데이터는 현재 화면의 검색 조건과 드릴다운 컨텍스트를 그대로 따라야 합니다.
- 원본 데이터 추출은 최소한 현재 기간, 측정단위, 지표, parent context를 유지해야 합니다.
- 내보내기 기능은 화면 요약용 데이터와 원본 row 데이터를 함께 제공해야 합니다.
- 운영 UI 기준 사용자가 기대하는 기본 결과물은 로컬 `.xlsx` 파일입니다.

## 예외 케이스
- 원본 데이터 조회가 실패해도 조회 데이터 시트 자체는 내려받을 수 있어야 합니다.
- 원본 데이터 컬럼은 row마다 null 분포가 다를 수 있으므로 실제 값이 있는 컬럼만 남겨야 합니다.
- Google Sheets API 호출 실패 시 명시적인 오류를 반환해야 합니다.
- 복합 필터 선택이 있는 경우에도 원본 데이터 경로는 현재 화면과 같은 filter selections를 사용해야 합니다.

## 검증 항목
- 전체 단위와 엔티티 단위 각각에서 Excel 다운로드가 정상 생성되는지 확인
- 원본 데이터 시트가 현재 조회 조건과 일치하는지 확인
- 드릴다운 상태에서 내보내기 시 parent context가 반영되는지 확인
- `/api/export-sheets` 사용 시 새 스프레드시트 생성과 시트 데이터 입력이 정상 동작하는지 확인
- 다중 `filterSelections`가 있는 상태에서 원본 데이터 시트가 화면 조건과 실제로 일치하는지 확인

## 알려진 공백
- 운영 UI에서 Google Sheets 내보내기 API는 주 경로가 아니며 유지 필요성을 추후 판단할 수 있습니다.

## 변경 이력
- 2026-05-28: 운영 주 경로를 브라우저 Excel 다운로드로 명시하고, raw-data 경로의 현재 필터 전달 한계를 문서화
- 2026-05-28: raw-data/export-sheets 경로가 active `filterSelections` 전체를 전달하도록 정합성 보강
