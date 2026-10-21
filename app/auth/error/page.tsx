import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthErrorClient } from "./auth-error-client";

export const instant = false;

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
        </div>
      }
    >
      <AuthErrorClient />
    </Suspense>
  );
}
