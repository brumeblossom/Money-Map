import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  const mockUserCookie = req.cookies.get("moneymap_mock_user")?.value;
  const user = authUser ?? (mockUserCookie ? { id: mockUserCookie } : null);

  if (!user || (!mockUserCookie && authError)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = (!authUser && mockUserCookie) ? createAdminClient() : supabase;

  // Update revoked_at only if user_id matches
  const { error: updateError } = await client
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Failed to revoke share link:", updateError);
    return NextResponse.json(
      { error: "server_error", message: "Failed to revoke share link" },
      { status: 500 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
