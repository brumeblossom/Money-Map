"use client";

import dynamic from "next/dynamic";

export const AppHomeLoader = dynamic(
  () => import("@/components/home-view").then((m) => m.HomeView),
  { ssr: false },
);
