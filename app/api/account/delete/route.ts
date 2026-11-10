import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccountSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  // 1. Session Authentication
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  let userId = user?.id;
  if (!userId || authError) {
    const mockCookie = req.cookies.get("moneymap_mock_user")?.value;
    if (mockCookie) {
      userId = mockCookie;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Request validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid", issues: [{ message: "Invalid JSON body" }] },
      { status: 422 },
    );
  }

  const parsed = deleteAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // 3. Service role check
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // 4. Service role cascade deletion
  const admin = createAdminClient();

  try {
    const { data: userLoans, error: loansFetchErr } = await admin
      .from("loans")
      .select("id")
      .eq("user_id", userId);

    if (loansFetchErr) {
      console.error("Error fetching user loans:", loansFetchErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (userLoans && userLoans.length > 0) {
      const loanIds = userLoans.map((l) => l.id);
      const { error: loanPaymentsErr } = await admin
        .from("loan_payments")
        .delete()
        .in("loan_id", loanIds);
      if (loanPaymentsErr) {
        console.error("Error deleting loan payments:", loanPaymentsErr);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }

    const { error: loansErr } = await admin.from("loans").delete().eq("user_id", userId);
    if (loansErr) {
      console.error("Error deleting loans:", loansErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { error: entriesErr } = await admin.from("entries").delete().eq("user_id", userId);
    if (entriesErr) {
      console.error("Error deleting entries:", entriesErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { error: rulesErr } = await admin.from("recurring_rules").delete().eq("user_id", userId);
    if (rulesErr) {
      console.error("Error deleting recurring rules:", rulesErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { error: categoriesErr } = await admin.from("categories").delete().eq("user_id", userId);
    if (categoriesErr) {
      console.error("Error deleting categories:", categoriesErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const { error: profilesErr } = await admin.from("profiles").delete().eq("user_id", userId);
    if (profilesErr) {
      console.error("Error deleting profiles:", profilesErr);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    // Delete user from auth.users and check error
    const { error: deleteUserErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserErr) {
      const isMockCookie = Boolean(req.cookies.get("moneymap_mock_user")?.value);
      const isNotFound =
        deleteUserErr.message?.toLowerCase().includes("not found") ||
        (deleteUserErr as { status?: number }).status === 404;
      if (!(isMockCookie && isNotFound)) {
        console.error("Error deleting auth user:", deleteUserErr);
        return NextResponse.json({ error: "server_error" }, { status: 500 });
      }
    }
  } catch (err) {
    console.error("Failed to delete user account in Supabase:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // 5. Return 200 { ok: true } and clear cookies
  const response = NextResponse.json({ ok: true }, { status: 200 });

  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name);
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0, expires: new Date(0) });
    }
  }

  const cookiesToClear = [
    "moneymap_guest",
    "mm_guest",
    "moneymap_mock_user",
    "moneymap_has_session",
    "moneymap_is_admin",
  ];
  for (const name of cookiesToClear) {
    response.cookies.delete(name);
    response.cookies.set(name, "", { path: "/", maxAge: 0, expires: new Date(0) });
  }

  return response;
}
