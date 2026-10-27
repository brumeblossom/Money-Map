import { z } from "zod";

export interface PasswordRuleCheck {
  id: "minLength" | "hasUppercase" | "hasLowercase" | "hasNumber";
  label: string;
  met: boolean;
}

export function checkPasswordRules(password: string): PasswordRuleCheck[] {
  return [
    {
      id: "minLength",
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      id: "hasUppercase",
      label: "One uppercase letter (A-Z)",
      met: /[A-Z]/.test(password),
    },
    {
      id: "hasLowercase",
      label: "One lowercase letter (a-z)",
      met: /[a-z]/.test(password),
    },
    {
      id: "hasNumber",
      label: "One number (0-9)",
      met: /[0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordRules(password).every((rule) => rule.met);
}

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters required")
  .refine((val) => /[A-Z]/.test(val), "Must include at least one uppercase letter (A-Z)")
  .refine((val) => /[a-z]/.test(val), "Must include at least one lowercase letter (a-z)")
  .refine((val) => /[0-9]/.test(val), "Must include at least one number (0-9)");

export const signUpFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Enter your first name")
    .max(30, "Name must be 30 characters or less"),
  email: z.string().trim().email("Enter a valid email"),
  password: passwordSchema,
});

export const signInFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const resetPasswordRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export const setNewPasswordSchema = z.object({
  password: passwordSchema,
});
