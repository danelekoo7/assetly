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
      type: "asset",
      entries: {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 1200, cash_flow: 200, gain_loss: 0 },
        "2024-03-01": { value: 1500, cash_flow: 300, gain_loss: 0 },
      },
    },
    {
      id: "acc-2",
      name: "XTB",
      type: "asset",
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
      entries: {
        "2024-01-01": { value: 5000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 4800, cash_flow: -200, gain_loss: 0 },
        "2024-03-01": { value: 4500, cash_flow: -300, gain_loss: 0 },
      },
    },
  ],
  summary: {
    "2024-01-01": { net_worth: 6000 },
    "2024-02-01": { net_worth: 6900 },
    "2024-03-01": { net_worth: 8000 },
  },
};

const emptyGridDataDto: GridDataDto = {
  dates: [],
  accounts: [],
  summary: {},
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

    it("should include archived query param based on showArchived state", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ showArchived: true });

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => emptyGridDataDto,
        } as Response)
      );

      // Act
      await store.fetchData();

      // Assert - verify archived=true in query
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("archived=true"));

      // Change to false
      useDashboardStore.setState({ showArchived: false });
      await store.fetchData();

      // Assert - verify archived=false in query
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("archived=false"));
    });

    it("should add cache-busting timestamp when skipCache is true", async () => {
      // Arrange
      const store = useDashboardStore.getState();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => emptyGridDataDto,
        } as Response)
      );

      // Act - call with skipCache=true
      await store.fetchData(true);

      // Assert - verify _t= parameter is present
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const urlWithTimestamp = fetchCalls[0][0];
      expect(urlWithTimestamp).toContain("_t=");

      // Reset mock
      vi.clearAllMocks();

      // Act - call with skipCache=false (default)
      await store.fetchData(false);

      // Assert - verify _t= parameter is NOT present
      const fetchCallsWithoutTimestamp = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const urlWithoutTimestamp = fetchCallsWithoutTimestamp[0][0];
      expect(urlWithoutTimestamp).not.toContain("_t=");
    });

    it("should calculate summary data from grid data", async () => {
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

      // Assert - verify summaryData calculations for latest date (2024-03-01)
      const state = useDashboardStore.getState();
      const summary = state.summaryData;

      expect(summary).toBeTruthy();
      if (summary) {
        // Latest date has: mBank (1500) + XTB (11000) - Kredyt (4500) = 8000
        expect(summary.net_worth).toBe(8000);

        // Total assets: mBank (1500) + XTB (11000) = 12500
        expect(summary.total_assets).toBe(12500);

        // Total liabilities: Kredyt (4500) = 4500
        expect(summary.total_liabilities).toBe(4500);

        // Cumulative cash_flow: mBank (300) + XTB (200) + Kredyt (-300) = 200
        expect(summary.cumulative_cash_flow).toBe(200);

        // Cumulative gain_loss: mBank (0) + XTB (300) + Kredyt (0) = 300
        expect(summary.cumulative_gain_loss).toBe(300);
      }
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
