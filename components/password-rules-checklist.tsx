import * as React from "react";
import { Check, Circle } from "lucide-react";
import { checkPasswordRules } from "@/lib/validation/password";

interface PasswordRulesChecklistProps {
  password: string;
  className?: string;
}

export function PasswordRulesChecklist({
  password,
  className = "",
}: PasswordRulesChecklistProps) {
  const rules = checkPasswordRules(password);

  return (
    <ul
      aria-live="polite"
      aria-label="Password requirements"
      className={`space-y-1.5 pt-1 text-xs ${className}`}
    >
      {rules.map((rule) => (
        <li
          key={rule.id}
          data-testid={`password-rule-${rule.id}`}
          data-met={rule.met ? "true" : "false"}
          className={`flex items-center gap-2 transition-colors ${
            rule.met
              ? "text-money-income font-medium"
              : "text-muted-foreground"
          }`}
        >
          {rule.met ? (
            <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
          ) : (
            <Circle className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
          )}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}
