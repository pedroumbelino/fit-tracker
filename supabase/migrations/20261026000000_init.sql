-- Dados da app (um documento JSON por dia, lista de compras, definições, chat).
create table public.user_kv (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index user_kv_updated on public.user_kv (user_id, updated_at);
alter table public.user_kv enable row level security;
create policy "kv: dono" on public.user_kv for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Métricas diárias da app Saúde (via Atalho) e registos manuais (peso).
create table public.health_daily (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  metric text not null check (metric in (
    'steps', 'active_kcal', 'exercise_min', 'resting_hr', 'hrv', 'sleep_h', 'weight', 'body_fat', 'vo2max', 'water_ml'
  )),
  value numeric not null,
  source text not null default 'shortcut',
  updated_at timestamptz not null default now(),
  primary key (user_id, date, metric)
);
alter table public.health_daily enable row level security;
create policy "saude: dono" on public.health_daily for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Token do Atalho: guardamos só o hash. Sem políticas: só a função e o service role lhe acedem.
create table public.ingest_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.ingest_tokens enable row level security;

create or replace function public.create_ingest_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.ingest_tokens (user_id, token_hash)
  values (auth.uid(), encode(sha256(convert_to(token, 'UTF8')), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return token;
end;
$$;
revoke execute on function public.create_ingest_token() from public, anon;
grant execute on function public.create_ingest_token() to authenticated;

-- Registo de chamadas à AI para limitar custos.
create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  mode text not null,
  at timestamptz not null default now()
);
create index ai_calls_user_at on public.ai_calls (user_id, at);
alter table public.ai_calls enable row level security;
