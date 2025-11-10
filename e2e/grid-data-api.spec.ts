import { expect, test } from "@playwright/test";
import { LoginPage } from "./page-objects/login.page";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const E2E_USERNAME = process.env.E2E_USERNAME!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const E2E_PASSWORD = process.env.E2E_PASSWORD!;

test.describe("GET /api/grid-data endpoint", () => {
  // Helper function to login once and reuse session
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);
    await loginPage.expectToBeRedirectedToDashboard();
  });

  test("should return valid GridDataDto structure with real data", async ({ page }) => {
    // Act: Call the API endpoint through the authenticated browser context
    const response = await page.request.get("/api/grid-data");
    
    // Assert: Success response
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");

    // Assert: Response has correct GridDataDto structure
    const data = await response.json();
    expect(data).toHaveProperty("dates");
    expect(data).toHaveProperty("accounts");
    expect(data).toHaveProperty("summary");
    expect(Array.isArray(data.dates)).toBe(true);
    expect(Array.isArray(data.accounts)).toBe(true);
    expect(typeof data.summary).toBe("object");

    // Assert: If data exists, verify detailed structure
    if (data.accounts.length > 0) {
      const account = data.accounts[0];
      expect(account).toHaveProperty("id");
      expect(account).toHaveProperty("name");
      expect(account).toHaveProperty("type");
      expect(account).toHaveProperty("entries");
      expect(["cash_asset", "investment_asset", "liability"]).toContain(account.type);
    }
  });

  test("should calculate net_worth correctly (real business logic test)", async ({ page }) => {
    // Act: Fetch grid data
    const response = await page.request.get("/api/grid-data");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Assert: Verify net_worth calculation logic for each date
    // This tests the real business logic: assets - liabilities = net_worth
    data.dates.forEach((date: string) => {
      if (data.summary[date]) {
        let calculatedNetWorth = 0;

        // Manually calculate net_worth to verify the service logic
        data.accounts.forEach((account: { type: string; entries: Record<string, { value: number }> }) => {
          const entry = account.entries[date];
          if (entry) {
            if (account.type === "liability") {
              // Liabilities are subtracted from net worth
              calculatedNetWorth -= entry.value;
            } else {
              // Assets (cash_asset, investment_asset) are added to net worth
              calculatedNetWorth += entry.value;
            }
          }
        });

        // Verify that the API's calculated net_worth matches our calculation
        expect(data.summary[date].net_worth).toBeCloseTo(calculatedNetWorth, 2);
      }
    });
  });

  test("should validate date parameters correctly", async ({ page }) => {
    // Test 1: Invalid date format should return 400
    const invalidDateResponse = await page.request.get("/api/grid-data?from=invalid-date");
    expect(invalidDateResponse.status()).toBe(400);

    // Test 2: from > to should return 400
    const invalidRangeResponse = await page.request.get("/api/grid-data?from=2024-12-31&to=2024-01-01");
    expect(invalidRangeResponse.status()).toBe(400);
    const errorData = await invalidRangeResponse.json();
    expect(errorData.error).toContain("Nieprawidłowe parametry zapytania");
  });
});
