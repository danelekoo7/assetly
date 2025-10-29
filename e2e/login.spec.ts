import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/login.page";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const E2E_USERNAME = process.env.E2E_USERNAME!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe("Login functionality", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should successfully log in with valid credentials", async ({ page }) => {
    // Arrange
    await expect(page).toHaveURL("/login");

    // Act
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Assert
    await loginPage.expectToBeRedirectedToDashboard();
  });

  test("should display error for invalid credentials", async ({ page }) => {
    // Arrange
    await expect(page).toHaveURL("/login");

    // Act
    await loginPage.login("invalid@example.com", "wrongpassword");

    // Assert
    await expect(page.locator('[role="alert"]')).toContainText("Nieprawidłowy email lub hasło");
  });
});
