-- Migration: Initial schema and security rules for Money Map
-- PRD Section 6

-- 1. Custom Enum Types
create type entry_kind as enum ('income', 'expense', 'giving');
create type category_scope as enum ('income', 'expense', 'giving', 'lent');
create type repeat_plan as enum ('one_payment', 'weekly', 'monthly');
create type interest_kind as enum ('none', 'percent', 'flat');

-- 2. Tables

-- profiles (PRD 6.1)
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  currency char(3) not null default 'NGN',
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- categories (PRD 6.1)
create table categories (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  scope category_scope not null,
  name text not null check (char_length(name) between 1 and 40),
  slug text,                      -- set for built-in defaults, e.g. 'food'
  is_default boolean not null default false,
  is_hidden boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now(),
  unique (user_id, scope, name)
);

-- entries (PRD 6.1)
create table entries (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind entry_kind not null,
  amount_minor bigint not null check (amount_minor > 0),
  category_id uuid not null references categories(id),
  occurred_on date not null,
  counterparty text check (char_length(counterparty) <= 80),
  description text check (char_length(description) <= 500),
  recurring_rule_id uuid,         -- set when created from a reminder
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

create index entries_user_date on entries (user_id, occurred_on desc) where deleted_at is null;
create index entries_user_kind_cat on entries (user_id, kind, category_id);

-- loans (PRD 6.1)
create table loans (              -- money the user lent to someone
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  counterparty text not null check (char_length(counterparty) between 1 and 80),
  principal_minor bigint not null check (principal_minor > 0),
  category_id uuid not null references categories(id),
  started_on date not null,
  due_on date not null check (due_on >= started_on),
  plan repeat_plan not null default 'one_payment',
  instalment_minor bigint check (instalment_minor > 0),
  interest_type interest_kind not null default 'none',
  interest_value bigint not null default 0,  -- bps if percent, minor units if flat
  remind boolean not null default true,
  description text check (char_length(description) <= 500),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

-- loan_payments (PRD 6.1)
create table loan_payments (      -- money received back
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  paid_on date not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

-- recurring_rules (PRD 6.1)
create table recurring_rules (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind entry_kind not null,
  frequency repeat_plan not null check (frequency in ('weekly','monthly')),
  amount_minor bigint not null check (amount_minor > 0),
  category_id uuid not null references categories(id),
  counterparty text,
  description text,
  next_due_on date not null,
  is_paused boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  server_updated_at timestamptz not null default now()
);

-- share_links (PRD 6.1 - server only)
create table share_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  token text not null unique,     -- 22-char random, URL-safe
  period_start date not null,
  period_end date not null,
  kinds text[] not null,
  hide_details boolean not null default true,
  snapshot jsonb not null,        -- totals, category breakdown, entry rows
  expires_at timestamptz,         -- null = never
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- push_subscriptions (PRD 6.1 - server only)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- 3. Trigger Function: set_server_updated_at() (PRD 6.2)
create or replace function public.set_server_updated_at()
returns trigger as $$
begin
  new.server_updated_at = clock_timestamp();
  return new;
end;
$$ language plpgsql;

create trigger set_categories_server_updated_at
  before insert or update on public.categories
  for each row execute function public.set_server_updated_at();

create trigger set_entries_server_updated_at
  before insert or update on public.entries
  for each row execute function public.set_server_updated_at();

create trigger set_loans_server_updated_at
  before insert or update on public.loans
  for each row execute function public.set_server_updated_at();

create trigger set_loan_payments_server_updated_at
  before insert or update on public.loan_payments
  for each row execute function public.set_server_updated_at();

create trigger set_recurring_rules_server_updated_at
  before insert or update on public.recurring_rules
  for each row execute function public.set_server_updated_at();

-- 4. Trigger Function: handle_new_user() -> create default profile (PRD 6.2)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, currency, notifications_enabled, created_at, updated_at)
  values (new.id, 'NGN', false, now(), now())
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Row Level Security (RLS) on every table (PRD 6.2)
alter table profiles enable row level security;
alter table categories enable row level security;
alter table entries enable row level security;
alter table loans enable row level security;
alter table loan_payments enable row level security;
alter table recurring_rules enable row level security;
alter table share_links enable row level security;
alter table push_subscriptions enable row level security;

-- Policies: profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own profile" on profiles
  for delete using (auth.uid() = user_id);

-- Policies: categories
create policy "Users can view own categories" on categories
  for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on categories
  for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own categories" on categories
  for delete using (auth.uid() = user_id);

-- Policies: entries
create policy "Users can view own entries" on entries
  for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on entries
  for insert with check (auth.uid() = user_id);
create policy "Users can update own entries" on entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own entries" on entries
  for delete using (auth.uid() = user_id);

-- Policies: loans
create policy "Users can view own loans" on loans
  for select using (auth.uid() = user_id);
create policy "Users can insert own loans" on loans
  for insert with check (auth.uid() = user_id);
create policy "Users can update own loans" on loans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own loans" on loans
  for delete using (auth.uid() = user_id);

-- Policies: loan_payments
create policy "Users can view own loan_payments" on loan_payments
  for select using (auth.uid() = user_id);
create policy "Users can insert own loan_payments" on loan_payments
  for insert with check (auth.uid() = user_id);
create policy "Users can update own loan_payments" on loan_payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own loan_payments" on loan_payments
  for delete using (auth.uid() = user_id);

-- Policies: recurring_rules
create policy "Users can view own recurring_rules" on recurring_rules
  for select using (auth.uid() = user_id);
create policy "Users can insert own recurring_rules" on recurring_rules
  for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring_rules" on recurring_rules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own recurring_rules" on recurring_rules
  for delete using (auth.uid() = user_id);

-- Policies: share_links (public reads use service role per PRD 6.2, user manages own)
create policy "Users can view own share_links" on share_links
  for select using (auth.uid() = user_id);
create policy "Users can insert own share_links" on share_links
  for insert with check (auth.uid() = user_id);
create policy "Users can update own share_links" on share_links
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own share_links" on share_links
  for delete using (auth.uid() = user_id);

-- Policies: push_subscriptions
create policy "Users can view own push_subscriptions" on push_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own push_subscriptions" on push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own push_subscriptions" on push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own push_subscriptions" on push_subscriptions
  for delete using (auth.uid() = user_id);
