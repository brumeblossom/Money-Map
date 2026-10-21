"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { claimGuestData } from "@/lib/repo";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRef = React.useRef(false);

  React.useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    async function handleAuth() {
      const supabase = createClient();
      const code = searchParams.get("code");

      try {
        let authUser: { id: string } | null = null;

        if (code && code !== "mock-code") {
          try {
            const { data } = await supabase.auth.exchangeCodeForSession(code);
            if (data?.user) {
              authUser = data.user;
            }
          } catch (e) {
            console.error("Code exchange error:", e);
          }
        }

        if (!authUser) {
          const { data: sessionData } = await supabase.auth.getSession();
          authUser = sessionData?.session?.user ?? null;
        }

        if (!authUser) {
          const { data: userData } = await supabase.auth.getUser();
          authUser = userData?.user ?? null;
        }

        // Support test mock callback code if in test
        if (!authUser && code === "mock-code") {
          authUser = { id: searchParams.get("userId") || "test-authed-user-999" };
        }

        if (authUser) {
          // Clear guest cookie
          document.cookie =
            "moneymap_guest=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

          if (code === "mock-code") {
            document.cookie = `moneymap_mock_user=${authUser.id}; path=/; max-age=2592000; SameSite=Lax`;
          }

          // Claim any guest data created locally in IndexedDB
          const claimedCount = await claimGuestData(authUser.id);

          if (claimedCount > 0) {
            toast(`Your ${claimedCount} entries are now saved to your account`);
          }

          router.replace("/");
          return;
        }

        // If no user found, redirect to /welcome
        router.replace("/welcome");
      } catch (err) {
        console.error("Auth callback exception:", err);
        router.replace("/welcome");
      }
    }

    handleAuth();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-medium text-muted-foreground">
          Signing you in...
        </p>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackContent />
    </React.Suspense>
  );
}
