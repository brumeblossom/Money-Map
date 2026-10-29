-- Migration: Admin Analytics Function
-- Provides aggregate analytics for admin dashboard only.
-- Enforces SECURITY DEFINER with execution restricted exclusively to the service_role.

create or replace function public.get_admin_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_total_accounts int;
  v_new_signups_7d int;
  v_new_signups_30d int;
  v_active_users_7d int;
  v_active_users_30d int;
  v_total_entries int;
  v_month_start date;
  v_month_end date;
  v_entries_income_month int;
  v_entries_expenses_month int;
  v_entries_giving_month int;
  v_loans_lent_month int;
  v_entries_30d int;
  v_avg_entries_30d numeric;
  v_signups_weekly jsonb;
  v_active_weekly jsonb;
begin
  -- 1. Total accounts
  select count(*)::int into v_total_accounts from auth.users;

  -- 2. New signups (7 days, 30 days)
  select count(*)::int into v_new_signups_7d
  from auth.users
  where created_at >= (clock_timestamp() - interval '7 days');

  select count(*)::int into v_new_signups_30d
  from auth.users
  where created_at >= (clock_timestamp() - interval '30 days');

  -- 3. Active users (created or updated entries, loans, loan_payments, recurring_rules in window)
  select count(distinct user_id)::int into v_active_users_7d from (
    select user_id from public.entries where (created_at >= clock_timestamp() - interval '7 days' or updated_at >= clock_timestamp() - interval '7 days' or server_updated_at >= clock_timestamp() - interval '7 days')
    union
    select user_id from public.loans where (created_at >= clock_timestamp() - interval '7 days' or updated_at >= clock_timestamp() - interval '7 days' or server_updated_at >= clock_timestamp() - interval '7 days')
    union
    select user_id from public.loan_payments where (created_at >= clock_timestamp() - interval '7 days' or updated_at >= clock_timestamp() - interval '7 days' or server_updated_at >= clock_timestamp() - interval '7 days')
    union
    select user_id from public.recurring_rules where (created_at >= clock_timestamp() - interval '7 days' or updated_at >= clock_timestamp() - interval '7 days' or server_updated_at >= clock_timestamp() - interval '7 days')
  ) u7;

  select count(distinct user_id)::int into v_active_users_30d from (
    select user_id from public.entries where (created_at >= clock_timestamp() - interval '30 days' or updated_at >= clock_timestamp() - interval '30 days' or server_updated_at >= clock_timestamp() - interval '30 days')
    union
    select user_id from public.loans where (created_at >= clock_timestamp() - interval '30 days' or updated_at >= clock_timestamp() - interval '30 days' or server_updated_at >= clock_timestamp() - interval '30 days')
    union
    select user_id from public.loan_payments where (created_at >= clock_timestamp() - interval '30 days' or updated_at >= clock_timestamp() - interval '30 days' or server_updated_at >= clock_timestamp() - interval '30 days')
    union
    select user_id from public.recurring_rules where (created_at >= clock_timestamp() - interval '30 days' or updated_at >= clock_timestamp() - interval '30 days' or server_updated_at >= clock_timestamp() - interval '30 days')
  ) u30;

  -- 4. Total entries (not deleted)
  select count(*)::int into v_total_entries
  from public.entries
  where deleted_at is null;

  -- 5. Entries this month
  v_month_start := date_trunc('month', (now() at time zone 'UTC'))::date;
  v_month_end := (date_trunc('month', (now() at time zone 'UTC')) + interval '1 month' - interval '1 day')::date;

  select count(*)::int into v_entries_income_month
  from public.entries
  where deleted_at is null and kind = 'income' and occurred_on >= v_month_start and occurred_on <= v_month_end;

  select count(*)::int into v_entries_expenses_month
  from public.entries
  where deleted_at is null and kind = 'expense' and occurred_on >= v_month_start and occurred_on <= v_month_end;

  select count(*)::int into v_entries_giving_month
  from public.entries
  where deleted_at is null and kind = 'giving' and occurred_on >= v_month_start and occurred_on <= v_month_end;

  select count(*)::int into v_loans_lent_month
  from public.loans
  where deleted_at is null and started_on >= v_month_start and started_on <= v_month_end;

  -- 6. Average entries per active user (last 30 days)
  select count(*)::int into v_entries_30d
  from public.entries
  where deleted_at is null and (created_at >= clock_timestamp() - interval '30 days' or occurred_on >= (current_date - 30));

  if v_active_users_30d > 0 then
    v_avg_entries_30d := round((v_entries_30d::numeric / v_active_users_30d), 1);
  else
    v_avg_entries_30d := 0;
  end if;

  -- 7. Charts: 12-week signups and active users
  with weeks as (
    select
      (date_trunc('week', now() at time zone 'UTC') - (n * interval '1 week'))::date as w_start,
      (date_trunc('week', now() at time zone 'UTC') - (n * interval '1 week') + interval '7 days') as w_end
    from generate_series(11, 0, -1) as n
  )
  select jsonb_agg(
    jsonb_build_object(
      'week_start', to_char(w.w_start, 'YYYY-MM-DD'),
      'count', coalesce((
        select count(*)::int
        from auth.users u
        where u.created_at >= w.w_start and u.created_at < w.w_end
      ), 0)
    )
  ) into v_signups_weekly
  from weeks w;

  with weeks as (
    select
      (date_trunc('week', now() at time zone 'UTC') - (n * interval '1 week'))::date as w_start,
      (date_trunc('week', now() at time zone 'UTC') - (n * interval '1 week') + interval '7 days') as w_end
    from generate_series(11, 0, -1) as n
  )
  select jsonb_agg(
    jsonb_build_object(
      'week_start', to_char(w.w_start, 'YYYY-MM-DD'),
      'count', coalesce((
        select count(distinct user_id)::int from (
          select user_id from public.entries where (created_at >= w.w_start and created_at < w.w_end) or (updated_at >= w.w_start and updated_at < w.w_end)
          union
          select user_id from public.loans where (created_at >= w.w_start and created_at < w.w_end) or (updated_at >= w.w_start and updated_at < w.w_end)
          union
          select user_id from public.loan_payments where (created_at >= w.w_start and created_at < w.w_end) or (updated_at >= w.w_start and updated_at < w.w_end)
          union
          select user_id from public.recurring_rules where (created_at >= w.w_start and created_at < w.w_end) or (updated_at >= w.w_start and updated_at < w.w_end)
        ) act
      ), 0)
    )
  ) into v_active_weekly
  from weeks w;

  return jsonb_build_object(
    'total_accounts', v_total_accounts,
    'new_signups_7d', v_new_signups_7d,
    'new_signups_30d', v_new_signups_30d,
    'active_users_7d', v_active_users_7d,
    'active_users_30d', v_active_users_30d,
    'total_entries', v_total_entries,
    'entries_this_month', jsonb_build_object(
      'income', v_entries_income_month,
      'expenses', v_entries_expenses_month,
      'giving', v_entries_giving_month,
      'lent', v_loans_lent_month,
      'total', v_entries_income_month + v_entries_expenses_month + v_entries_giving_month + v_loans_lent_month
    ),
    'avg_entries_per_active_user_30d', v_avg_entries_30d,
    'signups_per_week', coalesce(v_signups_weekly, '[]'::jsonb),
    'active_users_per_week', coalesce(v_active_weekly, '[]'::jsonb),
    'generated_at', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
end;
$$;

revoke all on function public.get_admin_analytics() from public;
revoke all on function public.get_admin_analytics() from anon;
revoke all on function public.get_admin_analytics() from authenticated;
grant execute on function public.get_admin_analytics() to service_role;

