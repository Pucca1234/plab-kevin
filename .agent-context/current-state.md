# Current State — Social Match Dashboard MVP

> 최종 업데이트: 2026-03-05

## 기능 상태

| 기능 | 상태 | 브랜치 | 비고 |
|------|------|--------|------|
| 대시보드 UI (메트릭 테이블, 히트맵) | ✅ 완료 | main | |
| 필터 시스템 (기간/측정단위/필터값/지표) | ✅ 완료 | main | ControlBar + SegmentedButtonGroup |
| AI 분석 리포트 (요약 + 챗) | ✅ 완료 | main | /api/ai/summary, /api/ai/chat |
| 에러 로그 패널 | ✅ 완료 | main | |
| Google OAuth 인증 | 🔧 코드 완료 | feature/auth | Supabase/Google 설정 미완료 |
| 필터 템플릿 저장/불러오기 | 🔧 코드 완료 | feature/auth | DB 마이그레이션 실행 필요 |

## 필터 템플릿 기능 상세

### 구현 완료 항목
- [x] DB 스키마 (filter_templates 테이블, RLS, 트리거)
- [x] API CRUD (/api/filter-templates, /api/filter-templates/[id])
- [x] ControlBar UI (드롭다운 + 저장 다이얼로그)
- [x] page.tsx 템플릿 상태관리 + 핸들러
- [x] CSS 스타일
- [x] TypeScript 타입 체크 통과

### 남은 작업
- [ ] Supabase SQL Editor에서 마이그레이션 실행
- [ ] 인증 설정 완료 후 E2E 테스트

## 인증 기능 상세

### 구현 완료 항목
- [x] 브라우저 클라이언트 (app/lib/supabase/client.ts)
- [x] 서버 클라이언트 (app/lib/supabase/server.ts)
- [x] 미들웨어 (app/lib/supabase/middleware.ts + middleware.ts)
- [x] OAuth 콜백 (app/auth/callback/route.ts)
- [x] 로그인 페이지 (app/login/page.tsx)

### 남은 작업
- [ ] .env.local에 SUPABASE_URL, ANON_KEY 입력
- [ ] Supabase Google Provider 활성화
- [ ] Google Cloud OAuth Client ID 생성
- [ ] 로그인 플로우 E2E 테스트
