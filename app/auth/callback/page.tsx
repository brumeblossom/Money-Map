import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthCallbackClient } from "./auth-callback-client";

export const instant = false;

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
