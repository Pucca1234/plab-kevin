# PLAB Kevin

플랩풋볼 운영/매칭 데이터를 연, 분기, 월, 주, 일 단위로 분석하는 내부 대시보드 프로젝트입니다. 현재 분석 조회의 source of truth는 BigQuery이며, Supabase는 인증과 템플릿, 사용자 설정 같은 앱 운영 데이터를 담당합니다.

## 시작 순서
1. 문서 구조와 작업 원칙 확인: [docs/README.md](./docs/README.md)
2. 문서 작성 규칙 확인: [docs/DOCUMENTATION_RULES.md](./docs/DOCUMENTATION_RULES.md)
3. 현재 해야 할 일 확인: [docs/todo/ACTIVE_TODO.md](./docs/todo/ACTIVE_TODO.md)

## 핵심 문서
- 프로젝트 문서 허브: [docs/README.md](./docs/README.md)
- 시스템 구조 요약: [docs/SYSTEM_MAP.md](./docs/SYSTEM_MAP.md)
- 공통 제품 기준: [docs/MASTER_PRD.md](./docs/MASTER_PRD.md)
- 기능별 PRD: [docs/feature-prds](./docs/feature-prds)
- 레거시 README: [_README.md](./_README.md)
- 레거시 PRD: [_PRD.md](./_PRD.md)

## 실행
```bash
npm install
npm run dev
```

## 주요 검증 명령
```bash
npm run build
git diff --check
```

필요 시 추가 검증:
```bash
npm run data:validate-recent-refresh
npm run bq:validate-serving
```

## 환경 변수 핵심
- `NEXT_PUBLIC_APP_URL`
- `ANALYTICS_BACKEND=bigquery`
- `BIGQUERY_PROJECT_ID`
- `BIGQUERY_LOCATION`
- `BIGQUERY_DATASET_SOURCE_DATA_MART`
- `BIGQUERY_DATASET_SOURCE_GOOGLESHEETS`
- `BIGQUERY_DATASET_SERVING`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`

## 작업 원칙 요약
- 코드가 현재 동작의 최우선 기준입니다.
- 기능 정책은 `docs/MASTER_PRD.md`와 기능별 PRD에 기록합니다.
- 실행, 운영, 진입 가이드는 이 `README.md`에 유지합니다.
- 작업 중 생긴 후속 과제는 채팅이 아니라 `docs/todo/*`에 남깁니다.
- 커밋 또는 푸시 전에는 관련 문서와 TODO를 함께 갱신합니다.
