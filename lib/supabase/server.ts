import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/database.types";
import { SESSION_MAX_AGE } from "./client";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jiktrplyuneakhhoayde.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppa3RycGx5dW5lYWtoaG9heWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0OTAyMTgsImV4cCI6MjEwODA2NjIxOH0.m1sXfxRZVwjg1gC0AsNKTD9QugH_zLwX6r3NSTmf6GI",
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: SESSION_MAX_AGE,
              })
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
