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

  const isGuest = request.cookies.get("moneymap_guest")?.value === "true";
  const path = request.nextUrl.pathname;
  const isSignInIntent = request.nextUrl.searchParams.get("intent") === "signin";

  // Public/system routes and static assets that should never redirect
  if (
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/auth/") ||
    path.startsWith("/icons/") ||
    path.startsWith("/images/") ||
    path.includes("manifest") ||
    path === "/sw.js" ||
    path === "/favicon.ico" ||
    path.includes(".")
  ) {
    return response;
  }

  // If user is on /welcome
  if (path === "/welcome") {
    // If user is signed in or guest, but has no explicit signin intent, send to home
    if ((user || isGuest) && !isSignInIntent) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // If user is neither signed in nor a guest, redirect to /welcome
  if (!user && !isGuest) {
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
