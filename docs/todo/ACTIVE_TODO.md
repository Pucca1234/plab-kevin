# 현재 TODO

## 즉시 처리할 항목
### DOC-009
- Status: `todo`
- Source: `DOC-008` 후속
- Why: provider 레벨에서는 복합 필터 export 정합성을 확인했지만, 현재 로컬 환경은 인증 세션이 없으면 `/login`으로 강제 리다이렉트되므로 실제 로그인 후 UI에서 Excel/Sheets 내보내기까지 누르는 브라우저 회귀는 아직 남아 있습니다.
- Next action: 인증 가능한 환경에서 로그인 후 `area_group=서울` + `stadium_group` 복합 필터 같은 실제 시나리오로 내보내기를 눌러, 다운로드 시트와 화면 결과가 일치하는지 최종 확인합니다.
- References:
  - `app/login/page.tsx`
  - `app/page.tsx`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-002
- Status: `done`
- Source: 코드 구조 검토 결과
- Why: 운영 중인 Kevin 대시보드 기능 기준으로 PRD 커버리지를 넓힐 필요가 있었습니다.
- Next action: prototype은 제외하고, 이후에는 기존 PRD의 최신성 보강과 기능 간 중복 정리에 집중합니다.
- References:
  - `docs/SYSTEM_MAP.md`
  - `app/api/export-sheets/route.ts`
  - `app/login/page.tsx`
  - `docs/feature-prds/AUTH_AND_ACCESS_PRD.md`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-003
- Status: `todo`
- Source: 문서 운영 규칙 수립 작업
- Why: 앞으로 모든 구현 작업에서 후속 TODO가 저장소에 남아야 하는데, 아직 팀 차원 습관으로 굳지 않았습니다.
- Next action: 이후 작업을 마칠 때마다 `docs/todo/*` 갱신을 기본 절차로 계속 적용합니다.
- References:
  - `docs/todo/README.md`
  - `docs/DOCUMENTATION_RULES.md`

## 이번 작업에서 완료한 항목
### DOC-000
- Status: `done`
- Source: 문서 재설계 요청
- Why: 문서 허브, 문서 규칙, 기능별 PRD, TODO 구조가 필요했습니다.
- Next action: 없음
- References:
  - `docs/README.md`
  - `docs/MASTER_PRD.md`
  - `docs/feature-prds/*`

### DOC-004
- Status: `done`
- Source: 이번 한글화 및 레거시 분리 요청
- Why: 새 문서 체계를 실제 운영 기준으로 쓰려면 문서 언어와 파일 역할이 명확해야 했습니다.
- Next action: 이후 문서 추가 시 같은 한글 기준과 구조를 유지합니다.
- References:
  - `README.md`
  - `PRD.md`
  - `레거시_README.md`
  - `레거시_PRD.md`

### DOC-005
- Status: `done`
- Source: 다중 PC 작업 연속성 확보 요청
- Why: 다른 PC에서도 같은 기준 문서를 바로 열고 이어서 작업할 수 있도록 상대경로 링크와 원격 백업이 필요했습니다.
- Next action: 이후 문서 링크는 저장소 기준 상대경로만 사용하고, 다음 기능 작업 전 `DOC-001`부터 이어서 진행합니다.
- References:
  - `README.md`
  - `PRD.md`
  - `docs/README.md`
  - `docs/DOCUMENTATION_RULES.md`

### DOC-001
- Status: `done`
- Source: 2026-05-26 문서 재구성 작업
- Why: 레거시 `레거시_README.md`, `레거시_PRD.md`에 남아 있던 핵심 실행 정보와 제품 정책을 새 문서 체계로 이관할 필요가 있었습니다.
- Next action: 남은 문서 작업은 운영 기능 기준 최신성 보강과 중복 정리입니다.
- References:
  - `레거시_README.md`
  - `레거시_PRD.md`
  - `README.md`
  - `PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-006
- Status: `done`
- Source: 운영 기능 PRD 커버리지 점검 결과
- Why: 기능별 PRD는 운영 기능 전반을 덮기 시작했지만, 서로 중복되는 내용과 최신 구현이 덜 반영된 부분이 아직 남아 있습니다.
- Next action: 아래 순서로 진행합니다.
  1. 완료: `FILTER_AND_SEARCH_PRD.md`와 `DRILLDOWN_PRD.md`의 경계 재정리
  2. 완료: `TEMPLATES_AND_PREFERENCES_PRD.md`와 검색 상태 모델 연결 보강
  3. 완료: `AI_ASSISTANT_PRD.md`의 최신 운영 흐름과 제약 보강
  4. 완료: `EXPORT_AND_RAW_DATA_PRD.md`의 운영 우선 경로 명확화
- References:
  - `docs/MASTER_PRD.md`
  - `docs/feature-prds/FILTER_AND_SEARCH_PRD.md`
  - `docs/feature-prds/DRILLDOWN_PRD.md`
  - `docs/feature-prds/TEMPLATES_AND_PREFERENCES_PRD.md`
  - `docs/feature-prds/AI_ASSISTANT_PRD.md`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-007
- Status: `done`
- Source: `DOC-006` 내보내기 문서 최신화 과정
- Why: 원본 데이터 내보내기 경로가 현재 화면의 전체 `filterSelections`를 그대로 전달하지 않고 `filterValue` 요약 문자열 중심으로 동작해, 복합 필터 상황의 정합성 확인이 필요했습니다.
- Next action: 수정 후 실제 UI 기반 회귀 확인은 `DOC-008`에서 이어갑니다.
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-008
- Status: `done`
- Source: `DOC-007` 구현 수정 후속
- Why: raw-data/export-sheets 경로가 active `filterSelections`를 전달하도록 바뀌었으므로, 복합 필터와 드릴다운이 있는 실제 시나리오에서 결과 정합성을 확인할 필요가 있었습니다.
- Next action: 인증 가능한 브라우저 환경에서 실제 로그인 후 UI 내보내기 회귀는 `DOC-009`에서 이어갑니다.
- References:
  - `app/page.tsx`
  - `app/api/raw-data/route.ts`
  - `app/api/export-sheets/route.ts`
  - `app/lib/analytics/bigqueryProvider.ts`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`
