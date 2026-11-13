"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountDeletedToast } from "@/components/account-deleted-toast";

export function LandingPageView() {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [timeStr, setTimeStr] = React.useState("9:41");
  const [dateStr, setDateStr] = React.useState("Tuesday, 10 November");
  const [monthStr, setMonthStr] = React.useState("November 2026");

  React.useEffect(() => {
    function tick() {
      const d = new Date();
      setTimeStr(
        d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0")
      );
      setDateStr(
        d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
      setMonthStr(
        d.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      );
    }
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleScrollTo =
    (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    };

  const prepareLandingNavigation = () => {
    try {
      window.history.replaceState({ view: "landing" }, "", "/?view=landing");
    } catch {}
  };

  const handleTryWithoutAccount = () => {
    prepareLandingNavigation();
    document.cookie =
      "moneymap_guest=true; path=/; max-age=2592000; SameSite=Lax";
    document.cookie = "mm_guest=1; path=/; max-age=2592000; SameSite=Lax";
    document.cookie =
      "moneymap_has_session=1; path=/; max-age=2592000; SameSite=Lax";
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  return (
    <div
      id="landing-scroll-container"
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden scroll-smooth bg-white dark:bg-[#121118] text-foreground flex flex-col selection:bg-secondary selection:text-secondary-foreground"
    >
      <AccountDeletedToast />

      {/* a) Header (sticky) */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-white/88 dark:bg-[#121118]/88 backdrop-blur-md">
        <div className="max-w-[1152px] mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <a
            href="#top"
            onClick={handleScrollTo("top")}
            data-testid="landing-logo"
            aria-label="Moneyrails home"
            className="flex items-center no-underline select-none"
          >
            <BrandLogo size="md" className="hidden sm:inline-flex" priority />
            <BrandLogo size="sm" className="sm:hidden inline-flex" priority />
          </a>

          {/* Desktop Nav Links (1024px and up) */}
          <nav
            className="hidden lg:flex items-center gap-7 text-[14px] font-semibold text-muted-foreground"
            aria-label="Page sections"
          >
            <a
              href="#features"
              onClick={handleScrollTo("features")}
              className="hover:text-foreground transition-colors no-underline cursor-pointer"
            >
              Features
            </a>
            <a
              href="#benefits"
              onClick={handleScrollTo("benefits")}
              className="hover:text-foreground transition-colors no-underline cursor-pointer"
            >
              Benefits
            </a>
            <a
              href="#faq"
              onClick={handleScrollTo("faq")}
              className="hover:text-foreground transition-colors no-underline cursor-pointer"
            >
              FAQs
            </a>
          </nav>

          {/* Nav Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* Sign in - desktop only */}
            <Link
              href="/welcome"
              prefetch={false}
              onClick={prepareLandingNavigation}
              data-testid="landing-signin-header"
              className="hidden sm:inline-flex px-2.5 py-2 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer no-underline"
            >
              Sign in
            </Link>

            {/* Get started - phone and desktop */}
            <Link
              href="/welcome?mode=signup"
              prefetch={false}
              onClick={prepareLandingNavigation}
              data-testid="landing-get-started-header"
              className="inline-flex items-center justify-center h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold text-[14px] bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer no-underline whitespace-nowrap"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* b) Hero Section */}
        <section className="py-12 sm:py-18 lg:py-22">
          <div className="max-w-[1152px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Copy (7 cols on desktop) */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start min-w-0">
              <span className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground text-[13px] font-semibold px-3.5 py-1.5 rounded-full self-center lg:self-start">
                <i
                  className="size-1.5 rounded-full bg-money-income block shrink-0"
                  aria-hidden="true"
                />
                Free to use · Works offline
              </span>

              <h1 className="text-[34px] sm:text-[44px] lg:text-[58px] font-extrabold tracking-tight text-foreground leading-[1.1] text-balance">
                Know where your
                <br />
                <span className="text-primary">money goes.</span>
              </h1>

              <p className="text-[17px] sm:text-[18px] text-muted-foreground leading-relaxed">
                Record your income, expenses, giving and money
                <br className="hidden md:inline" /> you&apos;ve lent in seconds.
                See clear monthly totals
                <br className="hidden md:inline" /> and spending habits on your
                phone or laptop.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                <Link
                  href="/welcome?mode=signup"
                  prefetch={false}
                  onClick={prepareLandingNavigation}
                  data-testid="landing-get-started-hero"
                  className="w-[220px] sm:w-auto h-12 sm:h-[52px] px-5 sm:px-7 rounded-xl font-bold text-[15px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs inline-flex items-center justify-center no-underline whitespace-nowrap cursor-pointer"
                >
                  Get started, it&apos;s free
                </Link>
                <Link
                  href="/welcome"
                  prefetch={false}
                  onClick={prepareLandingNavigation}
                  data-testid="landing-signin-hero"
                  className="w-[220px] sm:w-auto h-12 sm:h-[52px] px-5 sm:px-7 rounded-xl font-bold text-[15px] border border-border bg-card dark:bg-[#1B1A23] hover:bg-landing-alt text-foreground transition-colors inline-flex items-center justify-center no-underline whitespace-nowrap cursor-pointer"
                >
                  Sign in
                </Link>
              </div>
            </div>

            {/* Hero Stage / Realistic Phone Mockup (5 cols on desktop) */}
            <div
              data-testid="landing-phone-mockup"
              className="lg:col-span-5 relative grid place-items-center py-6 select-none"
              aria-label="Moneyrails app preview"
            >
              {/* Soft round glow (NO lines, dots, or patterns behind) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute w-[340px] sm:w-[360px] h-[340px] sm:h-[360px] rounded-full bg-primary/10 dark:bg-primary/14 blur-[12px] -z-10"
              />

              {/* Floating Card 1: Salary (+₦250,000 · Salary) */}
              <div
                data-testid="floating-card-salary"
                className="absolute z-20 flex items-center gap-2.5 bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2.5 sm:px-3.5 sm:py-2.5 shadow-[0_14px_34px_-14px_rgba(42,31,102,0.35)] dark:shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)] text-[12px] sm:text-[13px] font-bold text-foreground whitespace-nowrap tabular-nums animate-landing-card-1 top-[44%] left-[calc(50%-180px)] sm:top-[24%] sm:left-[calc(50%-235px)]"
              >
                <span className="size-7 sm:size-8 rounded-[9px] sm:rounded-[10px] bg-[rgba(31,138,99,0.14)] dark:bg-[rgba(98,173,146,0.16)] text-money-income flex items-center justify-center shrink-0">
                  <svg
                    className="size-3.5 sm:size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M17 7 7 17M7 8v9h9" />
                  </svg>
                </span>
                <div>
                  +₦250,000
                  <small className="block text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                    Salary
                  </small>
                </div>
              </div>

              {/* Floating Card 2: Ada paid back (Ada paid back ₦27,500) - desktop/tablet only */}
              <div
                data-testid="floating-card-ada"
                className="hidden sm:flex absolute z-20 items-center gap-2.5 bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] px-3.5 py-2.5 shadow-[0_14px_34px_-14px_rgba(42,31,102,0.35)] dark:shadow-[0_14px_34px_-14px_rgba(0,0,0,0.6)] text-[13px] font-bold text-foreground whitespace-nowrap tabular-nums animate-landing-card-2 bottom-[20%] right-[calc(50%-235px)]"
              >
                <span className="size-8 rounded-[10px] bg-[rgba(46,154,166,0.16)] dark:bg-[rgba(109,184,193,0.16)] text-money-lent-text flex items-center justify-center shrink-0">
                  <svg
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  Ada paid back
                  <small className="block text-[11px] font-medium text-muted-foreground">
                    ₦27,500
                  </small>
                </div>
              </div>

              {/* Phone Mockup Frame */}
              <div
                className="relative w-[260px] sm:w-[300px] rounded-[44px] sm:rounded-[50px] bg-[#16171B] p-[11px] shadow-[0_30px_70px_-24px_rgba(42,31,102,0.40)] dark:shadow-[0_30px_70px_-24px_rgba(0,0,0,0.7)] ring-2 ring-[#2B2D33] dark:ring-[#3A3C44] animate-landing-phone before:content-[''] before:absolute before:w-[3px] before:rounded-[2px] before:bg-[#2B2D33] dark:before:bg-[#3A3C44] before:-left-[3px] before:top-[120px] before:h-[56px] before:shadow-[0_70px_0_#2B2D33] dark:before:shadow-[0_70px_0_#3A3C44] after:content-[''] after:absolute after:w-[3px] after:rounded-[2px] after:bg-[#2B2D33] dark:after:bg-[#3A3C44] after:-right-[3px] after:top-[150px] after:h-[80px]"
              >
                {/* Screen */}
                <div className="relative rounded-[34px] sm:rounded-[40px] bg-[#F7F6FC] dark:bg-[#121118] overflow-hidden flex flex-col text-foreground">
                  {/* Dynamic Island */}
                  <div
                    className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[92px] h-[26px] rounded-full bg-black z-20 pointer-events-none"
                    aria-hidden="true"
                  />

                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 pt-3 h-11 text-[12px] font-bold tabular-nums text-foreground">
                    <span id="landing-clock">{mounted ? timeStr : "9:41"}</span>
                    <span
                      className="flex items-center gap-1.5"
                      aria-hidden="true"
                    >
                      {/* Signal */}
                      <svg
                        className="h-[11px] w-auto fill-current"
                        viewBox="0 0 18 12"
                      >
                        <rect x="0" y="8" width="3" height="4" rx="1" />
                        <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                        <rect x="10" y="3" width="3" height="9" rx="1" />
                        <rect x="15" y="0" width="3" height="12" rx="1" />
                      </svg>
                      {/* Wifi */}
                      <svg
                        className="h-[11px] w-auto fill-current"
                        viewBox="0 0 16 12"
                      >
                        <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.6 10.6 0 0 0 8 .3 10.6 10.6 0 0 0 .7 3.2L2 4.6a8.7 8.7 0 0 1 6-2.4zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.7 1.8l1.3 1.4C5.5 6.4 6.7 5.9 8 5.9zm0 3.7c-.6 0-1.1.3-1.5.7L8 11.8l1.5-1.5c-.4-.4-.9-.7-1.5-.7z" />
                      </svg>
                      {/* Battery */}
                      <svg
                        className="h-[11px] w-auto"
                        viewBox="0 0 26 12"
                        fill="none"
                      >
                        <rect
                          x=".5"
                          y=".5"
                          width="22"
                          height="11"
                          rx="3"
                          stroke="currentColor"
                          opacity=".45"
                        />
                        <rect
                          x="2"
                          y="2"
                          width="16"
                          height="8"
                          rx="1.6"
                          fill="currentColor"
                        />
                        <path
                          d="M24 4v4c.8-.3 1.3-1.1 1.3-2S24.8 4.3 24 4z"
                          fill="currentColor"
                          opacity=".45"
                        />
                      </svg>
                    </span>
                  </div>

                  {/* App Screen Content */}
                  <div className="p-2 sm:px-3 sm:py-2.5 flex flex-col gap-2 sm:gap-2.5">
                    {/* Welcome Header */}
                    <div className="flex justify-between items-end">
                      <div className="min-w-0">
                        <small className="block text-[9px] font-semibold text-muted-foreground truncate">
                          {mounted ? dateStr : "Tuesday, 10 November"}
                        </small>
                        <strong className="text-[12px] sm:text-[12.5px] font-bold text-foreground truncate block">
                          Welcome back, Blossom
                        </strong>
                      </div>
                      <span className="text-[8.5px] font-bold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full shrink-0">
                        Synced
                      </span>
                    </div>

                    {/* Month Summary Card */}
                    <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 text-center shadow-xs">
                      <small className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        {mounted ? monthStr : "November 2026"}
                      </small>
                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="flex flex-col gap-0.5 px-0.5">
                          <em className="not-italic text-[7px] text-muted-foreground whitespace-nowrap">
                            Income
                          </em>
                          <b className="text-[9.5px] sm:text-[10px] font-bold text-money-income tabular-nums">
                            ₦450,000
                          </b>
                        </div>
                        <div className="flex flex-col gap-0.5 px-0.5">
                          <em className="not-italic text-[6.5px] sm:text-[7px] text-muted-foreground whitespace-nowrap">
                            Spent (Exp + Giving)
                          </em>
                          <b className="text-[9.5px] sm:text-[10px] font-bold text-money-expense-text tabular-nums">
                            ₦185,000
                          </b>
                        </div>
                        <div className="flex flex-col gap-0.5 px-0.5">
                          <em className="not-italic text-[7px] text-muted-foreground whitespace-nowrap">
                            Left over
                          </em>
                          <b className="text-[9.5px] sm:text-[10px] font-bold text-foreground tabular-nums">
                            ₦265,000
                          </b>
                        </div>
                      </div>
                    </div>

                    {/* 2x2 Action Tiles */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {/* Income */}
                      <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 h-[66px] sm:h-[70px] flex flex-col justify-between shadow-xs">
                        <span className="size-[22px] rounded-[7px] bg-[rgba(31,138,99,0.14)] dark:bg-[rgba(98,173,146,0.16)] text-money-income grid place-items-center">
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          >
                            <path d="M17 7 7 17M7 8v9h9" />
                          </svg>
                        </span>
                        <div>
                          <em className="not-italic block text-[8px] text-muted-foreground">
                            Income
                          </em>
                          <b className="text-[10px] sm:text-[10.5px] font-bold tabular-nums text-foreground">
                            ₦450,000
                          </b>
                        </div>
                      </div>

                      {/* Expenses */}
                      <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 h-[66px] sm:h-[70px] flex flex-col justify-between shadow-xs">
                        <span className="size-[22px] rounded-[7px] bg-[rgba(229,96,74,0.16)] dark:bg-[rgba(234,128,110,0.16)] text-money-expense-text grid place-items-center">
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                          >
                            <path d="M7 17 17 7M8 7h9v9" />
                          </svg>
                        </span>
                        <div>
                          <em className="not-italic block text-[8px] text-muted-foreground">
                            Expenses
                          </em>
                          <b className="text-[10px] sm:text-[10.5px] font-bold tabular-nums text-foreground">
                            ₦160,000
                          </b>
                        </div>
                      </div>

                      {/* Giving */}
                      <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 h-[66px] sm:h-[70px] flex flex-col justify-between shadow-xs">
                        <span className="size-[22px] rounded-[7px] bg-[rgba(232,169,58,0.18)] dark:bg-[rgba(232,169,58,0.18)] text-money-giving-text grid place-items-center">
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                          </svg>
                        </span>
                        <div>
                          <em className="not-italic block text-[8px] text-muted-foreground">
                            Giving
                          </em>
                          <b className="text-[10px] sm:text-[10.5px] font-bold tabular-nums text-foreground">
                            ₦25,000
                          </b>
                        </div>
                      </div>

                      {/* Money I lent */}
                      <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 h-[66px] sm:h-[70px] flex flex-col justify-between shadow-xs">
                        <span className="size-[22px] rounded-[7px] bg-[rgba(46,154,166,0.16)] dark:bg-[rgba(109,184,193,0.16)] text-money-lent-text grid place-items-center">
                          <svg
                            className="size-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 8v8M9 11h6" />
                          </svg>
                        </span>
                        <div>
                          <em className="not-italic block text-[8px] text-muted-foreground">
                            Money I lent
                          </em>
                          <b className="text-[10px] sm:text-[10.5px] font-bold tabular-nums text-foreground">
                            ₦80,000
                          </b>
                        </div>
                      </div>
                    </div>

                    {/* Due Item Card */}
                    <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[14px] p-2 flex justify-between items-center text-[9px] shadow-xs">
                      <div>
                        <b className="font-bold text-foreground">
                          Tunde · Car repairs
                        </b>
                        <small className="block text-[8px] text-muted-foreground">
                          Due in 5 days
                        </small>
                      </div>
                      <b className="text-money-lent-text tabular-nums font-bold">
                        ₦50,000
                      </b>
                    </div>
                  </div>

                  {/* Tabbar */}
                  <nav
                    className="mt-auto grid grid-cols-5 items-end bg-card dark:bg-[#1B1A23] border-t border-border px-1.5 pt-2 pb-1.5"
                    aria-hidden="true"
                  >
                    <span className="flex flex-col items-center gap-0.5 text-[7.5px] font-semibold text-primary">
                      <span className="bg-secondary rounded-full px-2.5 py-0.5 grid">
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        >
                          <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
                        </svg>
                      </span>
                      Home
                    </span>
                    <span className="flex flex-col items-center gap-0.5 text-[7.5px] font-semibold text-muted-foreground">
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                      </svg>
                      Records
                    </span>
                    <span className="flex flex-col items-center justify-end">
                      <span className="size-[34px] rounded-xl bg-primary text-white grid place-items-center mb-1 shadow-[0_6px_14px_-6px_rgba(91,63,209,0.7)]">
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </span>
                    <span className="flex flex-col items-center gap-0.5 text-[7.5px] font-semibold text-muted-foreground">
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                      </svg>
                      Insights
                    </span>
                    <span className="flex flex-col items-center gap-0.5 text-[7.5px] font-semibold text-muted-foreground">
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                      </svg>
                      Settings
                    </span>
                  </nav>

                  {/* Home Bar */}
                  <div className="h-[18px] bg-card dark:bg-[#1B1A23] grid place-items-center">
                    <i
                      className="block w-24 h-1 rounded-full bg-foreground/85 not-italic"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* c) "Why Moneyrails" Section */}
        <section
          id="why"
          className="scroll-mt-20 py-16 sm:py-24 bg-landing-alt border-y border-border"
        >
          <div className="max-w-[1152px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">
            {/* Copy */}
            <div className="flex flex-col gap-5 text-center lg:text-left items-center lg:items-start min-w-0">
              <span className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary">
                Why Moneyrails
              </span>
              <h2 className="text-[28px] sm:text-[34px] lg:text-[40px] font-extrabold tracking-tight text-foreground leading-[1.15] text-balance">
                What you need to know about{" "}
                <span className="text-primary">Moneyrails</span>
              </h2>
              <p className="text-[16px] text-muted-foreground leading-relaxed">
                <b className="text-foreground font-bold">Moneyrails</b> is a
                simple money diary for your phone and laptop. Record what comes
                in, what goes out, what you give and who owes you, in seconds.
                Then see exactly where your money went each month.
              </p>
              <p className="text-[16px] text-muted-foreground leading-relaxed">
                It&apos;s built for everyday people, not accountants. There&apos;s
                no bank login and no complicated budget to set up. Your records
                stay private to you, and the app keeps working when your network
                is poor.
              </p>
              <Link
                href="/welcome?mode=signup"
                prefetch={false}
                onClick={prepareLandingNavigation}
                data-testid="landing-get-started-why"
                className="inline-flex items-center justify-center h-[52px] px-7 rounded-xl font-bold text-[15px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs no-underline cursor-pointer self-center lg:self-start mt-1"
              >
                Get started
              </Link>
            </div>

            {/* Staggered 2x2 Photo Collage */}
            <div
              className="grid grid-cols-2 gap-2.5 sm:gap-4 items-start"
              aria-label="People using their phones and laptops"
            >
              {/* Column 1 */}
              <div className="flex flex-col gap-2.5 sm:gap-4 min-w-0">
                <div className="relative h-[170px] sm:h-[230px] rounded-[20px] bg-[#E4DEFA] dark:bg-[#2A2540] overflow-hidden min-w-0">
                  <Image
                    src="/images/landing/photo-1.jpg"
                    alt="Woman smiling at her phone"
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: "50% 72%" }}
                  />
                </div>
                <div className="relative h-[170px] sm:h-[230px] rounded-[20px] bg-[#E4DEFA] dark:bg-[#2A2540] overflow-hidden min-w-0">
                  <Image
                    src="/images/landing/photo-2.jpg"
                    alt="Hands tapping on a phone screen"
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: "50% 55%" }}
                  />
                </div>
              </div>

              {/* Column 2 (staggered down) */}
              <div className="flex flex-col gap-2.5 sm:gap-4 min-w-0 mt-8 sm:mt-14">
                <div className="relative h-[170px] sm:h-[230px] rounded-[20px] bg-[#E4DEFA] dark:bg-[#2A2540] overflow-hidden min-w-0">
                  <Image
                    src="/images/landing/photo-3.jpg"
                    alt="Woman working on her laptop"
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: "62% 40%" }}
                  />
                </div>
                <div className="relative h-[170px] sm:h-[230px] rounded-[20px] bg-[#E4DEFA] dark:bg-[#2A2540] overflow-hidden min-w-0">
                  <Image
                    src="/images/landing/photo-4.jpg"
                    alt="Hands typing on a laptop"
                    fill
                    sizes="(max-width: 640px) 150px, 260px"
                    loading="lazy"
                    className="object-cover"
                    style={{ objectPosition: "45% 50%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* d) The Three Feature Blocks */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-24">
          <div className="max-w-[1152px] mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center md:text-left">
            {/* Feature 1 */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                </svg>
              </span>
              <h3 className="text-[18px] font-bold text-foreground">
                Record in seconds
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Tap a card, type the amount, done. Works even without internet.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
                </svg>
              </span>
              <h3 className="text-[18px] font-bold text-foreground">
                See your habits
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Monthly totals, charts and category reports show where it all
                goes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="size-12 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                <svg
                  className="size-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <h3 className="text-[18px] font-bold text-foreground">
                Never forget money you lent
              </h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Track who owes you, how much is left and when it&apos;s due.
              </p>
            </div>
          </div>
        </section>

        {/* e) Benefits */}
        <section
          id="benefits"
          className="scroll-mt-20 py-16 sm:py-24 bg-landing-alt border-y border-border"
        >
          <div className="max-w-[1152px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Big Photo 5 */}
            <div className="lg:col-span-5 relative h-[360px] lg:h-[500px] rounded-[20px] bg-[#E4DEFA] dark:bg-[#2A2540] overflow-hidden">
              <Image
                src="/images/landing/photo-5.jpg"
                alt="Man smiling as he types on his phone"
                fill
                sizes="(max-width: 1024px) 100vw, 480px"
                loading="lazy"
                className="object-cover"
                style={{ objectPosition: "50% 40%" }}
              />
            </div>

            {/* Benefits Content */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-3 text-center lg:text-left items-center lg:items-start">
                <span className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary">
                  Benefits
                </span>
                <h2 className="text-[28px] sm:text-[34px] lg:text-[40px] font-extrabold tracking-tight text-foreground leading-[1.15] whitespace-nowrap">
                  Made for <span className="text-primary">real life</span>
                </h2>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  Small amounts add up. Moneyrails makes it easy
                  <br className="hidden md:inline" /> to write them down the
                  moment they happen.
                </p>
              </div>

              <div className="flex flex-col gap-7 mt-8">
                {/* Benefit 1 */}
                <div className="grid grid-cols-[44px_1fr] gap-4 items-start">
                  <span className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M5 12.5 10 17l9-10" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground mb-1">
                      Free to use
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      No subscription and no card needed. Sign up and start
                      recording.
                    </p>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="grid grid-cols-[44px_1fr] gap-4 items-start">
                  <span className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground mb-1">
                      Works without internet
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      Record anywhere. Everything backs up when you&apos;re online
                      again.
                    </p>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="grid grid-cols-[44px_1fr] gap-4 items-start">
                  <span className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="4" width="14" height="11" rx="2" />
                      <rect x="15" y="8" width="7" height="12" rx="1.5" />
                      <path d="M6 19h6" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground mb-1">
                      Phone and laptop
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      Sign in on both and your records stay the same everywhere.
                    </p>
                  </div>
                </div>

                {/* Benefit 4 */}
                <div className="grid grid-cols-[44px_1fr] gap-4 items-start">
                  <span className="size-11 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0">
                    <svg
                      className="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    >
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5M9 13h6M9 17h4" />
                    </svg>
                  </span>
                  <div>
                    <h3 className="text-[16px] font-bold text-foreground mb-1">
                      Clear PDF reports
                    </h3>
                    <p className="text-[14px] text-muted-foreground leading-relaxed">
                      Download any month or period as a tidy PDF to keep or share.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* f) FAQ */}
        <section id="faq" className="scroll-mt-20 py-16 sm:py-24">
          <div className="max-w-[1152px] mx-auto px-4 sm:px-6">
            <div className="bg-card dark:bg-[#1B1A23] border border-border rounded-[24px] p-6 sm:p-9 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Left Column (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-10 text-center lg:text-left items-center lg:items-start">
                <div className="flex flex-col gap-3 items-center lg:items-start">
                  <span className="text-[12px] font-bold tracking-[0.12em] uppercase text-primary">
                    FAQ
                  </span>
                  <h2 className="text-[28px] sm:text-[34px] lg:text-[40px] font-extrabold tracking-tight text-foreground leading-[1.15] text-balance">
                    Frequently asked questions
                  </h2>
                </div>

                <div className="flex flex-col gap-2.5 items-center lg:items-start">
                  <h3 className="text-[18px] font-bold text-foreground">
                    Start mapping your money today.
                  </h3>
                  <p className="text-[14px] text-muted-foreground">
                    Free to use. Works on your phone and laptop.
                  </p>
                  <Link
                    href="/welcome?mode=signup"
                    prefetch={false}
                    onClick={prepareLandingNavigation}
                    data-testid="landing-get-started-cta"
                    className="inline-flex items-center justify-center h-12 sm:h-[52px] px-7 rounded-xl font-bold text-[15px] bg-primary text-primary-foreground hover:bg-primary-hover transition-colors shadow-xs no-underline cursor-pointer mt-1.5"
                  >
                    Get started
                  </Link>
                  <p className="text-[13px] text-muted-foreground mt-3.5">
                    Still have a question? Email us at{" "}
                    <a
                      href="mailto:workwithbrume@gmail.com"
                      className="text-primary font-semibold hover:underline"
                    >
                      workwithbrume@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              {/* Right Column: Accordion (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3 min-w-0">
                {/* FAQ 1 (open by default) */}
                <details
                  open
                  className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors"
                >
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Is Moneyrails free?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    Yes. Moneyrails is free to use. You don&apos;t need a card to
                    sign up.
                  </p>
                </details>

                {/* FAQ 2 */}
                <details className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors">
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Do I need internet to use it?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    No. You can record entries without internet. They&apos;re saved
                    on your device and back up to your account automatically when
                    you&apos;re online again.
                  </p>
                </details>

                {/* FAQ 3 */}
                <details className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors">
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Is my money information safe?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    Yes. Only you can see your records when you&apos;re signed in.
                    Moneyrails never asks for your bank details or connects to
                    your bank, and we don&apos;t sell your data.
                  </p>
                </details>

                {/* FAQ 4 */}
                <details className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors">
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Does it connect to my bank account?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    No. You add entries yourself, in seconds. That keeps things
                    private and works with cash, transfers and anything else.
                  </p>
                </details>

                {/* FAQ 5 */}
                <details className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors">
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Can I use it on my phone and laptop?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    Yes. Sign in with the same account on both and your records
                    match everywhere. On your phone you can also add Moneyrails to
                    your Home Screen like an app.
                  </p>
                </details>

                {/* FAQ 6 */}
                <details className="group border border-border rounded-[14px] bg-white dark:bg-[#121118] open:border-primary/40 transition-colors">
                  <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer flex justify-between items-center gap-4 px-5 py-4 font-semibold text-[15px] text-foreground select-none">
                    <span>Can I try it without an account?</span>
                    <span className="shrink-0 size-7 rounded-lg bg-secondary text-primary flex items-center justify-center transition-transform duration-200 group-open:rotate-45">
                      <svg
                        className="size-3.5 block"
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </summary>
                  <p className="px-5 pb-4.5 pt-0 text-muted-foreground text-[14px] leading-relaxed">
                    Yes. Tap &quot;Try without an account&quot; and start recording.
                    Your entries stay on that device only. Create an account any
                    time to back them up.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* g) Footer (Dark Violet) */}
      <footer className="w-full bg-[#2A1F66] dark:bg-[#171138] text-white pt-14 lg:pt-18 pb-0 mt-auto">
        <div className="max-w-[1152px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-9 sm:gap-10">
            {/* Brand (2 cols on desktop, left col on mobile) */}
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-3.5 text-left items-start max-w-[300px]">
              <a
                href="#top"
                onClick={handleScrollTo("top")}
                aria-label="Moneyrails home"
                className="flex items-center no-underline select-none"
              >
                <BrandLogo surface="dark" size="lg" />
              </a>
              <p className="text-[14px] text-[#BDB6E3] dark:text-[#A9A2D6] leading-relaxed">
                A simple way to record your income, expenses, giving and money
                you&apos;ve lent, on your phone or laptop.
              </p>
            </div>

            {/* Product (1 col on desktop, right col on mobile) */}
            <div className="col-span-1 text-right lg:text-left flex flex-col items-end lg:items-start">
              <h4 className="text-[14px] font-bold text-white mb-3.5">
                Product
              </h4>
              <nav
                className="flex flex-col gap-1.5 text-[14px] text-[#BDB6E3] dark:text-[#A9A2D6]"
                aria-label="Product links"
              >
                <a
                  href="#why"
                  onClick={handleScrollTo("why")}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Why Moneyrails
                </a>
                <a
                  href="#features"
                  onClick={handleScrollTo("features")}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Features
                </a>
                <a
                  href="#benefits"
                  onClick={handleScrollTo("benefits")}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Benefits
                </a>
                <a
                  href="#faq"
                  onClick={handleScrollTo("faq")}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  FAQs
                </a>
              </nav>
            </div>

            {/* Account (1 col on desktop, left col on mobile) */}
            <div className="col-span-1 text-left flex flex-col items-start">
              <h4 className="text-[14px] font-bold text-white mb-3.5">
                Account
              </h4>
              <nav
                className="flex flex-col gap-1.5 text-[14px] text-[#BDB6E3] dark:text-[#A9A2D6]"
                aria-label="Account links"
              >
                <Link
                  href="/welcome?mode=signup"
                  prefetch={false}
                  onClick={prepareLandingNavigation}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Get started
                </Link>
                <Link
                  href="/welcome"
                  prefetch={false}
                  onClick={prepareLandingNavigation}
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  data-testid="landing-try-guest"
                  onClick={handleTryWithoutAccount}
                  className="text-left text-[14px] text-[#BDB6E3] dark:text-[#A9A2D6] hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  Try without an account
                </button>
              </nav>
            </div>

            {/* Help (1 col on desktop, right col on mobile) */}
            <div className="col-span-1 text-right lg:text-left flex flex-col items-end lg:items-start">
              <h4 className="text-[14px] font-bold text-white mb-3.5">Help</h4>
              <nav
                className="flex flex-col gap-1.5 text-[14px] text-[#BDB6E3] dark:text-[#A9A2D6]"
                aria-label="Help links"
              >
                <a
                  href="mailto:workwithbrume@gmail.com"
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Send feedback
                </a>
                <a
                  href="mailto:workwithbrume@gmail.com"
                  className="hover:text-white transition-colors no-underline py-0.5"
                >
                  Contact us
                </a>
              </nav>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-14 border-t border-white/14 py-5.5 flex justify-between items-center gap-4 text-xs sm:text-[13px] text-[#BDB6E3] dark:text-[#A9A2D6]">
            <span className="shrink-0">© 2026 Moneyrails</span>
            <nav className="flex gap-3.5 sm:gap-6 flex-wrap justify-end" aria-label="Footer legal">
              <Link
                href="/privacy"
                prefetch={false}
                className="hover:text-white transition-colors no-underline"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                prefetch={false}
                className="hover:text-white transition-colors no-underline"
              >
                Terms
              </Link>
              <a
                href="mailto:workwithbrume@gmail.com"
                className="hover:text-white transition-colors no-underline"
              >
                Send feedback
              </a>
              <a
                href="mailto:workwithbrume@gmail.com"
                className="hover:text-white transition-colors no-underline"
              >
                Contact us
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
