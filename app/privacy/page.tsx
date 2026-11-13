import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "Privacy policy for Moneyrails, personal money tracker.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-background/90 backdrop-blur-md">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Moneyrails home"
            className="flex items-center no-underline select-none"
          >
            <BrandLogo size="sm" priority />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Navigation link back to home */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Title & Last Updated */}
        <div className="space-y-2 border-b border-border pb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Privacy policy
          </h1>
          <p className="text-sm font-medium text-muted-foreground">
            Last updated: 13-11-2026
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-foreground/90">
          {/* Who we are */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Who we are
            </h2>
            <p>
              Moneyrails is a simple, personal money tracker designed to help you know where your money goes. If you have any questions about this policy or your data, you can reach us at{" "}
              <a
                href="mailto:workwithbrume@gmail.com"
                className="font-medium text-primary hover:underline underline-offset-4"
              >
                workwithbrume@gmail.com
              </a>
              .
            </p>
          </section>

          {/* What we collect */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              What we collect
            </h2>
            <p>
              We only collect the information necessary to provide the service:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">Account information:</strong> Your first name and email address when you create an account or sign in with Google.
              </li>
              <li>
                <strong className="text-foreground">Financial entries:</strong> The entries you choose to record, including income, expenses, giving, money you have lent, custom categories, notes, repayment records, and preferences.
              </li>
            </ul>
          </section>

          {/* Guest mode */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Guest mode
            </h2>
            <p>
              If you use Moneyrails without an account (guest mode), all your entries stay solely on your device in your browser&apos;s local database (IndexedDB). Nothing is sent to our servers until you choose to create an account and sign in.
            </p>
          </section>

          {/* Where it is stored */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Where it is stored
            </h2>
            <p>
              Your data is stored locally on your device for fast offline access. When you are signed in, your data is also encrypted and stored in our cloud database (hosted by Supabase) so that it safely syncs across your phone and laptop. Each account is isolated with database-level security policies (Row Level Security), meaning you can only ever access your own data.
            </p>
          </section>

          {/* Google sign-in */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Google sign-in
            </h2>
            <p>
              When you use Google sign-in, we only receive your first name, email address, and profile picture from Google to set up your profile. We never see or store your Google password, and we do not request or access any other files, emails, contacts, or permissions in your Google account.
            </p>
          </section>

          {/* What we do NOT do */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              What we do not do
            </h2>
            <p>
              We believe your financial life is private. We do not sell your personal data. We do not display advertisements. We do not share your information with advertisers, data brokers, or third parties, except the essential infrastructure services required to run the application:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong className="text-foreground">Supabase:</strong> For authentication and encrypted database storage.</li>
              <li><strong className="text-foreground">Vercel:</strong> For web hosting and application delivery.</li>
            </ul>
          </section>

          {/* Admin access */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Admin visibility
            </h2>
            <p>
              The application administrator can only view high-level aggregate system counts (such as total accounts registered and total number of entries created across the platform). The administrator cannot view your individual financial transactions, descriptions, notes, or balances.
            </p>
          </section>

          {/* Your choices */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Your choices &amp; data rights
            </h2>
            <p>
              You maintain complete control over your records:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>You can edit or delete any transaction or category at any time.</li>
              <li>You can export a full PDF summary of your records from the Export page.</li>
              <li>
                You can permanently delete your account and all associated cloud data in Settings at any time with immediate effect.
              </li>
            </ul>
          </section>

          {/* Cookies */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Cookies
            </h2>
            <p>
              We only use strictly necessary first-party cookies to keep your session authenticated, remember your guest mode status, and preserve your light or dark theme preference. We do not use tracking or advertising cookies.
            </p>
          </section>

          {/* Changes */}
          <section className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Changes to this policy
            </h2>
            <p>
              If we update how Moneyrails handles data, we will post the updated policy here and revise the &ldquo;Last updated&rdquo; date at the top of the page.
            </p>
          </section>
        </div>

        {/* Footer link */}
        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Moneyrails</span>
          <Link
            href="/"
            className="text-primary hover:underline font-medium"
          >
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
