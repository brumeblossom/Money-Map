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
              className="h-10 sm:h-[44px] rounded-xl bg-primary text-primary-foreground font-semibold px-4 sm:px-5 hover:bg-primary-hover shadow-xs cursor-pointer"
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
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-[1.14]">
                Know where your<br className="sm:hidden" /> money goes.
              </h1>
              <p className="mx-auto lg:mx-0 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Record your income, expenses, giving and money you&apos;ve lent in seconds. See clear
                monthly totals and spending habits on your phone or laptop.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button
                  asChild
                  size="lg"
                  data-testid="landing-get-started-hero"
                  className="w-[70%] max-w-[320px] sm:w-auto h-12 sm:h-[52px] rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-semibold px-7 shadow-xs cursor-pointer inline-flex items-center justify-center"
                >
                  <Link href="/welcome?mode=signup" prefetch={false}>Get started, it&apos;s free</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  data-testid="landing-signin-hero"
                  className="w-[70%] max-w-[320px] sm:w-auto h-12 sm:h-[52px] rounded-xl border-border hover:bg-muted font-semibold px-7 cursor-pointer inline-flex items-center justify-center text-foreground"
                >
                  <Link href="/welcome" prefetch={false}>Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Right Column: Phone Mockup with realistic frame and floating cards */}
            <div className="lg:col-span-5 flex items-center justify-center pt-2 lg:pt-0">
              <div
                data-testid="landing-phone-mockup"
                className="relative w-[240px] sm:w-[300px] select-none mx-auto"
              >
                {/* Decorative layers behind phone (aria-hidden, pointer-events none) */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-6 sm:-inset-12 flex items-center justify-center -z-10 overflow-visible"
                >
                  {/* Soft violet glow circle */}
                  <div className="absolute size-56 sm:size-72 rounded-full bg-secondary blur-3xl opacity-75" />

                  {/* Faint dotted grid (Violet at ~15% opacity) */}
                  <svg
                    className="absolute inset-0 size-full text-primary/15"
                    width="100%"
                    height="100%"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern id="landing-hero-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.25" fill="currentColor" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#landing-hero-dots)" />
                  </svg>

                  {/* Thin curved lines (Violet at ~25% opacity) sweeping around the phone */}
                  <svg
                    className="absolute -inset-8 w-[calc(100%+64px)] h-[calc(100%+64px)] text-primary/25"
                    viewBox="0 0 360 520"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 120 C 120 40, 240 60, 340 180"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10 380 C 110 480, 260 460, 350 340"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M330 80 C 370 200, 360 380, 290 480"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Floating Card 1: Top Left (+₦250,000 · Salary) - visible on mobile and desktop */}
                <div
                  data-testid="floating-card-salary"
                  className="absolute -left-3 sm:-left-8 top-8 sm:top-12 z-20 rounded-xl bg-card border border-border/80 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg flex items-center gap-2 text-foreground text-[10.5px] sm:text-xs font-semibold animate-in fade-in zoom-in-95 duration-500"
                >
                  <div className="size-5 sm:size-6 rounded-lg bg-money-income/16 text-money-income flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="size-3 sm:size-3.5" />
                  </div>
                  <span className="whitespace-nowrap tabular-nums">+₦250,000 · Salary</span>
                </div>

                {/* Floating Card 2: Bottom Right (Ada paid back ₦27,500) - desktop only (hidden on mobile) */}
                <div
                  data-testid="floating-card-ada"
                  className="absolute -right-3 sm:-right-8 bottom-10 sm:bottom-14 z-20 hidden sm:flex rounded-xl bg-card border border-border/80 px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-lg items-center gap-2 text-foreground text-xs font-semibold animate-in fade-in zoom-in-95 duration-500 delay-150"
                >
                  <div className="size-6 rounded-lg bg-money-lent/16 text-money-lent-text flex items-center justify-center shrink-0">
                    <HandCoins className="size-3.5" />
                  </div>
                  <span className="whitespace-nowrap tabular-nums">Ada paid back ₦27,500</span>
                </div>

                {/* Phone device mockup: dark frame (#17191C), 40px corner radius, 10px bezel, notch, soft shadow */}
                <div className="relative z-10 w-full rounded-[40px] bg-[#17191C] p-[10px] shadow-2xl ring-1 ring-white/10 text-foreground">
                  {/* Inside bezel content container */}
                  <div className="rounded-[30px] bg-card p-2.5 sm:p-3 shadow-inner space-y-2.5 sm:space-y-3 overflow-hidden">
                    {/* Small notch / camera pill */}
                    <div
                      className="mx-auto mb-1.5 h-3.5 w-16 sm:w-20 rounded-full bg-[#17191C] flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <div className="size-1.5 rounded-full bg-[#2A2B32] ml-auto mr-2" />
                    </div>

                    {/* App Mockup Header */}
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-foreground truncate">
                        Welcome back, Blossom
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[8.5px] sm:text-[9px] font-semibold text-secondary-foreground">
                        <CheckCircle2 className="size-2.5 text-money-income" />
                        Synced
                      </span>
                    </div>

                    {/* Mockup Month Strip */}
                    <div className="rounded-xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-xs text-center">
                      <span className="block text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        October 2026
                      </span>
                      <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
                        <div className="px-1">
                          <span className="block text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Income</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold text-money-income tabular-nums">
                            ₦450,000.00
                          </span>
                        </div>
                        <div className="px-1">
                          <span className="block text-[7px] sm:text-[7.5px] font-medium text-muted-foreground whitespace-nowrap">
                            Spent (Expenses + Giving)
                          </span>
                          <span className="block text-[10px] sm:text-[11px] font-bold text-money-expense-text tabular-nums">
                            ₦185,000.00
                          </span>
                        </div>
                        <div className="px-1">
                          <span className="block text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Left over</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold text-foreground tabular-nums">
                            ₦265,000.00
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mockup 4 Action Cards (2x2) */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {/* Income */}
                      <div className="rounded-xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-xs flex flex-col justify-between h-[72px] sm:h-[80px]">
                        <div className="flex items-center justify-between">
                          <div className="size-5 sm:size-6 rounded-lg bg-money-income/16 text-money-income flex items-center justify-center">
                            <ArrowDownLeft className="size-3 sm:size-3.5" />
                          </div>
                          <span className="text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Records</span>
                        </div>
                        <div>
                          <span className="block text-[7.5px] sm:text-[8.5px] font-medium text-muted-foreground">Income</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold tabular-nums text-foreground">₦450,000.00</span>
                        </div>
                      </div>

                      {/* Expenses */}
                      <div className="rounded-xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-xs flex flex-col justify-between h-[72px] sm:h-[80px]">
                        <div className="flex items-center justify-between">
                          <div className="size-5 sm:size-6 rounded-lg bg-money-expense/16 text-money-expense-text flex items-center justify-center">
                            <ArrowUpRight className="size-3 sm:size-3.5" />
                          </div>
                          <span className="text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Records</span>
                        </div>
                        <div>
                          <span className="block text-[7.5px] sm:text-[8.5px] font-medium text-muted-foreground">Expenses</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold tabular-nums text-foreground">₦160,000.00</span>
                        </div>
                      </div>

                      {/* Giving */}
                      <div className="rounded-xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-xs flex flex-col justify-between h-[72px] sm:h-[80px]">
                        <div className="flex items-center justify-between">
                          <div className="size-5 sm:size-6 rounded-lg bg-money-giving/16 text-money-giving-text flex items-center justify-center">
                            <Heart className="size-3 sm:size-3.5" />
                          </div>
                          <span className="text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Records</span>
                        </div>
                        <div>
                          <span className="block text-[7.5px] sm:text-[8.5px] font-medium text-muted-foreground">Giving</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold tabular-nums text-foreground">₦25,000.00</span>
                        </div>
                      </div>

                      {/* Money I lent */}
                      <div className="rounded-xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-xs flex flex-col justify-between h-[72px] sm:h-[80px]">
                        <div className="flex items-center justify-between">
                          <div className="size-5 sm:size-6 rounded-lg bg-money-lent/16 text-money-lent-text flex items-center justify-center">
                            <HandCoins className="size-3 sm:size-3.5" />
                          </div>
                          <span className="text-[7.5px] sm:text-[8px] font-medium text-muted-foreground">Records</span>
                        </div>
                        <div>
                          <span className="block text-[7.5px] sm:text-[8.5px] font-medium text-muted-foreground">Money I lent</span>
                          <span className="block text-[10px] sm:text-[11px] font-bold tabular-nums text-foreground">₦80,000.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Mockup Due Section Item */}
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="block text-[9px] sm:text-[9.5px] font-semibold text-foreground truncate">
                          Tunde · Car repairs
                        </span>
                        <span className="block text-[8px] sm:text-[8.5px] text-muted-foreground">Due in 5 days</span>
                      </div>
                      <span className="text-[9.5px] sm:text-[10px] font-bold tabular-nums text-money-lent-text">
                        ₦50,000.00
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Three Feature Blocks: Row on desktop, stacked on phones (A3 & A7: bg-landing-alt, generous padding) */}
        <section className="w-full border-y border-border/60 bg-landing-alt py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-12 text-center md:text-left">
              {/* Feature 1 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs mx-auto md:mx-0">
                  <Zap className="size-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Record in seconds</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tap a card, type the amount, done. Works even without internet.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs mx-auto md:mx-0">
                  <BarChart3 className="size-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">See your habits</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Monthly totals, charts and category reports show where it all goes.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-3">
                <div className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shadow-xs mx-auto md:mx-0">
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

        {/* 4. Final CTA Band: Full-width edge-to-edge Violet gradient with calm money decorations (A4) */}
        <section className="w-full bg-gradient-to-br from-[#5B3FD1] to-[#4A31B5] text-white py-16 lg:py-24 relative overflow-hidden">
          {/* Edge Money Decorations: white at 8-12% opacity, aria-hidden, never overlapping text */}
          {/* Left: Large ₦ sign */}
          <div
            aria-hidden="true"
            className="select-none pointer-events-none absolute left-3 sm:left-8 lg:left-16 top-1/2 -translate-y-1/2 text-white/[0.09] font-bold text-6xl sm:text-8xl lg:text-9xl"
          >
            ₦
          </div>

          {/* Top Right: Outlined coin circles (2 on mobile, 3 on desktop) */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 sm:right-10 lg:right-16 top-4 sm:top-8 w-20 sm:w-32 h-20 sm:h-32 text-white/[0.09]"
            viewBox="0 0 120 120"
            fill="none"
          >
            <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="2" />
            <circle cx="85" cy="30" r="18" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="75" cy="80" r="22" stroke="currentColor" strokeWidth="2" className="hidden sm:block" />
          </svg>

          {/* Bottom Right: Gentle rising line chart with 4 dots */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute right-3 sm:right-12 lg:right-20 bottom-3 sm:bottom-6 w-28 sm:w-44 h-12 sm:h-16 text-white/[0.11]"
            viewBox="0 0 160 50"
            fill="none"
          >
            <path d="M10 40 Q 50 35, 80 25 T 150 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="40" r="3" fill="currentColor" />
            <circle cx="60" cy="32" r="3" fill="currentColor" />
            <circle cx="110" cy="20" r="3" fill="currentColor" />
            <circle cx="150" cy="10" r="3.5" fill="currentColor" />
          </svg>

          {/* Centred Content */}
          <div className="relative z-10 mx-auto max-w-xl px-4 text-center space-y-4 sm:space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Start mapping your money today.
            </h2>
            <p className="text-sm sm:text-base text-white/80 font-medium">
              Free to use. Works on your phone and laptop.
            </p>
            <div className="pt-1">
              <Button
                asChild
                size="lg"
                data-testid="landing-get-started-cta"
                className="h-12 sm:h-[52px] rounded-xl bg-white text-primary hover:bg-white/90 font-bold px-8 shadow-md cursor-pointer"
              >
                <Link href="/welcome?mode=signup" prefetch={false}>Get started</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Footer: Thin strip BELOW the purple band, on normal page background (A5) */}
      <footer className="w-full border-t border-border/60 bg-background py-6 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-4 text-center sm:text-left">
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
