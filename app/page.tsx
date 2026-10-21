import * as React from "react";
import { HomeView } from "@/components/home-view";

export default function HomePage() {
  return (
    <React.Suspense fallback={null}>
      <HomeView />
    </React.Suspense>
  );
}

