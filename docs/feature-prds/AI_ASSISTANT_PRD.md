# AI 어시스턴트 PRD

## 목적
Kevin AI가 현재 대시보드 컨텍스트를 사용해 요약, 대화 응답, 차트, 필터 적용 action을 어떻게 생성하는지 정의합니다.

## 구현 진입점
- `app/components/AiChat.tsx`
- `app/components/chat/*`
- `app/api/ai/summary/route.ts`
- `app/api/ai/chat/route.ts`

## 현재 기능
### 요약
- 아래 정보를 바탕으로 결정적 요약 bullet을 생성합니다.
  - 현재 기간 목록
  - 선택된 단위와 필터 요약
  - primary metric
  - metric delta

### 채팅
- 현재 대시보드 컨텍스트와 사용 가능한 옵션 목록을 함께 받습니다.
- system prompt는 다음 정보를 포함합니다.
  - 현재 데이터 설명
  - 실제로 화면에 보이는 시계열을 사용하라는 지침
  - JSON 기반 필터 적용 action 형식
  - fenced block 기반 chart payload 형식
- `ANTHROPIC_API_KEY`가 있으면 Anthropic을 사용합니다.
- API 키가 없으면 deterministic fallback 응답을 사용합니다.

## action 계약
- chat 응답은 `type: apply_filters`를 가진 `json:action` 블록을 반환할 수 있습니다.
- 클라이언트는 이 블록을 파싱해 지원되는 필드만 적용합니다.
- 일부 필드만 포함된 부분 업데이트도 허용합니다.

## 가드레일
- 응답은 실제 대시보드 데이터에 기반해야 하며 임의 수치를 만들어내면 안 됩니다.
- 미완료 기간은 완료된 값처럼 다루면 안 됩니다.
- AI 응답은 참고용 가이드이지 원인 단정의 근거가 아닙니다.

## 검증 항목
- summary 요청 결과가 현재 대시보드 수치와 일치하는지 확인
- chat이 필터 변경 제안을 할 때 action JSON이 파싱 가능한지 확인
- `ANTHROPIC_API_KEY`가 없을 때 fallback 응답이 정상 동작하는지 확인
- chart block이 반환되었을 때 렌더링이 가능한지 확인

## 알려진 공백
- 현재 prompt 문자열 일부는 인코딩 영향을 받고 있어 별도 정리가 필요합니다.
- 문서 정리 후 AI 기능에 대한 인코딩/문구 정비 작업이 필요합니다.

## 변경 이력
- 초기 대시보드 셸에 AI summary와 chat 기능 도입
- 2026-04-05: 새 프로젝트에서 Anthropic env 복구
