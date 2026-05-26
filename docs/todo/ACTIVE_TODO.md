# 현재 TODO

## 즉시 처리할 항목
### DOC-001
- Status: `todo`
- Source: 2026-05-26 문서 재구성 작업
- Why: 레거시 `_README.md`, `_PRD.md`에 아직 긴 운영 이력과 정책이 섞여 있어 새 문서 체계로 완전히 분리되지 않았습니다.
- Next action: 레거시 문서의 내용 중 현재도 유지해야 하는 실행 정보와 정책을 선별해서 새 `README.md`, `PRD.md`, 기능별 PRD로 단계적으로 이관합니다.
- References:
  - `_README.md`
  - `_PRD.md`
  - `README.md`
  - `PRD.md`

### DOC-002
- Status: `todo`
- Source: 코드 구조 검토 결과
- Why: 새 문서 체계는 핵심 기능 영역을 다뤘지만 export, auth/login, prototype 영역은 아직 기능별 PRD가 없습니다.
- Next action: 필요 여부를 확인한 뒤 export flow, auth/login flow, prototype route용 PRD를 추가합니다.
- References:
  - `docs/SYSTEM_MAP.md`
  - `app/api/export-sheets/route.ts`
  - `app/login/page.tsx`
  - `app/prototypes/page.tsx`

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
  - `_README.md`
  - `_PRD.md`

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
