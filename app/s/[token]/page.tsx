import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportView } from "@/components/report/report-view";
import type { ReportSnapshot } from "@/lib/report/types";

export const metadata: Metadata = {
  title: "Shared Report · Money Map",
  robots: {
    index: false,
    follow: false,
  },
};

function isLinkExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return Date.now() > new Date(expiresAt).getTime();
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token || token.trim().length === 0) {
    return <LinkUnavailableView />;
  }

  const supabase = createAdminClient();
  const { data: link, error } = await supabase
    .from("share_links")
    .select("snapshot, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !link) {
    return <LinkUnavailableView />;
  }

  // Check if revoked
  if (link.revoked_at !== null) {
    return <LinkUnavailableView />;
  }

  // Check if expired
  if (isLinkExpired(link.expires_at)) {
    return <LinkUnavailableView />;
  }

  const snapshot = link.snapshot as unknown as ReportSnapshot;
  if (!snapshot) {
    return <LinkUnavailableView />;
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors">
      <ReportView snapshot={snapshot} />
    </main>
  );
}

function LinkUnavailableView() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          This link is no longer available
        </h1>
        <p className="text-sm text-muted-foreground">
          The link may have expired or been turned off by the person who created it.
        </p>
      </div>
      <footer className="fixed bottom-6 text-xs text-muted-foreground">
        Made with Money Map
      </footer>
    </main>
  );
}
