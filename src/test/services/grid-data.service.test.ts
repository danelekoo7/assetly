import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import GridDataService from "@/lib/services/grid-data.service";
import type { Database } from "@/db/database.types";

// ================================================================================================
// TEST FIXTURES
// ================================================================================================

const mockAccounts = [
  {
    id: "acc-cash-1",
    name: "mBank",
    type: "cash_asset" as const,
    archived_at: null,
  },
  {
    id: "acc-investment-1",
    name: "XTB",
    type: "investment_asset" as const,
    archived_at: null,
  },
  {
    id: "acc-liability-1",
    name: "Kredyt hipoteczny",
    type: "liability" as const,
    archived_at: null,
  },
  {
    id: "acc-archived-1",
    name: "Stare konto",
    type: "cash_asset" as const,
    archived_at: "2024-01-15T00:00:00Z",
  },
];

const mockValueEntries = [
  // Entries for mBank (cash_asset)
  {
    account_id: "acc-cash-1",
    date: "2024-01-01T00:00:00Z",
    value: 1000,
    cash_flow: 0,
    gain_loss: 0,
  },
  {
    account_id: "acc-cash-1",
    date: "2024-02-01T00:00:00Z",
    value: 1200,
    cash_flow: 200,
    gain_loss: 0,
  },
  {
    account_id: "acc-cash-1",
    date: "2024-03-01T00:00:00Z",
    value: 1300,
    cash_flow: 100,
    gain_loss: 0,
  },
  // Entries for XTB (investment_asset)
  {
    account_id: "acc-investment-1",
    date: "2024-01-01T00:00:00Z",
    value: 10000,
    cash_flow: 0,
    gain_loss: 0,
  },
  {
    account_id: "acc-investment-1",
    date: "2024-02-01T00:00:00Z",
    value: 10500,
    cash_flow: 0,
    gain_loss: 500,
  },
  // Entries for Kredyt (liability)
  {
    account_id: "acc-liability-1",
    date: "2024-01-01T00:00:00Z",
    value: 500,
    cash_flow: 0,
    gain_loss: 0,
  },
  {
    account_id: "acc-liability-1",
    date: "2024-02-01T00:00:00Z",
    value: 450,
    cash_flow: -50,
    gain_loss: 0,
  },
];

// ================================================================================================
// MOCK SUPABASE CLIENT
// ================================================================================================

type MockAccounts = typeof mockAccounts;
type MockEntries = typeof mockValueEntries;

function createMockSupabaseClient(
  accountsData: MockAccounts | Error = mockAccounts,
  entriesData: MockEntries | Error = mockValueEntries
) {
  const createThenable = (data: unknown, error: { message: string } | null = null) => ({
    then: (resolve: (value: { data: unknown; error: { message: string } | null }) => void) => resolve({ data, error }),
  });

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    // Make the query builder thenable to resolve with data
    ...createThenable(null),
  };

  const from = vi.fn((table: string) => {
    if (table === "accounts") {
      // If the accountsData is an error, make the query fail
      if (accountsData instanceof Error) {
        const errorBuilder = {
          ...mockQueryBuilder,
          ...createThenable(null, { message: accountsData.message }),
        };
        errorBuilder.select = vi.fn().mockReturnValue(errorBuilder);
        return errorBuilder;
      }
      const successBuilder = {
        ...mockQueryBuilder,
        ...createThenable(accountsData),
      };
      successBuilder.select = vi.fn().mockReturnValue(successBuilder);
      return successBuilder;
    }
    if (table === "value_entries") {
      if (entriesData instanceof Error) {
        const errorBuilder = {
          ...mockQueryBuilder,
          ...createThenable(null, { message: entriesData.message }),
        };
        errorBuilder.select = vi.fn().mockReturnValue(errorBuilder);
        return errorBuilder;
      }
      const successBuilder = {
        ...mockQueryBuilder,
        ...createThenable(entriesData),
      };
      successBuilder.select = vi.fn().mockReturnValue(successBuilder);
      return successBuilder;
    }
    return mockQueryBuilder;
  });

  const mockSupabase = {
    from,
  } as unknown as SupabaseClient<Database>;

  // Return the original mockQuery for verifying calls on the builder methods
  return { mockSupabase, mockQuery: mockQueryBuilder };
}

// ================================================================================================
// TESTS
// ================================================================================================

