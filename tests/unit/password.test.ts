import { describe, it, expect } from "vitest";
import {
  checkPasswordRules,
  isPasswordValid,
  passwordSchema,
  signUpFormSchema,
  signInFormSchema,
  setNewPasswordSchema,
} from "@/lib/validation/password";

describe("Password Rules & Schemas (Prompt 17f B7)", () => {
  it("enforces all four password rules correctly", () => {
    // "password" - no uppercase, no number
    const r1 = checkPasswordRules("password");
    expect(r1.find((r) => r.id === "minLength")?.met).toBe(true);
    expect(r1.find((r) => r.id === "hasUppercase")?.met).toBe(false);
    expect(r1.find((r) => r.id === "hasLowercase")?.met).toBe(true);
    expect(r1.find((r) => r.id === "hasNumber")?.met).toBe(false);
    expect(isPasswordValid("password")).toBe(false);

    // "PASSWORD1" - no lowercase
    const r2 = checkPasswordRules("PASSWORD1");
    expect(r2.find((r) => r.id === "minLength")?.met).toBe(true);
    expect(r2.find((r) => r.id === "hasUppercase")?.met).toBe(true);
    expect(r2.find((r) => r.id === "hasLowercase")?.met).toBe(false);
    expect(r2.find((r) => r.id === "hasNumber")?.met).toBe(true);
    expect(isPasswordValid("PASSWORD1")).toBe(false);

    // "Pass1" - too short (<8)
    const r3 = checkPasswordRules("Pass1");
    expect(r3.find((r) => r.id === "minLength")?.met).toBe(false);
    expect(r3.find((r) => r.id === "hasUppercase")?.met).toBe(true);
    expect(r3.find((r) => r.id === "hasLowercase")?.met).toBe(true);
    expect(r3.find((r) => r.id === "hasNumber")?.met).toBe(true);
    expect(isPasswordValid("Pass1")).toBe(false);

    // "Password1" - meets all 4 requirements
    const r4 = checkPasswordRules("Password1");
    expect(r4.every((r) => r.met)).toBe(true);
    expect(isPasswordValid("Password1")).toBe(true);
  });

  it("validates password with Zod schema", () => {
    expect(passwordSchema.safeParse("password").success).toBe(false);
    expect(passwordSchema.safeParse("PASSWORD1").success).toBe(false);
    expect(passwordSchema.safeParse("Password1").success).toBe(true);
  });

  it("validates sign-up form with name, email and strong password", () => {
    const invalid = signUpFormSchema.safeParse({
      firstName: "",
      email: "not-an-email",
      password: "weak",
    });
    expect(invalid.success).toBe(false);

    const valid = signUpFormSchema.safeParse({
      firstName: "Ada",
      email: "ada@example.com",
      password: "Password1",
    });
    expect(valid.success).toBe(true);
  });

  it("validates sign-in form requires valid email and password presence", () => {
    expect(
      signInFormSchema.safeParse({
        email: "ada@example.com",
        password: "any-existing-password",
      }).success,
    ).toBe(true);

    expect(
      signInFormSchema.safeParse({
        email: "not-an-email",
        password: "pwd",
      }).success,
    ).toBe(false);
  });

  it("validates set new password requires meeting rules", () => {
    expect(setNewPasswordSchema.safeParse({ password: "password" }).success).toBe(false);
    expect(setNewPasswordSchema.safeParse({ password: "Password1" }).success).toBe(true);
  });
});
