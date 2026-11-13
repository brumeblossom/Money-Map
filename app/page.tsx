import * as React from "react";
import { cookies, headers } from "next/headers";
import { LandingPageView } from "@/components/landing-page-view";
import {
  SESSION_HEADER_NAME,
  hasSessionFromCookies,
} from "@/lib/session-cookies";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = searchParams ? await searchParams : {};

  // If explicit landing view requested (e.g. from Back button), render Landing
  if (params.view === "landing") {
    return <LandingPageView />;
  }

  // 1. Prefer middleware's verified request header
  const reqHeaders = await headers();
  const sessionHeader = reqHeaders.get(SESSION_HEADER_NAME);

  let hasSession = false;
  if (sessionHeader === "1") {
    hasSession = true;
  } else if (sessionHeader === "0") {
    hasSession = false;
  } else {
    // 2. Fallback: single source of truth helper on cookies (never counts -code-verifier)
    const cookieStore = await cookies();
    hasSession = hasSessionFromCookies(cookieStore.getAll());
  }

  if (!hasSession) {
    return <LandingPageView />;
  }

  const { AppHomeLoader } = await import("@/components/app-home-loader");

  return (
    <React.Suspense fallback={null}>
      <AppHomeLoader />
    </React.Suspense>
  );
}

