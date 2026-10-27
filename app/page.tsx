import * as React from "react";
import { cookies } from "next/headers";
import { LandingPageView } from "@/components/landing-page-view";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("moneymap_has_session")?.value;
  const isGuest = cookieStore.get("moneymap_guest")?.value === "true";
  const mockUser = cookieStore.get("moneymap_mock_user")?.value;
  const hasSbAuth = cookieStore.getAll().some((c) => c.name.includes("-auth-token"));

  const hasSession = sessionCookie === "1" || isGuest || Boolean(mockUser) || hasSbAuth;

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

