import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NativeSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        <select
          ref={ref}
          data-slot="native-select"
          className={cn(
            "flex h-11 w-full appearance-none items-center justify-between rounded-xl border border-input bg-background/50 pl-3.5 pr-10 py-2 text-base text-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
