# Kevin Dashboard PRD

이 문서는 현재 운영 기준에서의 제품 공통 규칙과 기능별 PRD 진입점을 제공하는 메인 PRD입니다. 상세 동작은 하위 기능 문서에서 관리합니다.

## 문서 구조
- 공통 제품 규칙: [docs/MASTER_PRD.md](./docs/MASTER_PRD.md)
- 필터 및 검색: [docs/feature-prds/FILTER_AND_SEARCH_PRD.md](./docs/feature-prds/FILTER_AND_SEARCH_PRD.md)
- 드릴다운: [docs/feature-prds/DRILLDOWN_PRD.md](./docs/feature-prds/DRILLDOWN_PRD.md)
- 분석 백엔드: [docs/feature-prds/ANALYTICS_BACKEND_PRD.md](./docs/feature-prds/ANALYTICS_BACKEND_PRD.md)
- 템플릿 및 사용자 설정: [docs/feature-prds/TEMPLATES_AND_PREFERENCES_PRD.md](./docs/feature-prds/TEMPLATES_AND_PREFERENCES_PRD.md)
- AI 어시스턴트: [docs/feature-prds/AI_ASSISTANT_PRD.md](./docs/feature-prds/AI_ASSISTANT_PRD.md)
- 레거시 통합 PRD: [_PRD.md](./_PRD.md)

## 현재 제품 원칙 요약
- 분석 source of truth는 BigQuery입니다.
- Supabase는 인증, 템플릿, 사용자 설정을 담당합니다.
- 필터는 현재 검색 컨텍스트를 기준으로 동적으로 계산되어야 합니다.
- 드릴다운은 현재 분석 맥락을 유지한 채 하위 레벨로 들어가는 동작이어야 합니다.
- 미완료 기간은 확정 데이터처럼 다루면 안 됩니다.

## 문서 운영 원칙
- 새 기능 정책은 먼저 `docs/MASTER_PRD.md` 또는 관련 기능 PRD에 기록합니다.
- 이 파일은 전체 PRD 진입점과 공통 원칙 요약만 유지합니다.
- 과거 날짜별 긴 이력은 레거시 문서와 TODO 문서로 분리합니다.

## 검증 기준
- `npm run build` 통과
- `git diff --check` 통과
- 변경 기능과 관련된 실제 UI/API 흐름 확인

## 작업 연속성
- 현재 우선 작업: [docs/todo/ACTIVE_TODO.md](./docs/todo/ACTIVE_TODO.md)
- 후순위 작업: [docs/todo/BACKLOG_TODO.md](./docs/todo/BACKLOG_TODO.md)
