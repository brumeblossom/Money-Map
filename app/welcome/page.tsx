import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
          <p className="text-muted-foreground">
            Track your money: expenses, income, savings, giving and loans.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button className="w-full" variant="default">
            Continue with Google
          </Button>
          <Button className="w-full" variant="outline">
            Continue with email
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/">Try without an account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
