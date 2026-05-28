# 인증 및 접근 PRD

## 목적
로그인, OAuth 콜백, 운영 도메인 정합성, 로그인 후 진입 흐름을 정의합니다.

## 범위
- 로그인 페이지
- Google OAuth 로그인
- Supabase 세션 교환
- canonical URL 강제
- 로그인 실패 시 복구 흐름

## 구현 진입점
- `app/login/page.tsx`
- `app/auth/callback/route.ts`
- `app/lib/supabase/client.ts`
- `app/lib/supabase/server.ts`
- `app/lib/supabase/requestUser.ts`

## 현재 동작
### 로그인 페이지
- 사용자는 `/login`에서 Google OAuth 로그인 버튼을 통해 로그인합니다.
- 브라우저 환경 변수 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 없으면 로그인 시도를 막고 오류를 표시합니다.
- 로그인 페이지는 `NEXT_PUBLIC_APP_URL`이 있으면 현재 origin과 비교해 canonical origin으로 강제 이동합니다.

### OAuth 시작
- `signInWithOAuth` provider는 `google`입니다.
- redirect target은 `${NEXT_PUBLIC_APP_URL}/auth/callback` 또는 현재 origin 기준 `/auth/callback`입니다.

### OAuth 콜백
- `/auth/callback`은 query string의 `code`를 사용해 Supabase 세션 교환을 시도합니다.
- 세션 교환 성공 시 `NEXT_PUBLIC_APP_URL` 또는 `APP_URL` 또는 현재 origin으로 리다이렉트합니다.
- 실패 시 `/login?error=auth_callback_error`로 돌려보냅니다.

### 로그인 페이지의 code 처리
- `/login?code=...` 형태로 직접 유입된 경우에도 브라우저에서 `exchangeCodeForSession`을 시도합니다.
- 성공 시 canonical app URL로 이동합니다.
- 실패 시 에러 메시지를 페이지에 표시합니다.

## 운영 규칙
- canonical 운영 URL은 `NEXT_PUBLIC_APP_URL` 기준으로 맞춥니다.
- 로그인 흐름은 다른 보조 도메인이 아니라 canonical URL로 수렴해야 합니다.
- 브라우저 세션 상태와 API 인증 상태가 어긋나지 않도록 token 기반 인증 경로를 함께 유지해야 합니다.

## 예외 케이스
- 환경 변수가 없을 때는 로그인 버튼이 동작하더라도 명확한 오류를 반환해야 합니다.
- 잘못된 redirect domain으로 유입된 경우 canonical origin으로 재이동해야 합니다.
- OAuth code가 만료되었거나 잘못되었을 때는 로그인 화면에서 복구 가능해야 합니다.

## 검증 항목
- `/login`에서 Google 로그인 버튼이 정상 동작하는지 확인
- 다른 origin으로 로그인 페이지를 열었을 때 canonical URL로 이동하는지 확인
- `/auth/callback?code=...`에서 세션 교환 후 메인으로 이동하는지 확인
- `/login?code=...` 직접 유입 시에도 세션 교환이 가능한지 확인
- 실패 시 `/login?error=auth_callback_error` 또는 페이지 오류 메시지가 노출되는지 확인

## 관련 이력
- 운영 로그인 도메인 혼선과 redirect 문제를 해결하기 위해 canonical URL 기준 정리가 반영됨
- 새 프로젝트 분리 이후에도 로그인 후 잘못된 도메인으로 이동하지 않도록 보정됨
