import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CheckEmailClient } from "./check-email-client";

export const instant = false;

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckEmailClient />
    </Suspense>
  );
}
