-- Notificações (Web Push) e lembretes agendados.

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push: dono" on public.push_subscriptions for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Par de chaves VAPID, gerado pela função reminders. Sem políticas: só o service role lhe acede.
create table public.push_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null
);
alter table public.push_config enable row level security;

-- Um registo por lembrete enviado por dia, para nunca repetir.
create table public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, day)
);
alter table public.push_log enable row level security;

-- A cada 15 minutos, a função decide que lembretes estão devidos (hora de Lisboa).
create extension if not exists pg_net;
create extension if not exists pg_cron;
select cron.schedule(
  'forma-lembretes',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://ahbsdjmfltobkuspjpit.supabase.co/functions/v1/reminders',
       headers := '{"Content-Type": "application/json"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
