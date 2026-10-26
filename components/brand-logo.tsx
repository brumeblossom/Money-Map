import * as React from "react";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

export function BrandLogoMark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClasses = {
    sm: "size-6 rounded-[7px] text-xs",
    md: "size-8 rounded-[9px] text-sm",
    lg: "size-10 rounded-[11px] text-base",
    xl: "size-16 rounded-[18px] text-3xl",
  };

  return (
    <div
      data-testid="brand-logo-mark"
      className={cn(
        "flex items-center justify-center bg-primary text-primary-foreground font-extrabold select-none shadow-xs shrink-0",
        sizeClasses[size],
        className,
      )}
      style={{ fontFamily: "inherit" }}
      aria-hidden="true"
    >
      <span className="leading-none tracking-tighter">M</span>
    </div>
  );
}

export function BrandLogo({
  className,
  size = "md",
  showText = true,
  textClassName,
}: BrandLogoProps) {
  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-3xl sm:text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogoMark size={size} />
      {showText && (
        <span
          className={cn(
            "font-extrabold tracking-tight text-foreground select-none",
            textSizes[size],
            textClassName,
          )}
        >
          Money Map
        </span>
      )}
    </div>
  );
}
