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
    expect(data.summary).toHaveProperty("by_date");
    expect(data.summary).toHaveProperty("kpi");
    expect(Array.isArray(data.dates)).toBe(true);
    expect(Array.isArray(data.accounts)).toBe(true);
    expect(typeof data.summary).toBe("object");
    expect(typeof data.summary.kpi).toBe("object");

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
      if (data.summary.by_date[date]) {
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
        expect(data.summary.by_date[date].net_worth).toBeCloseTo(calculatedNetWorth, 2);
      }
    });
  });

  test("KPI net_worth should reflect last date values", async ({ page }) => {
    // Act
    const response = await page.request.get("/api/grid-data");
    const data = await response.json();

    if (data.dates.length === 0) {
      // If no data, KPI net_worth should be 0
      expect(data.summary.kpi.net_worth).toBe(0);
      return;
    }

    // Arrange
    const lastDate = data.dates[data.dates.length - 1];
    let calculatedNetWorth = 0;

    data.accounts.forEach((account: { type: string; entries: Record<string, { value: number }> }) => {
      const entry = account.entries[lastDate];
      if (entry) {
        if (account.type === "liability") {
          calculatedNetWorth -= entry.value;
        } else {
          calculatedNetWorth += entry.value;
        }
      }
    });

    // Assert
    expect(data.summary.kpi.net_worth).toBeCloseTo(calculatedNetWorth, 2);
    expect(data.summary.by_date[lastDate].net_worth).toBeCloseTo(data.summary.kpi.net_worth, 2);
  });

  test("Cumulative KPI metrics should sum all entries as per service logic", async ({ page }) => {
    // Act
    const response = await page.request.get("/api/grid-data");
    const data = await response.json();

    if (data.dates.length === 0) {
      expect(data.summary.kpi.cumulative_cash_flow).toBe(0);
      expect(data.summary.kpi.cumulative_gain_loss).toBe(0);
      return;
    }

    // Arrange: Replicate the exact logic from the service
    let calculatedCashFlow = 0;
    let calculatedGainLoss = 0;
    data.dates.forEach((date: string) => {
      data.accounts.forEach((account: { entries: Record<string, { cash_flow: number; gain_loss: number }> }) => {
        const entry = account.entries[date];
        if (entry) {
          calculatedCashFlow += entry.cash_flow || 0;
          calculatedGainLoss += entry.gain_loss || 0;
        }
      });
    });

    // Assert
    expect(data.summary.kpi.cumulative_cash_flow).toBeCloseTo(calculatedCashFlow, 2);
    expect(data.summary.kpi.cumulative_gain_loss).toBeCloseTo(calculatedGainLoss, 2);
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
