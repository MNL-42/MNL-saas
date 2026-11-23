-- ============================================================================
--  NACRE · schéma de base de données (Supabase / PostgreSQL)
--  Chaque ligne appartient à un utilisateur (user_id) et n'est lisible /
--  modifiable que par lui (Row Level Security). Rien n'est public.
--  À exécuter une seule fois : Supabase > SQL Editor > New query > Run.
-- ============================================================================

-- ---------- Profil et préférences -------------------------------------------
create table if not exists public.profiles (
  user_id              uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name         text          not null default '',
  language             text          not null default 'fr-FR',
  currency             text          not null default 'EUR',
  timezone             text          not null default 'Europe/Paris',
  date_format          text          not null default 'DD/MM/YYYY',
  accent               text          not null default 'emeraude' check (accent in ('emeraude','corail','saphir','ambre')),
  glass_light          boolean       not null default false,
  animations           boolean       not null default true,
  annual_savings_goal  numeric(16,2) not null default 20000 check (annual_savings_goal >= 0),
  fx_rates             jsonb         not null default '{}'::jsonb,
  auto_round           boolean       not null default false,
  auto_monthly         boolean       not null default false,
  auto_monthly_amount  numeric(16,2) not null default 200 check (auto_monthly_amount >= 0),
  auto_smart           boolean       not null default false,
  last_autosave_month  date,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

-- ---------- Comptes ----------------------------------------------------------
create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null check (length(name) between 1 and 80),
  currency         text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  opening_balance  numeric(16,2) not null default 0,
  is_main          boolean not null default false,
  position         integer not null default 0,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists accounts_user_idx on public.accounts(user_id);

-- ---------- Bénéficiaires (pour « Envoie 250 € à Clara ») --------------------
create table if not exists public.beneficiaries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 80),
  iban        text,
  note        text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists beneficiaries_user_idx on public.beneficiaries(user_id);

-- ---------- Cartes (on ne stocke JAMAIS le numéro complet ni le CVV) ---------
create table if not exists public.cards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id        uuid references public.accounts(id) on delete set null,
  nickname          text not null check (length(nickname) between 1 and 60),
  holder            text not null default '',
  last4             text not null check (last4 ~ '^[0-9]{4}$'),
  expiry            text not null default '' check (expiry = '' or expiry ~ '^(0[1-9]|1[0-2])/[0-9]{2}$'),
  style             text not null default 'dark' check (style in ('dark','emerald','light')),
  monthly_limit     numeric(16,2) not null default 1500 check (monthly_limit >= 0),
  online_payments   boolean not null default true,
  contactless       boolean not null default true,
  atm_withdrawals   boolean not null default false,
  frozen            boolean not null default false,
  position          integer not null default 0,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists cards_user_idx    on public.cards(user_id);
create index if not exists cards_account_idx on public.cards(account_id);

-- ---------- Objectifs d'épargne ----------------------------------------------
create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null check (length(name) between 1 and 80),
  icon            text not null default 'target',
  target_amount   numeric(16,2) not null check (target_amount > 0),
  initial_amount  numeric(16,2) not null default 0 check (initial_amount >= 0),
  due_date        date,
  position        integer not null default 0,
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);

-- ---------- Opérations --------------------------------------------------------
--  kind : income (entrée) | expense (dépense) | transfer (virement envoyé)
--         | saving (versement sur un objectif)
--  amount est toujours positif, le sens vient de « kind ».
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id       uuid not null references public.accounts(id) on delete cascade,
  card_id          uuid references public.cards(id) on delete set null,
  goal_id          uuid references public.goals(id) on delete set null,
  occurred_at      timestamptz not null default now(),
  label            text not null check (length(label) between 1 and 160),
  category         text not null default 'Autre',
  kind             text not null check (kind in ('income','expense','transfer','saving')),
  amount           numeric(16,2) not null check (amount > 0),
  counterparty     text,
  note             text,
  is_subscription  boolean not null default false,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists tx_user_date_idx on public.transactions(user_id, occurred_at desc);
