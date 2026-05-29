# PLAB Kevin

플랩풋볼 운영/매칭 데이터를 연, 분기, 월, 주, 일 단위로 분석하는 내부 대시보드 프로젝트입니다. 현재 분석 조회의 source of truth는 BigQuery이며, Supabase는 인증과 템플릿, 사용자 설정 같은 앱 운영 데이터를 담당합니다.

## 프로젝트 메타데이터
- GitHub 저장소: `Pucca1234/plab-kevin`
- Vercel 프로젝트: `plab-kevin`
- 운영 URL: `https://plab-kevin.vercel.app`
- 기본 브랜치 기준 작업 원칙: 항상 최신 `origin/main`에서 작업을 시작합니다.

## 시작 순서
1. 문서 구조와 작업 원칙 확인: [docs/README.md](./docs/README.md)
2. 문서 작성 규칙 확인: [docs/DOCUMENTATION_RULES.md](./docs/DOCUMENTATION_RULES.md)
3. 현재 해야 할 일 확인: [docs/todo/ACTIVE_TODO.md](./docs/todo/ACTIVE_TODO.md)

## 핵심 문서
- 프로젝트 문서 허브: [docs/README.md](./docs/README.md)
- 시스템 구조 요약: [docs/SYSTEM_MAP.md](./docs/SYSTEM_MAP.md)
- 공통 제품 기준: [docs/MASTER_PRD.md](./docs/MASTER_PRD.md)
- 기능별 PRD: [docs/feature-prds](./docs/feature-prds)
- 레거시 README: [레거시_README.md](./레거시_README.md)
- 레거시 PRD: [레거시_PRD.md](./레거시_PRD.md)

## 기술 스택
- Frontend: Next.js 14, React, TypeScript
- Analytics backend: provider 구조 기반 BigQuery 조회
- App data: Supabase
- AI: Anthropic API 사용 가능, 미설정 시 fallback 응답

## 핵심 목적
- 최근 8/12/24주 및 기타 기간단위 성과 추이 확인
- 측정단위별 비교와 드릴다운 분석
- 지표 기반 의사결정과 AI 요약/질문 응답 지원

## 핵심 파일 지도
- `app/page.tsx`: 대시보드 최상위 상태, 검색, 드릴다운, 템플릿 orchestration
- `app/components/ControlBar.tsx`: 검색 컨트롤, 템플릿 탭, 액션 버튼
- `app/components/EntityMetricTable.tsx`: 엔티티 결과 테이블, 드릴다운 메뉴, 기간 정렬
- `app/lib/analytics/bigqueryProvider.ts`: BigQuery query generation 및 응답 조립
- `app/lib/analytics/bigqueryShared.ts`: 측정단위/필터/라벨/드릴다운 해석
- `app/lib/analytics/bigqueryClient.ts`: BigQuery 인증과 클라이언트 생성

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
- `NEXT_PUBLIC_FILTER_UX_V2_ENABLED`

## 현재 운영 기준
- 분석 source of truth는 BigQuery입니다.
- BigQuery source table은 read-only로 취급합니다.
- 신규/갱신 분석 객체는 `kevin_serving` dataset에 둡니다.
- Kevin에서 노출되는 수치 지표는 `metric_store_native` 항목 중 source table의 숫자형 컬럼으로 확인된 항목만 포함합니다.
- source 테이블 갱신 기준은 매일 07:50 KST 전후입니다.
- serving rebuild 기본 기준은 매일 08:30 KST입니다.
- 현재 제품 개선 우선순위는 필터 UX 단방향화와 안정적인 후보 리스트 유지이며, 작업 계획은 `docs/todo/ACTIVE_TODO.md`의 `DOC-012`에서 관리합니다.
- 새 필터 UX는 `NEXT_PUBLIC_FILTER_UX_V2_ENABLED=1`일 때만 켜지며, 배포 후 롤백은 이 값을 `0`으로 내려 기존 동작으로 되돌리는 방식입니다.

## 주요 운영 워크플로
- BigQuery serving rebuild: `npm run bq:build-serving`, `npm run bq:validate-serving`
- 최근 데이터 검증: `npm run data:validate-recent-refresh`
- 전체 주간 집계 검증: `npm run data:validate-mv`

## 작업 원칙 요약
- 코드가 현재 동작의 최우선 기준입니다.
- 기능 정책은 `docs/MASTER_PRD.md`와 기능별 PRD에 기록합니다.
- 실행, 운영, 진입 가이드는 이 `README.md`에 유지합니다.
- 작업 중 생긴 후속 과제는 채팅이 아니라 `docs/todo/*`에 남깁니다.
- 커밋 또는 푸시 전에는 관련 문서와 TODO를 함께 갱신합니다.
- `.env.local`은 로컬 전용으로 유지하고 커밋하지 않습니다.
- PowerShell에서는 `&&` 대신 명령 분리 또는 `;` 사용을 기준으로 작업합니다.
