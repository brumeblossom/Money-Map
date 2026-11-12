import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandLogoSize = "sm" | "sidebar" | "md" | "lg";
export type BrandLogoSurface = "auto" | "light" | "dark";

export interface BrandLogoProps {
  className?: string;
  size?: BrandLogoSize | number;
  surface?: BrandLogoSurface;
  priority?: boolean;
}

const LOGO_HEIGHTS: Record<BrandLogoSize, number> = {
  sm: 28,
  sidebar: 30,
  md: 36,
  lg: 40,
};

export function BrandLogo({
  className,
  size = "md",
  surface = "auto",
  priority = false,
}: BrandLogoProps) {
  const height = typeof size === "number" ? size : (LOGO_HEIGHTS[size] ?? 36);
  // Full logo aspect ratio is 1200x250 (4.8 : 1)
  const width = Math.round(height * 4.8);

  const imgStyle = {
    height: `${height}px`,
    width: "auto",
  };

  // surface="dark": Always show white-text logo (for dark surfaces like desktop sidebar and footer)
  if (surface === "dark") {
    return (
      <div
        data-testid="brand-logo"
        className={cn("inline-flex items-center shrink-0", className)}
      >
        <Image
          src="/brand/logo-on-dark.png"
          alt="Moneyrails"
          width={width}
          height={height}
          style={imgStyle}
          priority={priority}
          className="h-auto w-auto max-h-full max-w-full select-none"
        />
      </div>
    );
  }

  // surface="light": Always show dark-text logo
  if (surface === "light") {
    return (
      <div
        data-testid="brand-logo"
        className={cn("inline-flex items-center shrink-0", className)}
      >
        <Image
          src="/brand/logo-on-light.png"
          alt="Moneyrails"
          width={width}
          height={height}
          style={imgStyle}
          priority={priority}
          className="h-auto w-auto max-h-full max-w-full select-none"
        />
      </div>
    );
  }

  // surface="auto": CSS-driven instant theme switching without hydration flash
  return (
    <div
      data-testid="brand-logo"
      className={cn("inline-flex items-center shrink-0", className)}
    >
      <Image
        src="/brand/logo-on-light.png"
        alt="Moneyrails"
        width={width}
        height={height}
        style={imgStyle}
        priority={priority}
        className="dark:hidden block h-auto w-auto max-h-full max-w-full select-none"
      />
      <Image
        src="/brand/logo-on-dark.png"
        alt="Moneyrails"
        width={width}
        height={height}
        style={imgStyle}
        priority={priority}
        className="hidden dark:block h-auto w-auto max-h-full max-w-full select-none"
      />
    </div>
  );
}

export type BrandLogoMarkSize = "sm" | "md" | "lg" | "xl";

export interface BrandLogoMarkProps {
  className?: string;
  size?: BrandLogoMarkSize | number;
  priority?: boolean;
}

const MARK_SIZES: Record<BrandLogoMarkSize, number> = {
  sm: 24,
  md: 28,
  lg: 36,
  xl: 48,
};

export function BrandLogoMark({
  className,
  size = "md",
  priority = false,
}: BrandLogoMarkProps) {
  const dimension = typeof size === "number" ? size : (MARK_SIZES[size] ?? 28);

  return (
    <div
      data-testid="brand-logo-mark"
      className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
      style={{ width: `${dimension}px`, height: `${dimension}px` }}
    >
      <Image
        src="/brand/icon-mark.png"
        alt="Moneyrails"
        width={dimension}
        height={dimension}
        priority={priority}
        className="h-full w-full object-contain select-none"
      />
    </div>
  );
}
