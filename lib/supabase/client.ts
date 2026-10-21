import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jiktrplyuneakhhoayde.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa3RycGx5dW5lYWtoaG9heWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAyMTgsImV4cCI6MjEwODA2NjIxOH0.m1sXfxRZVwjg1gC0AsNKTD9QugH_zLwX6r3NSTmf6GI",
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      },
    },
  );
}
