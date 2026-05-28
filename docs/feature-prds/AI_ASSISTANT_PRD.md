# AI 어시스턴트 PRD

## 목적
Kevin AI가 현재 대시보드 컨텍스트를 사용해 요약, 대화 응답, 차트, 필터 적용 action을 어떻게 생성하는지 정의합니다.

## 구현 진입점
- `app/page.tsx`
- `app/components/AiChat.tsx`
- `app/components/chat/*`
- `app/api/ai/summary/route.ts`
- `app/api/ai/chat/route.ts`
- `app/types.ts`

## 상태 및 입력 모델
### 요약 입력
- `periodUnit`
- `unit`
- `filter`
- `weeks`
- `primaryMetricId`
- `metricSummaries`

### 채팅 입력
- 대화 메시지 목록
- `dashboardContext`
- `availableOptions`

### 채팅 컨텍스트에 포함되는 핵심 데이터
- 현재 기간 목록 `weeks`
- 상단 요약용 `metricSummaries`
- 전체 시계열 `metricSeries`
- 엔티티별 시계열 `entitySeries`
- 현재 분석 단위와 필터 라벨
- 현재 결과에 포함된 총 엔티티 수

## 이 문서가 책임지는 범위
- AI 요약과 채팅이 어떤 입력을 받아 어떤 형태로 응답하는지 정의합니다.
- AI가 반환할 수 있는 action, recommendation, chart 블록 계약을 정의합니다.
- AI 응답이 현재 검색 상태와 어떤 식으로 연결되는지 정의합니다.

## 이 문서가 직접 책임지지 않는 범위
- 실제 검색 상태 저장 방식과 자동 재조회의 일반 정책
- 드릴다운 후보 계산과 breadcrumb 규칙
- 템플릿 저장/복원 규칙

위 항목은 각각 `FILTER_AND_SEARCH_PRD.md`, `DRILLDOWN_PRD.md`, `TEMPLATES_AND_PREFERENCES_PRD.md`에서 정의합니다. 다만 AI 문서는 “AI action이 현재 검색 상태에 어떤 변경을 가할 수 있는가”까지는 다룹니다.

## 현재 기능
### 요약
- `/api/ai/summary`는 현재 컨텍스트만 사용해 결정적 요약을 생성합니다.
- 이 경로는 LLM 호출 없이 서버에서 바로 응답을 만듭니다.
- 요약은 다음 순서로 구성됩니다.
  - primary metric 최신값과 직전 대비 변화
  - 변동 폭이 큰 지표 1개
  - 그다음 변동 폭 지표 1개
  - 기간 범위, 기간 개수, 분석 단위, 필터 요약
- 응답에는 항상 주의 문구가 포함되어야 합니다.

### 채팅
- `/api/ai/chat`은 메시지 목록, 현재 대시보드 컨텍스트, 사용 가능한 옵션 목록을 함께 받습니다.
- `ANTHROPIC_API_KEY`가 있으면 Anthropic API를 사용합니다.
- 현재 모델 선택은 고정이며 `claude-sonnet-4-5-20250929`를 사용합니다.
- API 키가 없으면 결정적 fallback 응답을 반환합니다.
- fallback은 기본 안내와 추천 질문은 만들지만, action이나 chart를 보장하지는 않습니다.

### 채팅 세션
- 채팅 세션은 클라이언트 메모리에서만 유지됩니다.
- 새 세션 생성, 세션 전환, 세션 종료가 가능합니다.
- 첫 사용자 질문이 들어오면 해당 세션 제목을 질문 첫 20자 기준으로 자동 갱신합니다.
- 세션은 새로고침 후 복원되지 않습니다.

### 추천 질문
- 대화가 비어 있으면 초기 추천 질문 목록을 보여줍니다.
- 응답에 `recommendations`가 있으면 해당 세션의 동적 추천 질문으로 교체합니다.

## action 계약
- chat 응답은 `type: apply_filters`를 가진 `json:action` 블록을 반환할 수 있습니다.
- 클라이언트는 이 블록을 파싱해 지원되는 필드만 적용합니다.
- 일부 필드만 포함된 부분 업데이트도 허용합니다.
- 현재 지원 필드는 다음과 같습니다.
  - `periodUnit`
  - `periodRangeValue`
  - `measurementUnit`
  - `filterValue`
  - `filterSelections`
  - `metricIds`
