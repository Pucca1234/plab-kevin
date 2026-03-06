# Current State — Social Match Dashboard MVP

> 최종 업데이트: 2026-03-06

## 기능 상태

| 기능 | 상태 | 브랜치 | 비고 |
|------|------|--------|------|
| 대시보드 UI (메트릭 테이블, 히트맵) | ✅ 완료 | main | |
| 필터 시스템 (기간/측정단위/필터값/지표) | ✅ 완료 | main | ControlBar + SegmentedButtonGroup |
| AI 플로팅 채팅 위젯 | ✅ 완료 | main | 아바타 애니메이션 + 슬라이드업 채팅 + OpenAI GPT 연동 |
| 에러 로그 패널 | ✅ 완료 | main | |
| Google OAuth 인증 | ✅ 완료 | main | 로그인/로그아웃/사용자명 표시 |
| 필터 템플릿 저장/불러오기 | ✅ 완료 | main | DB 마이그레이션 실행 완료 |
| 필터 초기화 버튼 | ✅ 완료 | main | 필터 옆 위치 |

## 배포 상태

| 환경 | URL | 상태 |
|------|-----|------|
| 로컬 | http://localhost:3000 | ✅ 작동 |
| 프로덕션 (본인) | https://social-match-dashboard-mvp-two.vercel.app | ✅ 배포 완료 |
| 프로덕션 (기존) | https://social-match-dashboard-mvp.vercel.app | 환경변수 미설정 |

## Git 상태
- 현재 브랜치: `main`
- feature/auth → main 머지 완료 + 푸시 완료
- 포크: `sanghyunkim-gif/social-match-dashboard-mvp` (Vercel 배포용)
- 원본: `Pucca1234/social-match-dashboard-mvp`
- remote `origin` = Pucca1234, remote `fork` = sanghyunkim-gif
- origin/main, fork/main 모두 5dbad7b 동기화 완료 (2026-03-06)

## 외부 설정 완료 항목
- [x] .env.local 환경변수 4개 + CLIENT_ID/SECRET
- [x] Supabase Google Provider 활성화
- [x] Google Cloud OAuth Client ID 생성
- [x] Supabase Site URL → 배포 URL로 변경
- [x] Supabase Redirect URLs → 배포 + localhost 콜백 추가
- [x] Google Cloud Authorized origins/redirects → 배포 URL 추가
- [x] Supabase filter_templates 마이그레이션 실행

## 인증 기능 상세

### 구현 완료 항목
- [x] 브라우저 클라이언트 (app/lib/supabase/client.ts)
- [x] 서버 클라이언트 (app/lib/supabase/server.ts)
- [x] 미들웨어 (app/lib/supabase/middleware.ts + middleware.ts)
- [x] OAuth 콜백 (app/auth/callback/route.ts)
- [x] 로그인 페이지 (app/login/page.tsx)
- [x] 로그아웃 버튼 (헤더 header-meta 영역)
- [x] 사용자 이름 표시 (Google 프로필 이름)

## 필터 템플릿 기능 상세

### 구현 완료 항목
- [x] DB 스키마 (filter_templates 테이블, RLS, 트리거)
- [x] API CRUD (/api/filter-templates, /api/filter-templates/[id])
- [x] ControlBar UI (드롭다운 + 저장 다이얼로그)
- [x] 필터 초기화 버튼 (필터 드롭다운 옆)

## 버그 수정 이력

| 날짜 | 버그 | 수정 내용 | 커밋 |
|------|------|-----------|------|
| 2026-03-06 | 지표 전체 해제 시 즉시 기본값 복원 | useRef로 초기화 1회 제한 | 5dbad7b |
| 2026-03-06 | 메트릭 피커 중첩 button (HTML 규격 위반) | div[role=button]으로 변경 | 5dbad7b |

## AI 채팅 위젯 상세

### 구현 완료 항목
- [x] 플로팅 아바타 버튼 (우측 하단, idle 애니메이션)
- [x] 슬라이드업 채팅 패널 (400px, max-height 70vh)
- [x] OpenAI GPT-4o-mini 연동 (OPENAI_API_KEY 필요)
- [x] API 키 미설정 시 기존 템플릿 fallback
- [x] 요약 자동 삽입 (첫 어시스턴트 메시지)
- [x] 추천 질문 칩 3개
- [x] 타이핑 인디케이터 (3-dot bounce)
- [x] 반응형 (720px 이하 전체 너비)
- [x] 대화 히스토리 전송 (최근 20개)

### 주요 파일
- `app/components/AiChat.tsx` — 플로팅 채팅 위젯 컴포넌트
- `app/api/ai/chat/route.ts` — OpenAI GPT + fallback API
- `public/ai-avatar.png` — AI 아바타 이미지

## 남은 작업
- .env.local에 OPENAI_API_KEY 추가 (GPT 응답 활성화)
- Vercel 환경변수에 OPENAI_API_KEY 추가 (배포 시)
