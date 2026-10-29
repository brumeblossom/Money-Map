import * as React from "react";
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PwaManager } from "@/components/pwa-manager";
import { ThemeProvider } from "@/components/theme-provider";
import { Analytics } from "@vercel/analytics/react";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://moneymap.app"),
  title: {
    default: "Money Map — Know where your money goes",
    template: "%s | Money Map",
  },
  description:
    "Record your income, expenses, giving and money you've lent in seconds. See clear monthly totals and spending habits on your phone or laptop.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Money Map",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Money Map — Know where your money goes",
    description:
      "Record your income, expenses, giving and money you've lent in seconds. See clear monthly totals and spending habits on your phone or laptop.",
    type: "website",
    siteName: "Money Map",
  },
  twitter: {
    card: "summary_large_image",
    title: "Money Map — Know where your money goes",
    description:
      "Record your income, expenses, giving and money you've lent in seconds. See clear monthly totals and spending habits on your phone or laptop.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: "#5B3FD1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaManager />
          <Analytics
            beforeSend={(event) =>
              typeof window !== "undefined" &&
              (window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1")
                ? null
                : event
            }
          />
          <React.Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </React.Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

