# 백로그 TODO

## 보류한 항목

### DOC-011
- Status: `todo`
- Source: 2026-05-28 BigQuery 반영 구조 개선 요청
- Why: source scheduler와 serving rebuild가 따로 움직이면 신규 numeric metric 반영 누락이나 늦은 반영을 사전에 잡기 어렵습니다.
- Next action: 매일 source 갱신 이후 numeric metric sync 검증, serving rebuild, post-rebuild 검증을 한 흐름으로 묶는 운영 계획과 구현 후보를 정리합니다.
- References:
  - `scripts/bigquery/build-serving-layer.mjs`
  - `scripts/bigquery/validate-serving-layer.mjs`
  - `docs/feature-prds/ANALYTICS_BACKEND_PRD.md`

### DOC-009
- Status: `todo`
- Source: `DOC-008` 후속
- Why: provider 레벨에서는 복합 필터 export 정합성을 확인했지만, 현재 로컬 환경은 인증 세션이 없으면 `/login`으로 강제 리다이렉트되므로 실제 로그인 후 UI에서 Excel/Sheets 내보내기까지 누르는 브라우저 회귀는 아직 남아 있습니다.
- Next action: 인증 가능한 환경에서 로그인 후 `area_group=서울` + `stadium_group` 복합 필터 같은 실제 시나리오로 내보내기를 눌러, 다운로드 시트와 화면 결과가 일치하는지 최종 확인합니다.
- References:
  - `app/login/page.tsx`
  - `app/page.tsx`
  - `docs/feature-prds/EXPORT_AND_RAW_DATA_PRD.md`

### DOC-003
- Status: `todo`
- Source: 문서 운영 규칙 수립 작업
- Why: 앞으로 모든 구현 작업에서 후속 TODO가 저장소에 남아야 하는데, 아직 팀 차원 습관으로 굳지 않았습니다.
- Next action: 이후 작업을 마칠 때마다 `docs/todo/*` 갱신을 기본 절차로 계속 적용합니다.
- References:
  - `docs/todo/README.md`
  - `docs/DOCUMENTATION_RULES.md`

### DOC-B001
- Status: `todo`
- Source: 저장소 점검
- Why: `ANALYTICS_API_CONTRACT.md`는 인코딩이 깨져 있어 유지 가능한 기준 문서로 쓰기 어렵습니다.
- Next action: UTF-8로 복구하고 현재 provider 및 API route와 내용 정합성을 다시 맞춥니다.
- References:
  - `ANALYTICS_API_CONTRACT.md`
  - `app/lib/analytics/bigqueryProvider.ts`

### DOC-B002
- Status: `todo`
- Source: 기존 draft 문서 검토
- Why: 저장소 차원의 긴 변경 이력이 아직 레거시 `레거시_README.md`, `레거시_PRD.md`에 남아 있어 현재 상태 파악을 방해할 수 있습니다.
- Next action: 별도 changelog 도입 여부를 결정하고 장기 이력을 분리할지 판단합니다.
- References:
  - `레거시_README.md`
  - `레거시_PRD.md`

### DOC-B003
- Status: `todo`
- Source: 코드와 문서 비교
- Why: 일부 UI 소스의 한글 문자열이 인코딩 문제로 깨져 보여 향후 유지보수와 문서화에 부담이 됩니다.
- Next action: 대규모 문자열 정리 전에 안전한 인코딩 수정 전략을 먼저 확정합니다.
- References:
  - `app/components/ControlBar.tsx`
  - `app/components/EntityMetricTable.tsx`
  - `app/components/AiChat.tsx`
  - `app/api/ai/chat/route.ts`
  - `AI_CONTEXT.md`
