import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login", { waitUntil: "networkidle" });
  }

  async fillEmail(email: string) {
    await this.page.getByTestId("email-input").fill(email);
  }

  async fillPassword(password: string) {
    await this.page.getByTestId("password-input").fill(password);
  }

  async clickLogin() {
    await this.page.getByTestId("login-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async expectToBeOnLoginPage() {
    await this.page.waitForURL("/login");
  }

  async expectToBeRedirectedToDashboard() {
    await this.page.waitForURL("/");
    await expect(this.page).toHaveURL("/");
  }

  async expectErrorMessage(message: string) {
    await this.page.waitForSelector(`[data-testid="error-message"]:has-text("${message}")`);
  }
}
