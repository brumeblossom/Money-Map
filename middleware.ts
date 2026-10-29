import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_MAX_AGE } from "@/lib/supabase/client";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jiktrplyuneakhhoayde.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookieOptions: {
        maxAge: SESSION_MAX_AGE,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE,
            })
          );
        },
      },
    }
  );

  // Refresh auth session
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const mockUserCookie = request.cookies.get("moneymap_mock_user")?.value;
  const user = mockUserCookie ? { id: mockUserCookie } : authUser;

  const isGuest =
    request.cookies.get("moneymap_guest")?.value === "true" ||
    request.cookies.get("mm_guest")?.value === "1";
  const path = request.nextUrl.pathname;
  const isSignInIntent = request.nextUrl.searchParams.get("intent") === "signin";
  const hasSession = Boolean(user || isGuest);

  // Set session hint cookie for server components and AppShell
  response.cookies.set("moneymap_has_session", hasSession ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: SESSION_MAX_AGE,
  });

  // Set admin hint cookie based on verified auth email
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = authUser?.email?.trim().toLowerCase();
  const isAdmin = Boolean(userEmail && adminEmails.includes(userEmail));

  response.cookies.set("moneymap_is_admin", isAdmin ? "1" : "0", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: SESSION_MAX_AGE,
  });

  // Public/system routes and static assets that should never redirect
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/admin") ||
    path.startsWith("/auth/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/images/") ||
    path.startsWith("/s/") ||
    path.includes("manifest") ||
    path === "/sw.js" ||
    path === "/favicon.ico" ||
    path.includes(".")
  ) {
    return response;
  }

  // Signed-out visitors see the landing page at "/"; signed-in/guests see Home
  if (path === "/") {
    return response;
  }

  // If user is on /welcome
  if (path === "/welcome") {
    const mode = request.nextUrl.searchParams.get("mode");
    // A signed-in user who opens /welcome is sent to Home (unless setting a new password via reset flow)
    if (user && mode !== "reset") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // A guest without explicit signin intent is sent to Home
    if (isGuest && !isSignInIntent) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // If user is neither signed in nor a guest, redirect to /welcome for all other app routes
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - icons
     * - images
     * - manifest (manifest.json, manifest.webmanifest)
     * - sw.js
     * - any file with an extension (e.g. .css, .js, .png, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icons|images|manifest|sw\\.js|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
