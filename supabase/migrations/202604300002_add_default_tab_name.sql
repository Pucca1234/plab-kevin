-- 기본 탭 이름 서버 동기화
alter table public.user_preferences
  add column if not exists default_tab_name text;
