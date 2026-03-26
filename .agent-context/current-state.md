# Current State — Social Match Dashboard MVP

> 최종 업데이트: 2026-03-19 (세션 10)

## 기능 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 대시보드 UI (메트릭 테이블, 히트맵) | ✅ 완료 | |
| 필터 시스템 (기간/측정단위/필터값/지표) | ✅ 완료 | ControlBar + SegmentedButtonGroup |
| AI 사이드 패널 채팅 | ✅ 완료 | 오른쪽 고정 패널 (400px) + 멀티 세션 |
| AI 채팅 차트 렌더링 | ✅ 완료 | recharts 기반 인라인 차트 (line/bar) |
| AI 컨텍스트 엔티티 데이터 전달 | ✅ 완료 | 전체 엔티티 전달 (제한 제거) + 지표 기준 내림차순 정렬 |
| AI 마크다운 렌더링 | ✅ 완료 | 헤딩/리스트/간격 HTML 렌더링 |
| AI 시스템 프롬프트 개선 | ✅ 완료 | 데이터 상단 배치 + 엔티티 활용 유도 + 정렬 기준 안내 |
| AI 모델 라우팅 | ✅ 완료 | 단순 조회→Sonnet, 분석→Opus 자동 선택 |
| AI 채팅 입력 개선 | ✅ 완료 | Shift+Enter 줄바꿈 지원 |
| 에러 로그 패널 | ✅ 완료 | |
| Google OAuth 인증 | ✅ 완료 | 로그인/로그아웃/사용자명 표시 |
| 필터 템플릿 저장/불러오기 | ✅ 완료 | DB 마이그레이션 실행 완료 |
| 필터 초기화 버튼 | ✅ 완료 | |
| Entity Drilldown | ✅ 완료 | 엔티티 클릭 → 하위 단위 드릴다운 |
| CDO 디자인 업그레이드 v3 | ✅ 완료 | Deep Teal + UI/UX 전면 리디자인 |

## 배포 상태

| 환경 | URL | 상태 |
|------|-----|------|
| 로컬 | http://localhost:3000 | ✅ 작동 |
| 프로덕션 | https://social-match-dashboard-mvp-two.vercel.app | ✅ 배포 완료 |

## Git 상태
- 현재 브랜치: `main`
- remote `origin` = Pucca1234/social-match-dashboard-mvp
- remote `fork` = sanghyunkim-gif/social-match-dashboard-mvp
- origin/main, fork/main 모두 f3d14b1 동기화 완료 (2026-03-19)

## 환경변수

### .env.local
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- CLIENT_ID, CLIENT_SECRET (Google OAuth)
- ANTHROPIC_API_KEY (Claude AI 채팅)

### Vercel 환경변수
- Supabase 4개: 설정 완료
- ANTHROPIC_API_KEY: **설정 필요** (Vercel Settings → Environment Variables)

## 디자인 시스템

### 색상 팔레트 (v3 — Deep Teal Premium)
| Token | Value | 용도 |
|-------|-------|------|
| --primary | #0D9488 | CTA, 활성 상태, 링크, 차트 주색 |
| --primary-hover | #0F766E | 호버 |
| --primary-soft | rgba(13,148,136,0.08) | 소프트 배경 |
| --bg | #FAFBFC | 앱 배경 |
| --ink | #0F172A | 본문 텍스트 |
| --muted | #64748B | 보조 텍스트 |
| --border | #E2E8F0 | 테두리 |

### 폰트
- Display: Outfit
- Body: Pretendard
- Mono: JetBrains Mono

### UI/UX 특징 (v3)
- Glassmorphism header (backdrop-blur + gradient accent bar)
- Card hover lift 효과 (translateY -2px + shadow)
- Data table: uppercase header, zebra striping, pill badge delta
- AI chat: gradient user bubble, glow send button
- Micro-interactions: focus-visible rings, overlay animations, spring transitions
- Custom scrollbar (6px thin)
- 브랜드 마크 SVG + 아이콘 시스템 (인라인 SVG)

## AI 채팅 사이드 패널 상세

### 구현 완료 항목
- [x] 오른쪽 고정 사이드 패널 (400px, position: fixed)
- [x] 멀티 세션 지원 (탭 전환, 새 대화 생성, 세션 닫기)
- [x] 첫 메시지 기반 세션 제목 자동 생성
- [x] Claude API 연동 (ANTHROPIC_API_KEY)
- [x] 자동 필터 적용 (AI → 대시보드 필터 연동)
- [x] 추천 질문 칩 (초기 + 동적)
- [x] 타이핑 인디케이터
- [x] 패널 토글 (닫기/열기 버튼)
- [x] 모바일 반응형 (전체폭 오버레이)

### 주요 파일
- `app/components/AiChat.tsx` — 사이드 패널 채팅 (멀티 세션)
- `app/components/chat/ChatMessageRenderer.tsx` — 메시지 렌더링
- `app/components/chat/ChatChart.tsx` — recharts 인라인 차트
- `app/api/ai/chat/route.ts` — Claude API 라우트

## 남은 작업
- Vercel 배포 확인 (f3d14b1 커밋 빌드 통과 여부)
- AI 분석 품질 추가 검증 (전체 엔티티 기반 정확한 순위/분석 확인)
