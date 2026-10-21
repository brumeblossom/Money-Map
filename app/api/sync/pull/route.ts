import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSyncRateLimit } from "@/lib/sync/rate-limit";

const PULL_LIMIT_PER_TABLE = 2000;

export async function GET(req: NextRequest) {
  // 1. Session Authentication (PRD section 7: 401 without a session)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Rate Limiting (PRD section 7: 60 requests per minute per user -> 429)
  if (!checkSyncRateLimit(user.id)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // 3. Parse and validate `since` parameter (PRD section 7: 422 on invalid input)
  const sinceParam = req.nextUrl.searchParams.get("since");
  let since = "1970-01-01T00:00:00.000Z";

  if (sinceParam) {
    const timestamp = new Date(sinceParam).getTime();
    if (isNaN(timestamp)) {
      return NextResponse.json(
        {
          error: "invalid",
          issues: [{ message: "Invalid ISO timestamp for since parameter" }],
        },
        { status: 422 },
      );
    }
    since = new Date(timestamp).toISOString();
  }

  const serverTime = new Date().toISOString();
  let hasMore = false;

  // 4. Query tables by server_updated_at > since (PRD section 7)
  // Tables: categories, entries, loans, loan_payments, recurring_rules, profiles
  const [
    categoriesRes,
    entriesRes,
    loansRes,
    loanPaymentsRes,
    recurringRulesRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .gt("server_updated_at", since)
      .order("server_updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),

    supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .gt("server_updated_at", since)
      .order("server_updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),

    supabase
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
      .gt("server_updated_at", since)
      .order("server_updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),

    supabase
      .from("loan_payments")
      .select("*")
      .eq("user_id", user.id)
      .gt("server_updated_at", since)
      .order("server_updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),

    supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", user.id)
      .gt("server_updated_at", since)
      .order("server_updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),

    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .gt("updated_at", since)
      .order("updated_at", { ascending: true })
      .limit(PULL_LIMIT_PER_TABLE),
  ]);

  const categories = categoriesRes.data ?? [];
  const entries = entriesRes.data ?? [];
  const loans = loansRes.data ?? [];
  const loan_payments = loanPaymentsRes.data ?? [];
  const recurring_rules = recurringRulesRes.data ?? [];
  const profiles = profilesRes.data ?? [];

  if (
    categories.length === PULL_LIMIT_PER_TABLE ||
    entries.length === PULL_LIMIT_PER_TABLE ||
    loans.length === PULL_LIMIT_PER_TABLE ||
    loan_payments.length === PULL_LIMIT_PER_TABLE ||
    recurring_rules.length === PULL_LIMIT_PER_TABLE ||
    profiles.length === PULL_LIMIT_PER_TABLE
  ) {
    hasMore = true;
  }

  return NextResponse.json(
    {
      rows: {
        categories,
        entries,
        loans,
        loan_payments,
        recurring_rules,
        profiles,
      },
      server_time: serverTime,
      has_more: hasMore,
    },
    { status: 200 },
  );
}
