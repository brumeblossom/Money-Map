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

  // 3. Service role cascade deletion
  const admin = createAdminClient();

  try {
    const { data: userLoans } = await admin
      .from("loans")
      .select("id")
      .eq("user_id", userId);

    if (userLoans && userLoans.length > 0) {
      const loanIds = userLoans.map((l) => l.id);
      await admin.from("loan_payments").delete().in("loan_id", loanIds);
    }

    await admin.from("loans").delete().eq("user_id", userId);
    await admin.from("entries").delete().eq("user_id", userId);
    await admin.from("recurring_rules").delete().eq("user_id", userId);
    await admin.from("categories").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    // Delete user from auth.users (if real user)
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // Ignore if user does not exist in auth.users (e.g. mock user)
    }
  } catch (err) {
    console.error("Failed to delete user account in Supabase", err);
    return NextResponse.json(
      { error: "server_error", message: "Failed to delete account" },
      { status: 500 },
    );
  }

  // 4. Return 204 with cleared session cookies
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete("moneymap_mock_user");
  response.cookies.delete("moneymap_guest");
  return response;
}
