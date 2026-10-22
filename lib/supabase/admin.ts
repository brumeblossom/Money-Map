import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";

/**
 * Service role Supabase client for background cron and admin operations.
 * Bypasses RLS to query across users with appropriate security protections.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jiktrplyuneakhhoayde.supabase.co";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
