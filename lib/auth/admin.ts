import { createClient } from "@/lib/supabase/server";

/**
 * Returns list of configured admin emails in lowercase.
 */
export function getAdminEmails(): string[] {
  const envVal = process.env.ADMIN_EMAILS || "";
  return envVal
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Pure check whether an email is in the admin email list.
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * Server-side verification for current request session.
 * A user is admin only if signed in AND their Supabase auth email is in ADMIN_EMAILS.
 */
export async function verifyAdminUser(): Promise<{
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return { isAdmin: false, email: null, userId: null };
    }

    const isAdmin = isEmailAdmin(user.email);
    return {
      isAdmin,
      email: user.email,
      userId: user.id,
    };
  } catch {
    return { isAdmin: false, email: null, userId: null };
  }
}

