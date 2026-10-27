import * as React from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  HandCoins,
  Heart,
  Zap,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export function LandingPageView() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground flex flex-col selection:bg-secondary selection:text-secondary-foreground">
      {/* 1. Header: logo left; right side "Sign in" (text button) and "Get started" (primary). Phones: logo + "Get started" only */}
      <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            data-testid="landing-logo"
            className="flex items-center gap-2"
          >
            <BrandLogo size="md" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/welcome"
              prefetch={false}
              data-testid="landing-signin-header"
              className="hidden sm:inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Sign in
            </Link>
            <Button
              asChild
              data-testid="landing-get-started-header"
              className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 sm:px-5 hover:bg-primary-hover shadow-xs cursor-pointer"
            >
              <Link href="/welcome?mode=signup" prefetch={false}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Section: Headline, subtext, buttons, phone mockup */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-18 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Copy & Actions */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-[1.12]">
                Know where your money goes.
              </h1>
              <p className="mx-auto lg:mx-0 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Record your income, expenses, giving and money you&apos;ve lent in seconds. See clear
                monthly totals and spending habits on your phone or laptop.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  asChild
                  size="lg"
                  data-testid="landing-get-started-hero"
                  className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-semibold px-7 shadow-sm cursor-pointer"
                >
                  <Link href="/welcome?mode=signup" prefetch={false}>Get started, it&apos;s free</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  data-testid="landing-signin-hero"
                  className="w-full sm:w-auto rounded-xl border-border hover:bg-muted font-semibold px-7 cursor-pointer"
                >
                  <Link href="/welcome" prefetch={false}>Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Phone Mockup with soft violet backdrop shape */}
            <div className="lg:col-span-5 flex items-center justify-center pt-4 lg:pt-0">
              <div
                data-testid="landing-phone-mockup"
                className="relative w-full max-w-[320px] select-none"
              >
                {/* Soft violet backdrop shape (#ECE8FC in light mode, rgba soft in dark) */}
                <div
                  className="absolute -inset-4 sm:-inset-6 rounded-3xl bg-secondary -rotate-2 scale-95 blur-xs transition-transform"
                  aria-hidden="true"
                />

                {/* Phone device mockup */}
                <div className="relative z-10 w-full rounded-[38px] border-[6px] border-foreground/15 bg-card p-3.5 shadow-2xl space-y-3 overflow-hidden text-foreground">
                  {/* Speaker/Camera Notch */}
                  <div className="mx-auto h-3.5 w-20 rounded-full bg-foreground/10" aria-hidden="true" />

                  {/* App Mockup Header */}
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-foreground truncate">
                      Welcome back, Blossom
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-secondary-foreground">
                      <CheckCircle2 className="size-2.5 text-money-income" />
                      Synced
                    </span>
                  </div>

                  {/* Mockup Month Strip */}
                  <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-xs text-center">
                    <span className="block text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      October 2026
                    </span>
                    <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
                      <div className="px-1">
                        <span className="block text-[8px] font-medium text-muted-foreground">Income</span>
                        <span className="block text-[11px] font-bold text-money-income tabular-nums">
                          ₦450,000.00
                        </span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[7.5px] font-medium text-muted-foreground whitespace-nowrap">
                          Spent (Expenses + Giving)
                        </span>
                        <span className="block text-[11px] font-bold text-money-expense-text tabular-nums">
                          ₦185,000.00
                        </span>
                      </div>
                      <div className="px-1">
                        <span className="block text-[8px] font-medium text-muted-foreground">Left over</span>
                        <span className="block text-[11px] font-bold text-foreground tabular-nums">
                          ₦265,000.00
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mockup 4 Action Cards (2x2) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Income */}
                    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-xs flex flex-col justify-between h-[80px]">
                      <div className="flex items-center justify-between">
                        <div className="size-6 rounded-lg bg-money-income/16 text-money-income flex items-center justify-center">
                          <ArrowDownLeft className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground">Records</span>
                      </div>
                      <div>
                        <span className="block text-[8.5px] font-medium text-muted-foreground">Income</span>
                        <span className="block text-[11px] font-bold tabular-nums text-foreground">₦450,000.00</span>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-xs flex flex-col justify-between h-[80px]">
                      <div className="flex items-center justify-between">
                        <div className="size-6 rounded-lg bg-money-expense/16 text-money-expense-text flex items-center justify-center">
                          <ArrowUpRight className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground">Records</span>
                      </div>
                      <div>
                        <span className="block text-[8.5px] font-medium text-muted-foreground">Expenses</span>
                        <span className="block text-[11px] font-bold tabular-nums text-foreground">₦160,000.00</span>
                      </div>
                    </div>

                    {/* Giving */}
                    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-xs flex flex-col justify-between h-[80px]">
                      <div className="flex items-center justify-between">
                        <div className="size-6 rounded-lg bg-money-giving/16 text-money-giving-text flex items-center justify-center">
                          <Heart className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground">Records</span>
                      </div>
                      <div>
                        <span className="block text-[8.5px] font-medium text-muted-foreground">Giving</span>
                        <span className="block text-[11px] font-bold tabular-nums text-foreground">₦25,000.00</span>
                      </div>
                    </div>

                    {/* Money I lent */}
                    <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-xs flex flex-col justify-between h-[80px]">
                      <div className="flex items-center justify-between">
                        <div className="size-6 rounded-lg bg-money-lent/16 text-money-lent-text flex items-center justify-center">
                          <HandCoins className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-medium text-muted-foreground">Records</span>
                      </div>
                      <div>
                        <span className="block text-[8.5px] font-medium text-muted-foreground">Money I lent</span>
                        <span className="block text-[11px] font-bold tabular-nums text-foreground">₦80,000.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Mockup Due Section Item */}
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="block text-[9.5px] font-semibold text-foreground truncate">
                        Tunde · Car repairs
                      </span>
                      <span className="block text-[8.5px] text-muted-foreground">Due in 5 days</span>
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-money-lent-text">
                      ₦50,000.00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Three Feature Blocks: Row on desktop, stacked on phones */}
        <section className="border-t border-border/60 bg-muted/20 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
              {/* Feature 1 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs">
                  <Zap className="size-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Record in seconds</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tap a card, type the amount, done. Works even without internet.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs">
                  <BarChart3 className="size-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">See your habits</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monthly totals, charts and category reports show where it all goes.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs">
                  <Clock className="size-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Never forget money you lent</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Track who owes you, how much is left and when it&apos;s due.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Final CTA Band: Deep violet (sidebar colour #2A1F66) */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="rounded-3xl bg-sidebar text-sidebar-foreground px-6 py-12 sm:px-12 sm:py-16 text-center space-y-6 shadow-xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Start mapping your money today.
            </h2>
            <div>
              <Button
                asChild
                size="lg"
                data-testid="landing-get-started-cta"
                className="rounded-xl bg-white text-[#2A1F66] hover:bg-white/90 font-bold px-8 shadow-md cursor-pointer"
              >
                <Link href="/welcome?mode=signup" prefetch={false}>Get started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer: © 2026 Money Map and Send feedback (mailto:workwithbrume@gmail.com) */}
      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 Money Map</span>
          <a
            href="mailto:workwithbrume@gmail.com"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline cursor-pointer"
          >
            Send feedback
          </a>
        </div>
      </footer>
    </div>
  );
}
