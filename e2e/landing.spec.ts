import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display the landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("LexiGen");
  });

  test("should have sign up and sign in links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("should navigate to register page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /get started free/i }).click();
    await expect(page).toHaveURL("/register");
    await expect(page.locator("h3")).toContainText("Create Account");
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL("/login");
    await expect(page.locator("h3")).toContainText("Welcome Back");
  });

  test("should display feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Bilingual Decks")).toBeVisible();
    await expect(page.getByText("Spaced Repetition")).toBeVisible();
    await expect(page.getByText("AI Sentences")).toBeVisible();
  });
});

test.describe("Auth Pages", () => {
  test("register page should have required fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("login page should have required fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("should redirect unauthenticated users from protected routes", async ({ page }) => {
    await page.goto("/decks");
    await page.waitForURL(/login/);
    expect(page.url()).toContain("login");
  });
});
