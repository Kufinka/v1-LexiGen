import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const deckSchema = z.object({
  name: z.string().min(1, "Deck name is required").max(100),
  description: z.string().max(500).optional(),
  languageA: z.string().min(1, "Language A is required").max(50),
  languageB: z.string().min(1, "Language B is required").max(50),
  tags: z.array(z.string()).default([]),
});

export const cardSchema = z.object({
  sideA: z.string().min(1, "Side A is required"),
  sideB: z.string().min(1, "Side B is required"),
  type: z.enum(["WORD", "SENTENCE"]),
});

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  image: z.string().optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(1000),
});

export const aiGenerateSchema = z.object({
  words: z.array(z.string()).min(2, "Select at least 2 words").max(10, "Select at most 10 words"),
  languageA: z.string().min(1),
  languageB: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DeckInput = z.infer<typeof deckSchema>;
export type CardInput = z.infer<typeof cardSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
