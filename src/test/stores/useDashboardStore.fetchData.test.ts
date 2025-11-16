import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto } from "@/types";

// ================================================================================================
// TEST FIXTURES
// ================================================================================================

const mockGridDataDto: GridDataDto = {
  dates: ["2024-01-01", "2024-02-01", "2024-03-01"],
  accounts: [
    {
      id: "acc-1",
      name: "mBank",
      type: "cash_asset",
      archived_at: null,
      entries: {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 1200, cash_flow: 200, gain_loss: 0 },
        "2024-03-01": { value: 1500, cash_flow: 300, gain_loss: 0 },
      },
    },
    {
      id: "acc-2",
      name: "XTB",
      type: "investment_asset",
      archived_at: null,
      entries: {
        "2024-01-01": { value: 10000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 10500, cash_flow: 0, gain_loss: 500 },
        "2024-03-01": { value: 11000, cash_flow: 200, gain_loss: 300 },
      },
    },
    {
      id: "acc-3",
      name: "Kredyt",
      type: "liability",
      archived_at: null,
      entries: {
        "2024-01-01": { value: 5000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 4800, cash_flow: -200, gain_loss: 0 },
        "2024-03-01": { value: 4500, cash_flow: -300, gain_loss: 0 },
      },
    },
  ],
  summary: {
    by_date: {
      "2024-01-01": { net_worth: 6000 },
      "2024-02-01": { net_worth: 6900 },
      "2024-03-01": { net_worth: 8000 },
    },
    kpi: {
      net_worth: 8000,
      total_assets: 12500,
      total_liabilities: 4500,
      cumulative_cash_flow: 200,
      cumulative_gain_loss: 800,
    },
  },
};

const emptyGridDataDto: GridDataDto = {
  dates: [],
  accounts: [],
  summary: {
    by_date: {},
    kpi: {
      net_worth: 0,
      total_assets: 0,
      total_liabilities: 0,
      cumulative_cash_flow: 0,
      cumulative_gain_loss: 0,
    },
  },
};

// ================================================================================================
// TESTS
// ================================================================================================

describe("useDashboardStore - fetchData", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useDashboardStore.getState();
    store.resetStore();
    vi.clearAllMocks();

    // Setup default fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==============================================================================================
  // BASIC FUNCTIONALITY TESTS
  // ==============================================================================================

  describe("basic functionality", () => {
    it("should fetch grid data from API", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGridDataDto,
        } as Response)
      );

      // Act
      await store.fetchData();

      // Assert - verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/grid-data"));

      // Verify gridData was set
      const state = useDashboardStore.getState();
      expect(state.gridData).toEqual(mockGridDataDto);
    });

    it("should set summaryData from gridData.summary.kpi", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGridDataDto,
        } as Response)
      );

      // Act
      await store.fetchData();

      // Assert
      const state = useDashboardStore.getState();
      expect(state.summaryData).toEqual(mockGridDataDto.summary.kpi);
    });
  });

  // ==============================================================================================
  // ERROR HANDLING TESTS
  // ==============================================================================================

  describe("error handling", () => {
    it("should set empty data instead of error on fetch failure", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
        } as Response)
      );

      // Spy on console.error to verify it was called
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Act
      await store.fetchData();

      // Assert - verify empty data was set
      const state = useDashboardStore.getState();
      expect(state.gridData).toEqual(emptyGridDataDto);
      expect(state.summaryData).toEqual({
        net_worth: 0,
        total_assets: 0,
        total_liabilities: 0,
        cumulative_cash_flow: 0,
        cumulative_gain_loss: 0,
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch grid data:", 500, "Internal Server Error");

      // Verify error state is null (not set)
      expect(state.error).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it("should handle network errors gracefully", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      // Mock fetch to throw network error
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Act
      await store.fetchData();

      // Assert - verify empty data was set
      const state = useDashboardStore.getState();
      expect(state.gridData).toEqual(emptyGridDataDto);
      expect(state.summaryData).toEqual({
        net_worth: 0,
        total_assets: 0,
        total_liabilities: 0,
        cumulative_cash_flow: 0,
        cumulative_gain_loss: 0,
      });

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in fetchData:", expect.any(Error));

      // Verify error state is null
      expect(state.error).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  // ==============================================================================================
  // FILTERED ACCOUNTS TESTS
  // ==============================================================================================

  describe("getFilteredAccounts", () => {
    it("should return empty array when gridData is null", () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: null });

      // Act
      const result = store.getFilteredAccounts();

      // Assert
      expect(result).toEqual([]);
    });

    it("should return all accounts when showArchived is true", () => {
      // Arrange
      const gridDataWithArchived: GridDataDto = {
        ...mockGridDataDto,
        accounts: [
          ...mockGridDataDto.accounts,
          {
            id: "acc-archived",
            name: "Archived Account",
            type: "cash_asset",
            archived_at: "2024-03-15T10:00:00Z",
            entries: {
              "2024-01-01": { value: 500, cash_flow: 0, gain_loss: 0 },
            },
          },
        ],
      };

      const store = useDashboardStore.getState();
      useDashboardStore.setState({
        gridData: gridDataWithArchived,
        showArchived: true,
      });

      // Act
      const result = store.getFilteredAccounts();

      // Assert
      expect(result).toHaveLength(4); // 3 active + 1 archived
      expect(result).toEqual(gridDataWithArchived.accounts);
    });

    it("should return only non-archived accounts when showArchived is false", () => {
      // Arrange
      const gridDataWithArchived: GridDataDto = {
        ...mockGridDataDto,
        accounts: [
          ...mockGridDataDto.accounts,
          {
            id: "acc-archived",
            name: "Archived Account",
            type: "cash_asset",
            archived_at: "2024-03-15T10:00:00Z",
            entries: {
              "2024-01-01": { value: 500, cash_flow: 0, gain_loss: 0 },
            },
          },
        ],
      };

      const store = useDashboardStore.getState();
      useDashboardStore.setState({
        gridData: gridDataWithArchived,
        showArchived: false,
      });

      // Act
      const result = store.getFilteredAccounts();

      // Assert
      expect(result).toHaveLength(3); // Only 3 active accounts
      expect(result.every((acc) => acc.archived_at === null)).toBe(true);
      expect(result.find((acc) => acc.id === "acc-archived")).toBeUndefined();
    });
  });

  // ==============================================================================================
  // LOADING STATE TESTS
  // ==============================================================================================

  describe("loading state", () => {
    it("should set isLoading to true during fetch", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() => {
        // Check state immediately when fetch is called
        const currentState = useDashboardStore.getState();
        expect(currentState.isLoading).toBe(true);

        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => emptyGridDataDto,
        } as Response);
      });

      // Act
      await store.fetchData();

      // Loading state was verified inside the mock
    });

    it("should set isLoading to false after fetch completes", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => emptyGridDataDto,
        } as Response)
      );

      // Act
      await store.fetchData();

      // Assert
      const state = useDashboardStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });
});