describe("GridDataService", () => {
  describe("getGridData", () => {
    let userId: string;

    beforeEach(() => {
      userId = "test-user-id";
      vi.clearAllMocks();
    });

    // =============================================================================================
    // HAPPY PATH TESTS
    // =============================================================================================

    it("should return formatted GridDataDto with accounts and entries", async () => {
      const { mockSupabase } = createMockSupabaseClient();

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify structure
      expect(result).toHaveProperty("dates");
      expect(result).toHaveProperty("accounts");
      expect(result).toHaveProperty("summary");
      expect(result.summary).toHaveProperty("by_date");
      expect(result.summary).toHaveProperty("kpi");

      // Verify dates are present and sorted
      expect(result.dates).toHaveLength(3);
      expect(result.dates).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);

      // Verify accounts count (3 active accounts)
      expect(result.accounts).toHaveLength(4); // All accounts since showArchived defaults to include all

      // Verify first account structure
      const firstAccount = result.accounts[0];
      expect(firstAccount).toHaveProperty("id");
      expect(firstAccount).toHaveProperty("name");
      expect(firstAccount).toHaveProperty("type");
      expect(firstAccount).toHaveProperty("entries");

      // Verify entries structure
      expect(firstAccount.entries["2024-01-01"]).toHaveProperty("value");
      expect(firstAccount.entries["2024-01-01"]).toHaveProperty("cash_flow");
      expect(firstAccount.entries["2024-01-01"]).toHaveProperty("gain_loss");

      // Verify summary exists for each date
      expect(result.summary.by_date["2024-01-01"]).toHaveProperty("net_worth");
      expect(result.summary.by_date["2024-02-01"]).toHaveProperty("net_worth");
      expect(result.summary.by_date["2024-03-01"]).toHaveProperty("net_worth");
    });

    it("should calculate summary net_worth correctly", async () => {
      const { mockSupabase } = createMockSupabaseClient();

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // For 2024-01-01: mBank (1000) + XTB (10000) - Kredyt (500) = 10500
      expect(result.summary.by_date["2024-01-01"].net_worth).toBe(10500);

      // For 2024-02-01: mBank (1200) + XTB (10500) - Kredyt (450) = 11250
      expect(result.summary.by_date["2024-02-01"].net_worth).toBe(11250);

      // For 2024-03-01: mBank (1300) + XTB (10500, forward-filled) - Kredyt (450, forward-filled) = 11350
      expect(result.summary.by_date["2024-03-01"].net_worth).toBe(11350);
    });

    it("should handle multiple account types in net_worth calculation", async () => {
      const customAccounts = [
        { id: "acc1", name: "Account 1", type: "cash_asset" as const, archived_at: null },
        { id: "acc2", name: "Account 2", type: "cash_asset" as const, archived_at: null },
        { id: "acc3", name: "Account 3", type: "investment_asset" as const, archived_at: null },
        { id: "acc4", name: "Account 4", type: "liability" as const, archived_at: null },
      ];

      const customEntries = [
        { account_id: "acc1", date: "2024-01-01", value: 1000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc2", date: "2024-01-01", value: 2000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc3", date: "2024-01-01", value: 5000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc4", date: "2024-01-01", value: 500, cash_flow: 0, gain_loss: 0 },
      ];

      const { mockSupabase } = createMockSupabaseClient(customAccounts, customEntries);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Expected: 1000 + 2000 + 5000 - 500 = 7500
      expect(result.summary.by_date["2024-01-01"].net_worth).toBe(7500);
    });

    it("should sort dates chronologically", async () => {
      const unorderedEntries = [
        { account_id: "acc-cash-1", date: "2024-03-01", value: 1300, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc-cash-1", date: "2024-01-01", value: 1000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc-cash-1", date: "2024-02-01", value: 1200, cash_flow: 0, gain_loss: 0 },
      ];

      const { mockSupabase } = createMockSupabaseClient([mockAccounts[0]], unorderedEntries);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      expect(result.dates).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
    });

    // =============================================================================================
    // FILTERING TESTS
    // =============================================================================================

    it("should always return all accounts regardless of archive status", async () => {
      const { mockSupabase } = createMockSupabaseClient();

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify all accounts are returned (including archived one)
      expect(result.accounts).toHaveLength(4);

      // Verify archived account is present in results
      const archivedAccount = result.accounts.find((acc) => acc.id === "acc-archived-1");
      expect(archivedAccount).toBeDefined();
      expect(archivedAccount?.name).toBe("Stare konto");
      expect(archivedAccount?.archived_at).toBe("2024-01-15T00:00:00Z");
    });

    it("should filter entries by date range (from)", async () => {
      const { mockSupabase, mockQuery } = createMockSupabaseClient();

      await GridDataService.getGridData(mockSupabase, userId, { from: "2024-02-01" });

      // Verify that gte() was called with from date
      expect(mockQuery.gte).toHaveBeenCalledWith("date", "2024-02-01");
    });

    it("should filter entries by date range (to)", async () => {
      const { mockSupabase, mockQuery } = createMockSupabaseClient();

      await GridDataService.getGridData(mockSupabase, userId, { to: "2024-02-01" });

      // Verify that lte() was called with to date
      expect(mockQuery.lte).toHaveBeenCalledWith("date", "2024-02-01");
    });

    // =============================================================================================
    // EDGE CASES
    // =============================================================================================

    it("should return empty GridDataDto when no accounts exist", async () => {
      const { mockSupabase } = createMockSupabaseClient([], []);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify empty structure
      expect(result.dates).toEqual([]);
      expect(result.accounts).toEqual([]);
      expect(result.summary).toEqual({
        by_date: {},
        kpi: {
          net_worth: 0,
          total_assets: 0,
          total_liabilities: 0,
          cumulative_cash_flow: 0,
          cumulative_gain_loss: 0,
        },
      });
    });

    it("should return accounts with empty entries when no value_entries exist", async () => {
      const accountsOnly = [mockAccounts[0]];
      const { mockSupabase } = createMockSupabaseClient(accountsOnly, []);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify dates are empty
      expect(result.dates).toEqual([]);

      // Verify account exists but has no entries
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].id).toBe("acc-cash-1");
      expect(result.accounts[0].name).toBe("mBank");
      expect(result.accounts[0].entries).toEqual({});

      // Verify summary is empty
      expect(result.summary.by_date).toEqual({});
      expect(result.summary.kpi).toBeDefined();
    });

    it("should extract unique dates from entries", async () => {
      const duplicateEntries = [
        { account_id: "acc-cash-1", date: "2024-01-01T00:00:00Z", value: 1000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc-cash-1", date: "2024-02-01T00:00:00Z", value: 1200, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc-investment-1", date: "2024-01-01T00:00:00Z", value: 5000, cash_flow: 0, gain_loss: 0 },
        { account_id: "acc-investment-1", date: "2024-02-01T00:00:00Z", value: 5500, cash_flow: 0, gain_loss: 0 },
      ];

      const { mockSupabase } = createMockSupabaseClient([mockAccounts[0], mockAccounts[1]], duplicateEntries);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify dates are unique (should only have 2 dates, not 4)
      expect(result.dates).toHaveLength(2);
      expect(result.dates).toEqual(["2024-01-01", "2024-02-01"]);
    });

    it("should forward-fill values for accounts with earlier start dates", async () => {
      // Scenario: User has "portfel" account starting 2025-01-01 with value 200
      // Then adds "bank" account starting 2024-10-10 with value 5000
      // For "bank" account on 2025-01-01, it should show 5000 (forward-filled), not null
      const testAccounts = [
        { id: "acc-portfel", name: "portfel", type: "cash_asset" as const, archived_at: null },
        { id: "acc-bank", name: "bank", type: "cash_asset" as const, archived_at: null },
      ];

      const testEntries = [
        // portfel: starts 2025-01-01
        { account_id: "acc-portfel", date: "2025-01-01T00:00:00Z", value: 200, cash_flow: 200, gain_loss: 0 },
        // bank: starts 2024-10-10 (earlier than portfel)
        { account_id: "acc-bank", date: "2024-10-10T00:00:00Z", value: 5000, cash_flow: 5000, gain_loss: 0 },
      ];

      const { mockSupabase } = createMockSupabaseClient(testAccounts, testEntries);

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // Verify dates
      expect(result.dates).toEqual(["2024-10-10", "2025-01-01"]);

      // Find accounts in result
      const portfelAccount = result.accounts.find((acc) => acc.id === "acc-portfel");
      const bankAccount = result.accounts.find((acc) => acc.id === "acc-bank");

      expect(portfelAccount).toBeDefined();
      expect(bankAccount).toBeDefined();

      // For portfel account:
      // - 2024-10-10: should be null (account didn't exist yet)
      // - 2025-01-01: should be 200
      expect(portfelAccount?.entries["2024-10-10"]).toBeUndefined();
      expect(portfelAccount?.entries["2025-01-01"]?.value).toBe(200);

      // For bank account:
      // - 2024-10-10: should be 5000 (initial value)
      // - 2025-01-01: should be 5000 (forward-filled from 2024-10-10)
      expect(bankAccount?.entries["2024-10-10"]?.value).toBe(5000);
      expect(bankAccount?.entries["2025-01-01"]?.value).toBe(5000);

      // Verify net worth calculation includes forward-filled values
      expect(result.summary.by_date["2024-10-10"].net_worth).toBe(5000); // only bank
      expect(result.summary.by_date["2025-01-01"].net_worth).toBe(5200); // bank (5000) + portfel (200)
    });

    // =============================================================================================
    // KPI CALCULATION TESTS
    // =============================================================================================
    describe("KPI calculations", () => {
      it("should calculate total_assets from last date entries", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // Last date is 2024-03-01. Assets: mBank (1300) + XTB (10500, f-filled) = 11800
        expect(result.summary.kpi.total_assets).toBe(11800);
      });

      it("should calculate total_liabilities from last date entries", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // Last date is 2024-03-01. Liabilities: Kredyt (450, f-filled) = 450
        expect(result.summary.kpi.total_liabilities).toBe(450);
      });

      it("should calculate net_worth as assets - liabilities", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // 11800 (assets) - 450 (liabilities) = 11350
        expect(result.summary.kpi.net_worth).toBe(11350);
      });

      it("should calculate cumulative_cash_flow as sum of all entries", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // Service logic sums forward-filled entries.
        // Jan: 0, Feb: 200-50=150, Mar: 100-50=50. Total: 0+150+50=200
        expect(result.summary.kpi.cumulative_cash_flow).toBe(200);
      });

      it("should calculate cumulative_gain_loss as sum of all entries", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // Service logic sums forward-filled entries.
        // Jan: 0, Feb: 500, Mar: 500. Total: 0+500+500=1000
        expect(result.summary.kpi.cumulative_gain_loss).toBe(1000);
      });

      it("should return zero KPI when no dates exist", async () => {
        const { mockSupabase } = createMockSupabaseClient([mockAccounts[0]], []);
        const result = await GridDataService.getGridData(mockSupabase, userId);
        expect(result.summary.kpi).toEqual({
          net_worth: 0,
          total_assets: 0,
          total_liabilities: 0,
          cumulative_cash_flow: 0,
          cumulative_gain_loss: 0,
        });
      });

      it("should handle zero cash_flow and gain_loss gracefully", async () => {
        const customEntries = [
          { account_id: "acc-cash-1", date: "2024-01-01", value: 1000, cash_flow: 100, gain_loss: 0 },
          { account_id: "acc-investment-1", date: "2024-01-01", value: 5000, cash_flow: 0, gain_loss: 50 },
        ];
        const { mockSupabase } = createMockSupabaseClient(mockAccounts, customEntries);
        const result = await GridDataService.getGridData(mockSupabase, userId);
        expect(result.summary.kpi.cumulative_cash_flow).toBe(100);
        expect(result.summary.kpi.cumulative_gain_loss).toBe(50);
      });

      it("should use only last date for assets/liabilities calculation", async () => {
        const { mockSupabase } = createMockSupabaseClient();
        const result = await GridDataService.getGridData(mockSupabase, userId);
        // Last date is 2024-03-01.
        // Assets: mBank (1300) + XTB (10500, f-filled) = 11800
        // Liabilities: Kredyt (450, f-filled) = 450
        expect(result.summary.kpi.total_assets).toBe(11800);
        expect(result.summary.kpi.total_liabilities).toBe(450);
        expect(result.summary.kpi.net_worth).toBe(11350);
      });
    });

    // =============================================================================================
    // ERROR HANDLING
    // =============================================================================================

    it("should throw error when accounts query fails", async () => {
      const { mockSupabase } = createMockSupabaseClient(new Error("Database connection failed"));

      await expect(GridDataService.getGridData(mockSupabase, userId)).rejects.toThrow(
        "Failed to fetch accounts: Database connection failed"
      );
    });

    it("should throw error when value_entries query fails", async () => {
      const { mockSupabase } = createMockSupabaseClient(mockAccounts, new Error("Failed to query value_entries"));

      await expect(GridDataService.getGridData(mockSupabase, userId)).rejects.toThrow(
        "Failed to fetch value entries: Failed to query value_entries"
      );
    });
  });
});
