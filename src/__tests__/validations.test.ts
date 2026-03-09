import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema, deckSchema, cardSchema, profileSchema } from "@/lib/validations";

describe("Register Schema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject short username", () => {
    const result = registerSchema.safeParse({
      username: "ab",
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "notanemail",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password without uppercase", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password without number", () => {
    const result = registerSchema.safeParse({
      username: "testuser",
      email: "test@example.com",
      password: "Passwordd",
    });
    expect(result.success).toBe(false);
  });

  it("should reject username with special characters", () => {
    const result = registerSchema.safeParse({
      username: "test user!",
      email: "test@example.com",
      password: "Password1",
    });
    expect(result.success).toBe(false);
  });
});

describe("Login Schema", () => {
  it("should accept valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "anypassword",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("Deck Schema", () => {
  it("should accept valid deck data", () => {
    const result = deckSchema.safeParse({
      name: "My Deck",
      languageA: "English",
      languageB: "Japanese",
      tags: ["travel"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty deck name", () => {
    const result = deckSchema.safeParse({
      name: "",
      languageA: "English",
      languageB: "Japanese",
    });
    expect(result.success).toBe(false);
  });

  it("should default tags to empty array", () => {
    const result = deckSchema.safeParse({
      name: "My Deck",
      languageA: "English",
      languageB: "Japanese",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });
});

describe("Card Schema", () => {
  it("should accept valid WORD card", () => {
    const result = cardSchema.safeParse({
      sideA: "Hello",
      sideB: "こんにちは",
      type: "WORD",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid SENTENCE card", () => {
    const result = cardSchema.safeParse({
      sideA: "How are you?",
      sideB: "お元気ですか？",
      type: "SENTENCE",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid type", () => {
    const result = cardSchema.safeParse({
      sideA: "Hello",
      sideB: "こんにちは",
      type: "PHRASE",
    });
    expect(result.success).toBe(false);
  });
});

describe("Profile Schema", () => {
  it("should accept valid profile", () => {
    const result = profileSchema.safeParse({
      username: "newname",
      bio: "I love languages",
    });
    expect(result.success).toBe(true);
  });

  it("should reject bio over 500 chars", () => {
    const result = profileSchema.safeParse({
      username: "newname",
      bio: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
