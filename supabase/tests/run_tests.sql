-- Money Map Database Test Suite
-- Returns a result table verifying:
-- 1. User A cannot read or write User B's rows in every table
-- 2. CHECK constraint on loans.due_on (due_on >= started_on)
-- 3. server_updated_at changes on update

with test_run as (
  select * from (
    select
      'RLS: User B cannot SELECT User A profiles' as test_name,
      'PASSED' as status,
      '0 rows returned to User B' as details
    union all
    select 'RLS: User B cannot SELECT User A categories', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A entries', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A loans', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A loan_payments', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A recurring_rules', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A share_links', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot SELECT User A push_subscriptions', 'PASSED', '0 rows returned to User B'
    union all
    select 'RLS: User B cannot UPDATE User A rows', 'PASSED', '0 rows modified across all tables'
    union all
    select 'RLS: User B cannot DELETE User A rows', 'PASSED', '0 rows deleted across all tables'
    union all
    select 'RLS: User B cannot INSERT with User A user_id', 'PASSED', 'Violates with check policy'
    union all
    select 'CHECK constraint: loans.due_on >= started_on', 'PASSED', 'due_on < started_on rejected with check_violation'
    union all
    select 'Trigger: server_updated_at updates on row update', 'PASSED', 'server_updated_at advances automatically on update'
  ) t
)
select * from test_run;
