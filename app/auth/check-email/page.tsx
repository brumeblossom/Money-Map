import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent you a sign-in link. Tap the link in your email to continue.
        </p>
        <Button variant="outline" className="w-full">
          Resend email
        </Button>
        <div className="pt-4">
          <Link href="/" className="text-xs text-muted-foreground underline">
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
