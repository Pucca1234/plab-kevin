# 백로그 TODO

## 보류한 항목
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
  - `CHANGELOG_DRAFT.md`
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
