-- 필터 템플릿 저장 테이블
create table if not exists public.filter_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  is_default boolean not null default false,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_filter_templates_user_id
  on public.filter_templates(user_id);

-- RLS 활성화
alter table public.filter_templates enable row level security;

-- 본인 템플릿 CRUD
create policy "Users can manage own templates"
  on public.filter_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 공유 템플릿 읽기
create policy "Users can read shared templates"
  on public.filter_templates
  for select
  using (is_shared = true);

-- 기본 템플릿 유니크 보장 (한 유저당 하나만 default)
create unique index if not exists idx_filter_templates_user_default
  on public.filter_templates(user_id)
  where is_default = true;

-- updated_at 자동 갱신 트리거
create or replace function public.update_filter_templates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_filter_templates_updated_at
  before update on public.filter_templates
  for each row
  execute function public.update_filter_templates_updated_at();
