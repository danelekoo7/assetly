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

function createMockSupabaseClient(
  accountsData: typeof mockAccounts = mockAccounts,
  entriesData: typeof mockValueEntries = mockValueEntries
) {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };

  // We need to control what data is returned based on the table
  let currentTable = "";

  const mockSupabase = {
    from: vi.fn((table: string) => {
      currentTable = table;

      // Return a new query object with terminal methods that return actual data
      const query = { ...mockQuery };

      // Override terminal methods to return data based on current table
      const terminalMethods = {
        then: async (resolve: (value: { data: unknown; error: null }) => void) => {
          if (currentTable === "accounts") {
            resolve({ data: accountsData, error: null });
          } else if (currentTable === "value_entries") {
            resolve({ data: entriesData, error: null });
          }
        },
      };

      return new Proxy(query, {
        get(target: Record<string, unknown>, prop: string) {
          if (prop in terminalMethods) {
            return terminalMethods[prop as keyof typeof terminalMethods];
          }
          return target[prop];
        },
      });
    }),
  } as unknown as SupabaseClient<Database>;

  return { mockSupabase, mockQuery };
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
      expect(result.summary["2024-01-01"]).toHaveProperty("net_worth");
      expect(result.summary["2024-02-01"]).toHaveProperty("net_worth");
      expect(result.summary["2024-03-01"]).toHaveProperty("net_worth");
    });

    it("should calculate summary net_worth correctly", async () => {
      const { mockSupabase } = createMockSupabaseClient();

      const result = await GridDataService.getGridData(mockSupabase, userId);

      // For 2024-01-01: mBank (1000) + XTB (10000) - Kredyt (500) = 10500
      expect(result.summary["2024-01-01"].net_worth).toBe(10500);

      // For 2024-02-01: mBank (1200) + XTB (10500) - Kredyt (450) = 11250
      expect(result.summary["2024-02-01"].net_worth).toBe(11250);

      // For 2024-03-01: only mBank has entry (1300)
      expect(result.summary["2024-03-01"].net_worth).toBe(1300);
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
      expect(result.summary["2024-01-01"].net_worth).toBe(7500);
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

    it("should filter archived accounts when showArchived is false", async () => {
      const { mockSupabase, mockQuery } = createMockSupabaseClient();

      await GridDataService.getGridData(mockSupabase, userId, { showArchived: false });

      // Verify that is() was called with archived_at = null
      expect(mockQuery.is).toHaveBeenCalledWith("archived_at", null);
    });

    it("should include archived accounts when showArchived is true", async () => {
      const { mockSupabase, mockQuery } = createMockSupabaseClient();

      await GridDataService.getGridData(mockSupabase, userId, { showArchived: true });

      // Verify that is() was NOT called (no filtering)
      expect(mockQuery.is).not.toHaveBeenCalled();
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
      expect(result.summary).toEqual({});
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
      expect(result.summary).toEqual({});
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

    // =============================================================================================
    // ERROR HANDLING
    // =============================================================================================

    it("should throw error when accounts query fails", async () => {
      // Create a mock that returns an error for accounts
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection failed" },
          }),
        })),
      } as unknown as SupabaseClient<Database>;

      await expect(GridDataService.getGridData(mockSupabase, userId)).rejects.toThrow(
        "Failed to fetch accounts: Database connection failed"
      );
    });

    it("should throw error when value_entries query fails", async () => {
      let callCount = 0;

      // Create a mock that succeeds for accounts but fails for value_entries
      const mockSupabase = {
        from: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call (accounts) - success with all chain methods
            const accountsQuery = {
              select: vi.fn().mockReturnThis(),
              is: vi.fn().mockReturnThis(),
            };
            // Make it thenable to resolve with data
            Object.assign(accountsQuery, {
              then: async (resolve: (value: { data: unknown; error: null }) => void) => {
                resolve({ data: [mockAccounts[0]], error: null });
              },
            });
            return accountsQuery;
          } else {
            // Second call (value_entries) - error
            const entriesQuery = {
              select: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockReturnThis(),
              order: vi.fn().mockReturnThis(),
            };
            // Make it thenable to resolve with error
            Object.assign(entriesQuery, {
              then: async (resolve: (value: { data: null; error: { message: string } }) => void) => {
                resolve({ data: null, error: { message: "Failed to query value_entries" } });
              },
            });
            return entriesQuery;
          }
        }),
      } as unknown as SupabaseClient<Database>;

      await expect(GridDataService.getGridData(mockSupabase, userId)).rejects.toThrow(
        "Failed to fetch value entries: Failed to query value_entries"
      );
    });
  });
});
