/**
 * Helper to extract a user's first name from Supabase user_metadata or sessionStorage.
 * Prompt 15b:
 * - Email sign in: options.data.first_name / display_name
 * - Google sign in: user_metadata.given_name, else the first word of full_name or name.
 * Name: 1 to 60 characters, trimmed.
 */
export function extractFirstName(
  userMetadata?: Record<string, unknown> | null,
  fallbackPendingName?: string | null,
): string | null {
  if (!userMetadata && !fallbackPendingName) return null;

  // 1. Explicit first_name or display_name
  const explicit = (userMetadata?.first_name as string) || (userMetadata?.display_name as string);
  if (explicit && typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().slice(0, 60);
  }

  // 2. Google OAuth metadata: given_name
  const givenName = userMetadata?.given_name as string;
  if (givenName && typeof givenName === "string" && givenName.trim()) {
    return givenName.trim().slice(0, 60);
  }

  // 3. First word of full_name or name
  const fullName = (userMetadata?.full_name as string) || (userMetadata?.name as string);
  if (fullName && typeof fullName === "string" && fullName.trim()) {
    const firstWord = fullName.trim().split(/\s+/)[0];
    if (firstWord) return firstWord.slice(0, 60);
  }

  // 4. SessionStorage pending name
  if (fallbackPendingName && fallbackPendingName.trim()) {
    return fallbackPendingName.trim().slice(0, 60);
  }

  return null;
}
