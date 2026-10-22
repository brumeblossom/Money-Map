import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDueLoans, buildReminderEmailHtml } from "@/lib/calc/reminders";
import { getDueRecurringRules } from "@/lib/calc/recurring";
import { formatDate } from "@/lib/format";
import type { LoanRow, LoanPaymentRow, RecurringRuleRow, CategoryRow, ProfileRow } from "@/lib/db/dexie";

export async function GET(req: NextRequest) {
  // 1. Authorization: Bearer CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Resend API Key check
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ sent: 0, skipped: "email not configured" });
  }

  const emailFrom = process.env.EMAIL_FROM || "Money Map <onboarding@resend.dev>";
  const todayIso = new Date().toISOString().slice(0, 10);

  // 3. Find items per user with service role
  try {
    const admin = createAdminClient();

    // Query profiles with notifications_enabled = true
    const { data: profiles, error: profileErr } = await admin
      .from("profiles")
      .select("*")
      .eq("notifications_enabled", true);

    if (profileErr || !profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sentCount = 0;

    for (const profile of profiles as unknown as ProfileRow[]) {
      // Get user email
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
        profile.user_id,
      );
      const userEmail = userData?.user?.email;

      if (userErr || !userEmail) {
        continue;
      }

      // Query user's active loans, loan payments, recurring rules, and categories
      const [{ data: loans }, { data: loanPayments }, { data: recurringRules }, { data: categories }] =
        await Promise.all([
          admin
            .from("loans")
            .select("*")
            .eq("user_id", profile.user_id)
            .is("deleted_at", null),
          admin
            .from("loan_payments")
            .select("*")
            .eq("user_id", profile.user_id)
            .is("deleted_at", null),
          admin
            .from("recurring_rules")
            .select("*")
            .eq("user_id", profile.user_id)
            .is("deleted_at", null)
            .eq("is_paused", false),
          admin
            .from("categories")
            .select("*")
            .eq("user_id", profile.user_id)
            .is("deleted_at", null),
        ]);

      const dueLoans = getDueLoans({
        loans: (loans ?? []) as unknown as LoanRow[],
        loanPayments: (loanPayments ?? []) as unknown as LoanPaymentRow[],
        todayIso,
        currency: profile.currency,
      });

      const dueRules = getDueRecurringRules(
        (recurringRules ?? []) as unknown as RecurringRuleRow[],
        todayIso,
      );

      // If nothing is due for this user, do not send email
      if (dueLoans.length === 0 && dueRules.length === 0) {
        continue;
      }

      // Build email
      const html = buildReminderEmailHtml({
        userEmail,
        profile,
        dueLoans,
        dueRules,
        categories: (categories ?? []) as unknown as CategoryRow[],
        todayIso,
      });

      // Send daily summary email via Resend
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [userEmail],
          subject: `Money Map: Daily Reminders for ${formatDate(todayIso)}`,
          html,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const errorText = await res.text();
        console.error(`Failed to send email to ${userEmail} via Resend:`, errorText);
      }
    }

    return NextResponse.json({ sent: sentCount });
  } catch (err) {
    console.error("Error running reminders cron:", err);
    return NextResponse.json({ error: "internal_error", sent: 0 }, { status: 500 });
  }
}
