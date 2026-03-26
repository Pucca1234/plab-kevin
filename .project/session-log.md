# Session Log — Social Match Dashboard MVP

---

## 세션 10: 2026-03-19 (AI 엔티티 데이터 제한 제거 + 모델 라우팅)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | AI 채팅 엔티티 데이터 50개 제한 제거 — 전체 전달 | ✅ 완료 |
| 2 | 엔티티 정렬 변경 — 가나다순 → 첫 번째 지표 기준 내림차순 | ✅ 완료 |
| 3 | MAX_BYTES 200KB → 500KB 증가 | ✅ 완료 |
| 4 | ChatContext에 totalEntityCount 필드 추가 | ✅ 완료 |
| 5 | 시스템 프롬프트에 정렬 기준 + 잘림 여부 안내 추가 | ✅ 완료 |
| 6 | 커밋 + origin/fork 양쪽 push | ✅ 완료 |

### 버그 원인

- `MAX_ENTITY_ROWS = 50` 제한 + `mapHeatmapRows`의 `entity.localeCompare()` 가나다순 정렬
- `.slice(0, 50)` → 한국어 가나다순 앞쪽(ㄱ자 구장)만 AI에 전달됨
- "구장 매출 탑10" 질문 시 ㄱ자 구장만 결과에 포함되는 문제

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | MAX_ENTITY_ROWS 제거, 지표 기준 내림차순 정렬, totalEntityCount 추가 |
| `app/types.ts` | ChatContext에 totalEntityCount 필드 추가 |
| `app/api/ai/chat/route.ts` | MAX_BYTES 500KB, 시스템 프롬프트에 정렬/잘림 안내 |

### 커밋

| 해시 | 메시지 |
|------|--------|
| f3d14b1 | fix: AI 채팅 엔티티 데이터 제한 제거 — 전체 데이터 기반 분석 지원 |

### 이전 커밋 (세션 9 이후)

| 해시 | 메시지 |
|------|--------|
| 52e7d14 | feat: AI 채팅 모델 라우팅 — 단순 조회는 Sonnet, 분석 요청은 Opus |
| 15e4430 | feat: AI 채팅 입력창 Shift+Enter 줄바꿈 지원 |
| bd07b24 | chore: AI 채팅 모델을 Opus 4.6으로 변경 |

### 다음 세션 작업

1. Vercel 배포 빌드 통과 확인
2. AI 분석 품질 검증 — 전체 엔티티 기반 정확한 순위/탑10 분석 확인
3. 엔티티 수가 매우 많은 경우(300+) 토큰 사용량 모니터링

### 알려진 이슈

- 엔티티 수가 매우 많은 단위(면 등)에서 토큰 사용량 증가 가능 — 모니터링 필요

---

## 세션 9: 2026-03-19 (빌드 오류 수정 + AI 분석 컨텍스트 개선)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | Vercel DEPLOYMENT_NOT_FOUND 해결 — 대시보드에서 프로젝트 재연결 | ✅ 완료 |
| 2 | 빌드 오류 수정 — setSummary, setIsSummaryLoading 잔존 참조 제거 | ✅ 완료 |
| 3 | 빌드 오류 수정 — 중복 `)}` JSX 닫기 태그 제거 | ✅ 완료 |
| 4 | AI 컨텍스트 집계 데이터 누락 수정 — 엔티티 평균 계산 로직 추가 | ✅ 완료 |
| 5 | AI 채팅 마크다운 렌더링 개선 — ##/### 헤딩, 리스트, 간격 | ✅ 완료 |
| 6 | AI 시스템 프롬프트 구조 개선 — 데이터 상단 배치 + 활용 규칙 강화 | ✅ 완료 |
| 7 | ChatContext 타입 누락 커밋 — metricSeries, entitySeries 필드 추가 | ✅ 완료 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | setSummary/setIsSummaryLoading 제거, 중복 `)}` 제거, computeAggregateFromEntities 추가, buildContext 집계 로직 개선 |
| `app/api/ai/chat/route.ts` | 시스템 프롬프트 구조 개편 — 데이터 블록 상단 이동, 규칙 #1 변경, 데이터 가용성 안내 추가 |
| `app/components/chat/ChatMessageRenderer.tsx` | renderLine 함수 추가 — 헤딩(h3/h4), 리스트(li), 빈 줄(spacer) 렌더링 |
| `app/globals.css` | agent-h3/h4/p/li/spacer CSS 클래스 추가 |
| `app/types.ts` | MetricSeriesItem, EntitySeriesItem 타입 추가, ChatContext에 metricSeries/entitySeries 필드 추가 |

