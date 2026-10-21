import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jiktrplyuneakhhoayde.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      },
    },
  );
}
