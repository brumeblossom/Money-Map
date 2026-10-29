import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/auth/admin";
import { getAdminAnalytics } from "@/lib/admin/stats";

export async function GET(request: Request) {
  const { isAdmin } = await verifyAdminUser();

  // If not admin, return 404 to avoid revealing endpoint exists
  if (!isAdmin) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  const data = await getAdminAnalytics(forceRefresh);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
