# Session Log — Social Match Dashboard MVP

---

## 세션 5: 2026-03-06 (배포 사이트 버그 점검 + fork push)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | 배포 사이트 지표선택 버그 신고 점검 | ✅ 원인 파악 — 5dbad7b 커밋이 fork에 미푸시 |
| 2 | 코드 로직 정밀 점검 (page.tsx, ControlBar.tsx, CSS) | ✅ 코드 자체 정상 확인 |
| 3 | git push fork main | ✅ 완료 — Vercel 자동 재배포 트리거 |

### 핵심 발견

- `5dbad7b` (지표선택 버그 수정)이 `origin/main`에만 push되고 `fork/main`에는 push되지 않았음
- 배포 사이트(Vercel)는 fork를 소스로 사용 → 수정 전 코드로 배포된 상태
- `git push fork main`으로 해결

### 알려진 이슈

- 없음

---

## 세션 4: 2026-03-06 (지표선택 버그 수정)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | 지표선택 기능 점검 | ✅ 버그 2건 발견 |
| 2 | "전체 해제" 후 기본값 자동 복원 버그 수정 | ✅ 완료 — useRef로 초기화 1회 제한 |
| 3 | 메트릭 피커 중첩 button HTML 규격 위반 수정 | ✅ 완료 — div[role=button]으로 변경 |
| 4 | 빌드 검증 | ✅ 통과 |
| 5 | 커밋 + 푸시 (origin/main) | ✅ 완료 — 5dbad7b |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | 수정 — useEffect 의존성 수정 (hasInitializedMetrics ref 추가), 메트릭 피커 button→div[role=button] |

### 알려진 이슈

- 없음

---

## 세션 3: 2026-03-06 (인증 설정 + UI 개선 + 배포)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | .env.local 환경변수 설정 | ✅ 완료 |
| 2 | Google Cloud OAuth + Supabase Provider 설정 | ✅ 완료 |
| 3 | Supabase filter_templates 마이그레이션 실행 | ✅ 완료 |
| 4 | 로그인 플로우 테스트 (로컬) | ✅ 성공 |
| 5 | 로그아웃 버튼 추가 | ✅ 완료 |
| 6 | 사용자 이름 표시 | ✅ 완료 |
| 7 | 필터 초기화 버튼 추가 | ✅ 완료 |
| 8 | 템플릿 저장/불러오기 테스트 | ✅ 정상 작동 |
| 9 | feature/auth → main 머지 + 푸시 | ✅ 완료 |
| 10 | GitHub 포크 (sanghyunkim-gif) | ✅ 완료 |
| 11 | Vercel 배포 (본인 계정) | ✅ 완료 — social-match-dashboard-mvp-two.vercel.app |
| 12 | Supabase Site URL + Redirect URLs 설정 | ✅ 완료 |
| 13 | Google Cloud origins/redirects 배포 URL 추가 | ✅ 완료 |
| 14 | 배포 환경 로그인 테스트 | ✅ 성공 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | 수정 — createClient import, userName 상태, 로그아웃 버튼, 사용자명 표시, 필터 초기화 핸들러 |
| `app/components/ControlBar.tsx` | 수정 — onResetFilters prop 추가, 초기화 버튼 UI |
| `app/globals.css` | 수정 — header-meta flex, logout-btn, user-name 스타일 추가 |
| `middleware.ts` | 수정 — 환경변수 미설정 시 미들웨어 스킵 가드 |

### 알려진 이슈

- 없음

---

## 세션 2: 2026-03-05 (필터 템플릿 기능 개발)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | 코드베이스 분석 (Phase 1) | ✅ 완료 — 기존 패턴 파악 |
| 2 | 기능 요구사항 정의 (Phase 2) | ✅ 완료 — 6개 FR 정의 |
| 3 | 영향 범위 분석 (Phase 3) | ✅ 완료 — 7개 파일 영향 |
| 4 | DB 스키마 작성 | ✅ 완료 — filter_templates 테이블 (RLS, 유니크 인덱스, 트리거) |
| 5 | 타입 정의 추가 | ✅ 완료 — FilterTemplate, FilterTemplateConfig |
| 6 | API 엔드포인트 생성 | ✅ 완료 — GET/POST + PATCH/DELETE |
| 7 | ControlBar UI 확장 | ✅ 완료 — 드롭다운 + 저장 다이얼로그 |
| 8 | page.tsx 통합 | ✅ 완료 — 상태관리, CRUD 핸들러, 기본 템플릿 자동 적용 |
| 9 | CSS 스타일 추가 | ✅ 완료 — ~150줄 |
| 10 | TypeScript 빌드 검증 | ✅ 통과 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `supabase/migrations/202603050001_create_filter_templates.sql` | 신규 |
| `app/types.ts` | 수정 — 타입 2개 추가 |
| `app/api/filter-templates/route.ts` | 신규 |
| `app/api/filter-templates/[id]/route.ts` | 신규 |
| `app/components/ControlBar.tsx` | 수정 — 템플릿 UI 추가 |
| `app/page.tsx` | 수정 — 템플릿 상태/핸들러 추가 |
| `app/globals.css` | 수정 — 템플릿 스타일 추가 |

### 다음 세션 작업

1. Supabase 대시보드에서 인증 설정 완료
2. filter_templates 마이그레이션 SQL 실행
3. 로그인 → 템플릿 저장/불러오기 E2E 테스트
4. 필요 시 커밋 및 PR 생성

### 알려진 이슈

- 빌드 시 `Missing SUPABASE_SERVICE_ROLE_KEY` 에러 — .env.local 미설정 (기존 이슈)
- 인증 설정 미완료로 템플릿 API 401 반환됨 (정상 — 인증 후 해결)

---

## 세션 1: 2026-03-05 (인증 기능 개발)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | Supabase SSR 클라이언트 설정 | ✅ 완료 |
| 2 | 미들웨어 세션 검증 | ✅ 완료 |
| 3 | OAuth 콜백 라우트 | ✅ 완료 |
| 4 | 로그인 페이지 UI | ✅ 완료 |
| 5 | .env.example 업데이트 | ✅ 완료 |

### 생성한 파일

- `app/lib/supabase/client.ts`, `server.ts`, `middleware.ts`
- `middleware.ts` (루트)
- `app/auth/callback/route.ts`
- `app/login/page.tsx`
