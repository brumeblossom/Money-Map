import { NextResponse } from "next/server";
import { verifyAdminUser } from "@/lib/auth/admin";

export async function GET() {
  const { isAdmin } = await verifyAdminUser();

  if (!isAdmin) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ isAdmin: true });
}