### 커밋

| 해시 | 메시지 |
|------|--------|
| 4126601 | fix: 빌드 오류 수정 — 제거된 state 참조 및 중복 JSX 닫기 제거 |
| a6577b1 | fix: AI 컨텍스트에 집계 키 없을 때 엔티티 평균으로 대체 |
| 7c45005 | fix: AI 채팅 마크다운 렌더링 개선 (헤딩, 리스트 지원) |
| 6a2b6d7 | fix: AI 시스템 프롬프트 개선 — 엔티티 데이터 활용 유도 |
| 9fa76ea | fix: ChatContext 타입에 metricSeries, entitySeries 필드 추가 |

### 다음 세션 작업

1. Vercel 배포 빌드 통과 확인
2. AI 분석 품질 검증 (엔티티별 순위/평균 계산 정확성)
3. 추가 AI 분석 오류 발견 시 프롬프트/컨텍스트 튜닝

### 알려진 이슈

- AI 분석 시 엔티티 데이터 활용 품질은 Claude Sonnet 모델 성능에 의존
- 엔티티 수가 많은 경우(50+) 시스템 프롬프트 크기 증가 가능

---

## 세션 8: 2026-03-17 (AI 채팅 사이드 패널 전환 + 멀티 세션)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | AI 플로팅 하단 바 → 오른쪽 고정 사이드 패널(400px)로 전환 | ✅ 완료 |
| 2 | 멀티 세션 기능 추가 (새 대화 생성/전환/닫기, 세션 탭) | ✅ 완료 |
| 3 | 첫 메시지 기반 세션 제목 자동 생성 | ✅ 완료 |
| 4 | 패널 토글 버튼 (닫기 시 우하단 AI 버튼 표시) | ✅ 완료 |
| 5 | 레이아웃 조정 (.app-shell.chat-open margin-right) | ✅ 완료 |
| 6 | 하단 여백 제거 (80px/88px → 32px/24px) | ✅ 완료 |
| 7 | 모바일 반응형 (패널 전체폭 오버레이) | ✅ 완료 |
| 8 | 빌드 검증 + 양쪽 리모트 푸시 | ✅ 완료 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/components/AiChat.tsx` | 전체 리라이트 — 사이드 패널 + ChatSession 타입 + 멀티 세션 상태 관리 |
| `app/page.tsx` | isChatOpen 상태 추가, app-shell.chat-open 클래스, AiChat props 확장 |
| `app/globals.css` | ai-bottom-* → ai-side-panel/ai-panel-* 스타일 전면 교체, 세션 탭/토글 버튼 스타일 추가 |

### 커밋

| 해시 | 메시지 |
|------|--------|
| 4688cad | feat: AI 채팅을 오른쪽 사이드 패널로 변경 + 멀티 세션 지원 |

### 다음 세션 작업

1. Vercel 배포 확인
2. Vercel 환경변수에 ANTHROPIC_API_KEY 추가

### 알려진 이슈

- Vercel에 ANTHROPIC_API_KEY 미설정 시 AI 채팅 fallback 모드로 동작

---

## 세션 7: 2026-03-17 (CDO v3 전면 리디자인 + AI 차트 렌더링)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | CDO 디자인 업그레이드 v3 — 색상/폰트 (Indigo → Deep Teal) | ✅ 완료 |
| 2 | CDO Division 팀 스폰 (css-architect, login-designer, component-engineer) | ✅ 완료 |
| 3 | globals.css UI/UX 전면 개선 — glassmorphism, hover lift, zebra striping, micro-interactions | ✅ 완료 |
| 4 | Login 페이지 프리미엄 리디자인 — gradient 배경, accent bar, K 로고마크, 프리미엄 Google 버튼 | ✅ 완료 |
| 5 | 컴포넌트 마크업 구조 개선 — 브랜드 마크 SVG, 테이블 헤더 아이콘, filter-divider, drilldown 아이콘, anomaly SVG | ✅ 완료 |
| 6 | AI 채팅 차트 렌더링 기능 추가 — recharts 기반 인라인 line/bar 차트 | ✅ 완료 |
| 7 | 시스템 프롬프트에 차트 포맷 안내 추가 | ✅ 완료 |
| 8 | 빌드 검증 | ✅ 통과 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/globals.css` | Deep Teal 변수, glassmorphism header, card hover lift, zebra striping, pill badge, overlay animations, chat-chart 스타일, 브랜드 마크/아이콘 CSS |
| `app/page.tsx` | 브랜드 마크 SVG, empty-state 아이콘 |
| `app/login/page.tsx` | 전면 리디자인 (gradient 배경, accent bar 카드, K 로고마크, 프리미엄 버튼, footer) |
| `app/components/ControlBar.tsx` | filter-divider, filter-group-period wrapper |
| `app/components/MetricTable.tsx` | 헤더 아이콘 SVG (그리드, 트렌드라인), getHeatColor Deep Teal |
| `app/components/EntityMetricTable.tsx` | 엔티티 아이콘, 드릴다운 홈/chevron 아이콘, getHeatColor Deep Teal |
| `app/components/HeatmapMatrix.tsx` | anomaly SVG 아이콘, getHeatColor Deep Teal |
| `app/components/Sparkline.tsx` | stroke 기본값 #0D9488 |
| `app/components/AiChat.tsx` | charts 데이터 처리 + 렌더러 전달 |
| `app/components/chat/ChatChart.tsx` | **신규** — recharts 기반 차트 컴포넌트 |
| `app/components/chat/ChatMessageRenderer.tsx` | chart 블록 타입 지원 추가 |
| `app/api/ai/chat/route.ts` | chart 블록 파싱 + 시스템 프롬프트 차트 포맷 추가 |
| `app/types.ts` | ChartConfig 타입 추가, ChatMessage에 charts 필드 추가 |
| `.agent-state/outputs/brand-identity.md` | v3 Deep Teal Premium 업데이트 |