- `heatmapColorMap`, `hiddenDeltaMetricIds`, 템플릿 관련 상태는 AI action으로 직접 변경하지 않습니다.
- `filterValue="__ALL__"`은 현재 측정단위 기준 전체 선택 의미로 해석됩니다.

## 차트 계약
- chat 응답은 fenced `chart` 블록을 포함할 수 있습니다.
- 차트는 `line` 또는 `bar`를 지원합니다.
- 한 응답에 여러 차트를 넣을 수 있지만, 프롬프트 기준 최대 2개를 권장합니다.
- 차트 블록 파싱 실패는 전체 응답 실패가 아니라 무시 가능한 부분 실패로 처리합니다.

## 검색 상태와의 연결
- AI action 적용은 현재 편집 중 검색 상태를 갱신합니다.
- `periodUnit` 또는 `periodRangeValue`를 바꾸면 `periodDrilldownHistory`는 초기화됩니다.
- `measurementUnit`, `filterSelections`, `metricIds` 변경은 편집 상태에 반영됩니다.
- AI action 적용 후 실제 조회는 `setAutoSearchPending(true)`를 통해 다음 렌더 사이클에 예약됩니다.
- AI action 자체는 템플릿 저장이나 기본 탭 저장을 의미하지 않습니다.
- AI가 엔티티 드릴다운 parent를 직접 바꾸지는 않습니다.

## 가드레일
- 응답은 실제 대시보드 데이터에 기반해야 하며 임의 수치를 만들어내면 안 됩니다.
- 미완료 기간은 완료된 값처럼 다루면 안 됩니다.
- AI 응답은 참고용 가이드이지 원인 단정의 근거가 아닙니다.
- 사용 가능한 필터/지표 옵션 밖의 값을 action에 넣지 않아야 합니다.
- 메시지 히스토리는 최근 20개까지만 서버로 전달됩니다.
- 요청 payload가 제한을 넘으면 서버는 에러를 반환합니다.

## API 및 제한
### `POST /api/ai/summary`
- payload 최대 크기: `200_000` bytes
- 입력 컨텍스트가 없으면 `400`
- 응답 형식:
  - `title`
  - `bullets`
  - `caution`

### `POST /api/ai/chat`
- payload 최대 크기: `500_000` bytes
- 최근 메시지 20개만 사용
- 메시지가 없으면 `400`
- 응답 형식:
  - `reply`
  - `action?`
  - `recommendations?`
  - `charts?`
  - `model?`

## 검증 항목
- summary 요청 결과가 현재 대시보드 수치와 일치하는지 확인
- chat이 필터 변경 제안을 할 때 action JSON이 파싱 가능한지 확인
- `ANTHROPIC_API_KEY`가 없을 때 fallback 응답이 정상 동작하는지 확인
- chart block이 반환되었을 때 렌더링이 가능한지 확인
- AI action으로 기간을 바꾸면 기간 drilldown history가 초기화되는지 확인
- AI action으로 필터를 적용한 뒤 자동 재조회가 1회만 실행되는지 확인
- 세션 전환 시 각 세션의 메시지와 추천 질문이 독립적으로 유지되는지 확인

## 알려진 공백
- 현재 prompt 문자열 일부는 인코딩 영향을 받고 있어 별도 정리가 필요합니다.
- 문서 정리 후 AI 기능에 대한 인코딩/문구 정비 작업이 필요합니다.
- 현재 fallback 응답은 action과 chart를 생성하지 않으므로, API 키가 없는 환경에서는 AI 자동 적용 시나리오 검증 범위가 제한됩니다.

## 변경 이력
- 초기 대시보드 셸에 AI summary와 chat 기능 도입
- 2026-04-05: 새 프로젝트에서 Anthropic env 복구
- 2026-05-28: 요약과 채팅 경로 분리, action 지원 범위, 세션/추천 질문 동작, payload 제한 정리
