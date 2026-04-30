-- 사용자 환경설정 (default tab config 등) 서버 동기화
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_tab_config jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can read own preferences"
  on public.user_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own preferences"
  on public.user_preferences
  for delete
  using (auth.uid() = user_id);

create or replace function public.update_user_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row
  execute function public.update_user_preferences_updated_at();