### 다음 세션 작업

1. Git commit + push (origin + fork 양쪽)
2. Vercel 배포 확인
3. Vercel 환경변수에 ANTHROPIC_API_KEY 추가

### 알려진 이슈

- Vercel에 ANTHROPIC_API_KEY 미설정 시 AI 채팅 fallback 모드로 동작
- 개발 서버 hot reload 시 간헐적 webpack 캐시 오류 → `.next` 삭제 후 재시작으로 해결

---

## 세션 6: 2026-03-16 (AI 채팅 UI 변경 + CDO 디자인 업그레이드)

### 완료한 작업

| # | 작업 | 결과 |
|---|------|------|
| 1 | AI 채팅 바 → 플로팅 라운딩 pill 형태로 변경 | ✅ 완료 |
| 2 | CDO 디자인 업그레이드 실행 (Phase 0~5) | ✅ 완료 |
| 3 | Primary 색상 #2563EB → #4F46E5 (Indigo) | ✅ 완료 |
| 4 | 그림자 정교화 (softer opacity) | ✅ 완료 |
| 5 | 이모지 ✕ → SVG 아이콘 교체 | ✅ 완료 |
| 6 | ▲/▼ 유니코드 → CSS border 삼각형 교체 | ✅ 완료 |
| 7 | origin/main 머지 충돌 해결 (drilldown, entity filter 등) | ✅ 완료 |
| 8 | 하드코딩 색상 → CSS 변수로 교체 (entity filter 등) | ✅ 완료 |
| 9 | chatContext를 useMemo 기반으로 통일 | ✅ 완료 |
| 10 | 빌드 검증 + 양쪽 리모트 푸시 | ✅ 완료 |

### 생성/수정한 파일

| 파일 | 변경 |
|------|------|
| `app/globals.css` | CSS 변수 Indigo 업데이트, AI 플로팅 바, CSS 삼각형, entity filter 변수화 |
| `app/components/AiChat.tsx` | ✕ → SVG, aria-label 추가 |
| `app/components/Sparkline.tsx` | stroke 기본값 #4F46E5 |
| `app/page.tsx` | 머지 충돌 해결, chatContext useMemo 통일, aiAvailableOptions 수정 |
| `.env.example` | ANTHROPIC_API_KEY + NEXT_PUBLIC_APP_URL 추가 |

### 커밋

| 해시 | 메시지 |
|------|--------|
| 6efac69 | feat: 디자인 업그레이드 (Indigo 프리미엄 팔레트 + 플로팅 AI 채팅 바) |
| 64542b2 | merge: origin/main 충돌 해결 + 디자인 업그레이드 통합 |

### 다음 세션 작업

1. Vercel 환경변수에 ANTHROPIC_API_KEY 추가
2. 배포 사이트에서 AI 채팅 + 디자인 변경 확인

### 알려진 이슈

- Vercel에 ANTHROPIC_API_KEY 미설정 시 AI 채팅 응답 불가

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
