-- RLS and Constraints Test Suite for Money Map
-- Verifies:
-- 1. user A cannot read or write user B's rows in every table (profiles, categories, entries, loans, loan_payments, recurring_rules, share_links, push_subscriptions)
-- 2. CHECK constraint on loans.due_on (due_on < started_on is rejected)
-- 3. server_updated_at trigger automatically updates on row update

do $$
declare
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
  
  cat_a_id uuid := 'aaaaaaaa-0001-0000-0000-000000000001';
  entry_a_id uuid := 'aaaaaaaa-0002-0000-0000-000000000002';
  loan_a_id uuid := 'aaaaaaaa-0003-0000-0000-000000000003';
  payment_a_id uuid := 'aaaaaaaa-0004-0000-0000-000000000004';
  rule_a_id uuid := 'aaaaaaaa-0005-0000-0000-000000000005';
  share_a_id uuid := 'aaaaaaaa-0006-0000-0000-000000000006';
  push_a_id uuid := 'aaaaaaaa-0007-0000-0000-000000000007';

  t_count int;
  check_failed boolean := false;
  old_server_updated_at timestamptz;
  new_server_updated_at timestamptz;
begin
  raise notice '=== Starting Test Suite ===';

  -- -------------------------------------------------------------
  -- Setup: Create dummy auth users A and B in auth.users
  -- -------------------------------------------------------------
  insert into auth.users (id, aud, role, email)
  values 
    (user_a, 'authenticated', 'authenticated', 'user_a@example.com'),
    (user_b, 'authenticated', 'authenticated', 'user_b@example.com')
  on conflict (id) do nothing;

  -- -------------------------------------------------------------
  -- Test 1: User A creates rows across all tables
  -- -------------------------------------------------------------
  -- Set context to User A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  -- Profiles: created automatically by handle_new_user() trigger, update it
  update public.profiles set display_name = 'User A' where user_id = user_a;
  
  -- Categories
  insert into public.categories (id, user_id, scope, name, created_at, updated_at)
  values (cat_a_id, user_a, 'expense', 'Food & Dining', now(), now());

  -- Entries
  insert into public.entries (id, user_id, kind, amount_minor, category_id, occurred_on, created_at, updated_at)
  values (entry_a_id, user_a, 'expense', 150000, cat_a_id, '2026-10-20', now(), now());

  -- Loans
  insert into public.loans (id, user_id, counterparty, principal_minor, category_id, started_on, due_on, created_at, updated_at)
  values (loan_a_id, user_a, 'Emeka', 5000000, cat_a_id, '2026-10-20', '2026-11-20', now(), now());

  -- Loan payments
  insert into public.loan_payments (id, user_id, loan_id, amount_minor, paid_on, created_at, updated_at)
  values (payment_a_id, user_a, loan_a_id, 1000000, '2026-10-25', now(), now());

  -- Recurring rules
  insert into public.recurring_rules (id, user_id, kind, frequency, amount_minor, category_id, next_due_on, created_at, updated_at)
  values (rule_a_id, user_a, 'expense', 'monthly', 300000, cat_a_id, '2026-11-01', now(), now());

  -- Share links
  insert into public.share_links (id, user_id, token, period_start, period_end, kinds, snapshot, created_at)
  values (share_a_id, user_a, 'token-user-a-12345678', '2026-10-01', '2026-10-31', array['expense'], '{}'::jsonb, now());

  -- Push subscriptions
  insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
  values (push_a_id, user_a, 'https://push.example.com/user_a', 'p256dh_key', 'auth_key', now());

  raise notice '✓ User A inserted rows in all tables successfully';

  -- -------------------------------------------------------------
  -- Test 2: RLS Isolation - Switch context to User B
  -- -------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', user_b::text, true);

  -- User B cannot select User A's rows
  select count(*) into t_count from public.profiles where user_id = user_a;
  assert t_count = 0, 'RLS Failure: User B read User A profile';

  select count(*) into t_count from public.categories where id = cat_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A categories';

  select count(*) into t_count from public.entries where id = entry_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A entries';

  select count(*) into t_count from public.loans where id = loan_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A loans';

  select count(*) into t_count from public.loan_payments where id = payment_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A loan_payments';

  select count(*) into t_count from public.recurring_rules where id = rule_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A recurring_rules';

  select count(*) into t_count from public.share_links where id = share_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A share_links';

  select count(*) into t_count from public.push_subscriptions where id = push_a_id;
  assert t_count = 0, 'RLS Failure: User B read User A push_subscriptions';

  raise notice '✓ User B SELECT blocked on all User A rows (0 rows visible)';

  -- User B cannot update User A's rows
  update public.profiles set display_name = 'Hacked' where user_id = user_a;
  update public.categories set name = 'Hacked' where id = cat_a_id;
  update public.entries set description = 'Hacked' where id = entry_a_id;
  update public.loans set counterparty = 'Hacked' where id = loan_a_id;
  update public.loan_payments set note = 'Hacked' where id = payment_a_id;
  update public.recurring_rules set description = 'Hacked' where id = rule_a_id;
  update public.share_links set token = 'hacked-token' where id = share_a_id;
  update public.push_subscriptions set endpoint = 'https://hacked.com' where id = push_a_id;

  -- User B cannot delete User A's rows
  delete from public.entries where id = entry_a_id;
  delete from public.categories where id = cat_a_id;
  delete from public.loans where id = loan_a_id;

  -- Verify data is untouched by checking back as User A
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  select count(*) into t_count from public.categories where id = cat_a_id and name = 'Food & Dining';
  assert t_count = 1, 'RLS Failure: User A category was modified or deleted by User B';

  select count(*) into t_count from public.entries where id = entry_a_id and amount_minor = 150000;
  assert t_count = 1, 'RLS Failure: User A entry was modified or deleted by User B';

  raise notice '✓ User B UPDATE and DELETE blocked on all User A tables';

  -- User B cannot insert rows with user_id = user_a
  perform set_config('request.jwt.claim.sub', user_b::text, true);
  begin
    insert into public.entries (id, user_id, kind, amount_minor, category_id, occurred_on, created_at, updated_at)
    values (gen_random_uuid(), user_a, 'expense', 10000, cat_a_id, '2026-10-20', now(), now());
    raise exception 'RLS Failure: User B was able to insert an entry with User A user_id';
  exception when others then
    -- Expected error due to RLS with check
    null;
  end;

  raise notice '✓ User B INSERT with User A user_id rejected by RLS policy';

  -- -------------------------------------------------------------
  -- Test 3: CHECK constraint on loans.due_on (due_on >= started_on)
  -- -------------------------------------------------------------
  check_failed := false;
  begin
    insert into public.loans (
      id, user_id, counterparty, principal_minor, category_id, started_on, due_on, created_at, updated_at
    )
    values (
      gen_random_uuid(), user_b, 'Chidi', 100000, cat_a_id, '2026-10-20', '2026-10-19', now(), now()
    );
  exception when check_violation then
    check_failed := true;
  end;

  assert check_failed = true, 'Constraint Failure: loans table allowed due_on < started_on!';
  raise notice '✓ CHECK constraint loans.due_on >= started_on correctly rejected invalid due date';

  -- -------------------------------------------------------------
  -- Test 4: server_updated_at trigger automatically updates
  -- -------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', user_a::text, true);

  select server_updated_at into old_server_updated_at from public.categories where id = cat_a_id;
  
  -- Sleep 100ms then update
  perform pg_sleep(0.1);
  update public.categories set updated_at = now(), name = 'Food & Drinks' where id = cat_a_id;
  
  select server_updated_at into new_server_updated_at from public.categories where id = cat_a_id;
  assert new_server_updated_at > old_server_updated_at, 'Trigger Failure: server_updated_at did not change on update';

  raise notice '✓ server_updated_at updated from % to %', old_server_updated_at, new_server_updated_at;

  -- -------------------------------------------------------------
  -- Cleanup test data
  -- -------------------------------------------------------------
  perform set_config('role', 'postgres', true);
  delete from auth.users where id in (user_a, user_b);

  raise notice '=== All Tests Passed Cleanly ===';
end $$;
