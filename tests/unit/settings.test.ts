import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXPLANATION_MODE,
  getExplanationSectionId,
  toExplanationMode
} from "@/lib/learning/explanation-modes";
import { changePasswordSchema, updateProfileSchema } from "@/lib/validations/settings";

describe("explanation mode preference", () => {
  it("maps each mode to the matching mission tab", () => {
    expect(getExplanationSectionId("QUICK")).toBe("rapida");
    expect(getExplanationSectionId("ANALOGY")).toBe("analogia");
    expect(getExplanationSectionId("SUMMARY")).toBe("resumo");
  });

  it("falls back to the default mode for unknown or missing values", () => {
    expect(toExplanationMode(null)).toBe(DEFAULT_EXPLANATION_MODE);
    expect(toExplanationMode("INVALID")).toBe(DEFAULT_EXPLANATION_MODE);
    expect(getExplanationSectionId(undefined)).toBe("mastigada");
  });
});

describe("settings validations", () => {
  it("trims the profile and accepts an empty bio", () => {
    const result = updateProfileSchema.safeParse({ name: "  Lucas Andrade  ", bio: "" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe("Lucas Andrade");
  });

  it("rejects a short name", () => {
    expect(updateProfileSchema.safeParse({ name: "Lu", bio: "" }).success).toBe(false);
  });

  it("rejects a password change without a matching confirmation", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "suportif123",
      newPassword: "novasenha123",
      confirmPassword: "novasenha124"
    });

    expect(result.success).toBe(false);
  });

  it("rejects reusing the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "suportif123",
      newPassword: "suportif123",
      confirmPassword: "suportif123"
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "suportif123",
      newPassword: "novasenha123",
      confirmPassword: "novasenha123"
    });

    expect(result.success).toBe(true);
  });
});