create index if not exists tx_account_idx   on public.transactions(account_id);
create index if not exists tx_card_idx      on public.transactions(card_id);
create index if not exists tx_goal_idx      on public.transactions(goal_id);

-- ---------- Sécurité : Row Level Security ------------------------------------
alter table public.profiles      enable row level security;
alter table public.accounts      enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.cards         enable row level security;
alter table public.goals         enable row level security;
alter table public.transactions  enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "accounts_owner" on public.accounts;
create policy "accounts_owner" on public.accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "beneficiaries_owner" on public.beneficiaries;
create policy "beneficiaries_owner" on public.beneficiaries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "cards_owner" on public.cards;
create policy "cards_owner" on public.cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "goals_owner" on public.goals;
create policy "goals_owner" on public.goals for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- une opération ne peut référencer qu'un compte qui appartient au même utilisateur
drop policy if exists "transactions_owner" on public.transactions;
create policy "transactions_owner" on public.transactions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );

-- ---------- Vues : soldes et montants épargnés (calculés, jamais désynchronisés)
create or replace view public.v_accounts with (security_invoker = true) as
  select a.*,
         a.opening_balance + coalesce(sum(case t.kind when 'income' then t.amount else -t.amount end), 0) as balance
  from public.accounts a
  left join public.transactions t on t.account_id = a.id
  group by a.id;

create or replace view public.v_goals with (security_invoker = true) as
  select g.*,
         g.initial_amount + coalesce(sum(t.amount), 0) as saved_amount
  from public.goals g
  left join public.transactions t on t.goal_id = g.id and t.kind = 'saving'
  group by g.id;

-- ---------- Épargne auto : « Virement mensuel » (idempotent) -----------------
--  Appelée par l'app à chaque ouverture. Crée au plus 3 versements en retard,
--  un par mois écoulé, vers le premier objectif, depuis le compte principal.
create or replace function public.run_autosave(p_amount numeric default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  p      public.profiles%rowtype;
  tz     text;
  v_cur  date;
  v_m    date;
  v_acc  uuid;
  v_goal uuid;
  v_amt  numeric;
  v_n    integer := 0;
begin
  select * into p from public.profiles where user_id = (select auth.uid()) for update;
  if not found or not p.auto_monthly then return 0; end if;

  tz := p.timezone;
  begin
    perform now() at time zone tz;
  exception when others then
    tz := 'UTC';
  end;

  v_cur := date_trunc('month', (now() at time zone tz))::date;

  if p.last_autosave_month is null then
    update public.profiles set last_autosave_month = v_cur where user_id = p.user_id;
    return 0;
  end if;

  v_amt := coalesce(p_amount, p.auto_monthly_amount);
  select id into v_acc  from public.accounts where user_id = p.user_id order by is_main desc, position, created_at limit 1;
  select id into v_goal from public.goals    where user_id = p.user_id order by position, created_at limit 1;

  v_m := (p.last_autosave_month + interval '1 month')::date;
  while v_m <= v_cur and v_n < 3 loop
    if v_acc is not null and v_goal is not null and v_amt > 0 then
      insert into public.transactions (account_id, goal_id, kind, label, category, amount, occurred_at)
      values (v_acc, v_goal, 'saving', 'Virement mensuel', 'Épargne', v_amt,
              ((v_m::timestamp + time '09:00') at time zone tz));
      v_n := v_n + 1;
    end if;
    v_m := (v_m + interval '1 month')::date;
  end loop;

  update public.profiles set last_autosave_month = v_cur, updated_at = now() where user_id = p.user_id;
  return v_n;
end;
$$;

revoke all on function public.run_autosave(numeric) from public, anon;
grant execute on function public.run_autosave(numeric) to authenticated;

-- ---------- Droits : rien pour les visiteurs anonymes ------------------------
revoke all on public.profiles, public.accounts, public.beneficiaries, public.cards,
              public.goals, public.transactions, public.v_accounts, public.v_goals from anon;
grant select, insert, update, delete on public.profiles, public.accounts, public.beneficiaries,
              public.cards, public.goals, public.transactions to authenticated;
grant select on public.v_accounts, public.v_goals to authenticated;
