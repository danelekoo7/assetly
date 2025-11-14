import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDashboardStore } from "@/lib/stores/useDashboardStore";
import type { GridDataDto } from "@/types";
import { toast } from "sonner";

// ================================================================================================
// MOCKS
// ================================================================================================

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock grid-helpers
vi.mock("@/lib/utils/grid-helpers", () => ({
  findLastEntry: vi.fn((entries: Record<string, unknown>, allDates: string[]) => {
    // Simple implementation for testing
    const sortedDates = [...allDates].sort();
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const date = sortedDates[i];
      if (entries[date]) {
        return { date, entry: entries[date] };
      }
    }
    return null;
  }),
}));

// ================================================================================================
// TEST FIXTURES
// ================================================================================================

const mockGridDataEmpty: GridDataDto = {
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

const mockGridDataWithAccounts: GridDataDto = {
  dates: ["2024-01-01", "2024-02-01"],
  accounts: [
    {
      id: "acc-1",
      name: "mBank",
      type: "cash_asset",
      entries: {
        "2024-01-01": { value: 1000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 1200, cash_flow: 200, gain_loss: 0 },
      },
    },
    {
      id: "acc-2",
      name: "XTB",
      type: "investment_asset",
      entries: {
        "2024-01-01": { value: 10000, cash_flow: 0, gain_loss: 0 },
        "2024-02-01": { value: 10500, cash_flow: 0, gain_loss: 500 },
      },
    },
    {
      id: "acc-3",
      name: "Kredyt",
      type: "liability",
      entries: {
        "2024-01-01": { value: 5000, cash_flow: 0, gain_loss: 0 },
      },
    },
  ],
  summary: {
    by_date: {
      "2024-01-01": { net_worth: 6000 },
      "2024-02-01": { net_worth: 6700 },
    },
    kpi: {
      net_worth: 6700,
      total_assets: 11700,
      total_liabilities: 5000,
      cumulative_cash_flow: 200,
      cumulative_gain_loss: 500,
    },
  },
};

const mockGridDataWithAccountsNoEntries: GridDataDto = {
  dates: [],
  accounts: [
    {
      id: "acc-1",
      name: "New Account",
      type: "cash_asset",
      entries: {},
    },
  ],
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
// HELPER FUNCTIONS
// ================================================================================================

function setupFetchMock(responses: { url: string; status: number; body?: unknown }[]) {
  global.fetch = vi.fn((input: string | URL | Request) => {
    const url = input.toString();
    const matchingResponse = responses.find((r) => url.includes(r.url));

    if (matchingResponse) {
      return Promise.resolve({
        ok: matchingResponse.status >= 200 && matchingResponse.status < 300,
        status: matchingResponse.status,
        json: async () => matchingResponse.body || {},
      } as Response);
    }

    // Default response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);
  });
}

// ================================================================================================
// TESTS
// ================================================================================================

describe("useDashboardStore - addColumn", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useDashboardStore.getState();
    store.resetStore();
    vi.clearAllMocks();

    // Setup default fetch mock for all tests
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==============================================================================================
  // VALIDATION TESTS
  // ==============================================================================================

  describe("validation", () => {
    it("should throw error and show toast if no accounts exist", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataEmpty });

      const testDate = new Date("2024-03-01");

      // Act & Assert
      await expect(store.addColumn(testDate)).rejects.toThrow("Dodaj najpierw konta, aby móc tworzyć wpisy wartości");

      // Verify toast.error was called
      expect(toast.error).toHaveBeenCalledWith("Brak kont", {
        description: "Dodaj najpierw konta, aby móc tworzyć wpisy wartości",
      });
    });

    it("should throw error and show toast if date is in the future", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      // Create tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Act & Assert
      await expect(store.addColumn(tomorrow)).rejects.toThrow("Nie można dodać kolumny z datą w przyszłości");

      // Verify toast.error was called
      expect(toast.error).toHaveBeenCalledWith("Nieprawidłowa data", {
        description: "Nie można dodać kolumny z datą w przyszłości",
      });
    });

    it("should show warning toast and return early if column already exists", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const existingDate = new Date("2024-01-01");

      // Act
      await store.addColumn(existingDate);

      // Assert
      expect(toast.warning).toHaveBeenCalledWith("Kolumna już istnieje", {
        description: expect.stringContaining("01.01.2024"),
      });

      // Verify no fetch calls were made
      expect(global.fetch as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    });

    it("should allow adding column with today's date", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Mock successful fetch responses
      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(today);

      // Assert - should not throw error or show error toast
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  // ==============================================================================================
  // CREATING ENTRIES TESTS
  // ==============================================================================================

  describe("creating entries", () => {
    it("should create entries for all active accounts", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify fetch was called 3 times for 3 accounts + 1 time for grid-data refresh
      expect(global.fetch).toHaveBeenCalledTimes(4); // 3 accounts + 1 fetchData

      // Verify each account got a POST request
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const valueEntryCalls = fetchCalls.filter((call) => call[0].toString().includes("/api/value-entries"));
      expect(valueEntryCalls).toHaveLength(3);
    });

    it("should copy value from last entry using findLastEntry", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify POST body contains value from last entry
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const firstValueEntryCall = fetchCalls.find((call) => call[0].toString().includes("/api/value-entries"));

      if (firstValueEntryCall) {
        const requestBody = JSON.parse(firstValueEntryCall[1].body);
        // First account (mBank) last value was 1200
        expect(requestBody.value).toBe(1200);
      }
    });

    it("should set cash_flow and gain_loss to 0 for new entries", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify POST body contains cash_flow and gain_loss = 0
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const valueEntryCalls = fetchCalls.filter((call) => call[0].toString().includes("/api/value-entries"));

      for (const call of valueEntryCalls) {
        const requestBody = JSON.parse(call[1].body);
        expect(requestBody.cash_flow).toBe(0);
        expect(requestBody.gain_loss).toBe(0);
      }
    });

    it("should use value 0 if account has no previous entries", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccountsNoEntries });

      const newDate = new Date("2024-01-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccountsNoEntries },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify POST body contains value = 0
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const firstValueEntryCall = fetchCalls.find((call) => call[0].toString().includes("/api/value-entries"));

      if (firstValueEntryCall) {
        const requestBody = JSON.parse(firstValueEntryCall[1].body);
        expect(requestBody.value).toBe(0);
      }
    });
  });

  // ==============================================================================================
  // ERROR HANDLING TESTS
  // ==============================================================================================

  describe("error handling", () => {
    it("should handle partial errors gracefully", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      // Mock: first 2 accounts succeed, third fails
      let callCount = 0;
      global.fetch = vi.fn((input: string | URL | Request) => {
        const url = input.toString();
        if (url.includes("/api/value-entries")) {
          callCount++;
          if (callCount === 3) {
            // Third account fails
            return Promise.resolve({
              ok: false,
              status: 400,
              json: async () => ({ message: "Failed to create entry" }),
            } as Response);
          }
          // First two succeed
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({}),
          } as Response);
        }
        // Grid data refresh
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGridDataWithAccounts,
        } as Response);
      });

      // Act
      await store.addColumn(newDate);

      // Assert - verify warning toast was called for partial success
      expect(toast.warning).toHaveBeenCalledWith("Częściowo dodano kolumnę", {
        description: expect.stringContaining("2/3"),
      });

      // Verify fetchData was called (for refresh)
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const gridDataCalls = fetchCalls.filter((call) => call[0].toString().includes("/api/grid-data"));
      expect(gridDataCalls.length).toBeGreaterThan(0);

      // Verify addColumnError was set
      const state = useDashboardStore.getState();
      expect(state.addColumnError).toBeTruthy();
    });

    it("should show success toast when all accounts succeed", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify success toast
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Pomyślnie dodano kolumnę"));

      // Verify isAddingColumn is false
      const state = useDashboardStore.getState();
      expect(state.isAddingColumn).toBe(false);
    });

    it("should throw error and show toast when all accounts fail", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      // Mock all requests to fail
      global.fetch = vi.fn((input: string | URL | Request) => {
        const url = input.toString();
        if (url.includes("/api/value-entries")) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ message: "Failed to create entry" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGridDataWithAccounts,
        } as Response);
      });

      // Act & Assert
      await expect(store.addColumn(newDate)).rejects.toThrow("Nie udało się dodać kolumny dla żadnego konta");

      // Verify error toast
      expect(toast.error).toHaveBeenCalledWith("Nie udało się dodać kolumny", {
        description: expect.any(String),
      });
    });

    it("should call fetchData with skipCache after adding column", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert - verify fetchData was called with cache-busting timestamp
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const gridDataCall = fetchCalls.find((call) => call[0].toString().includes("/api/grid-data"));

      expect(gridDataCall).toBeTruthy();
      if (gridDataCall) {
        // Should include _t timestamp parameter for cache busting
        expect(gridDataCall[0].toString()).toContain("_t=");
      }
    });
  });

  // ==============================================================================================
  // LOADING STATE TESTS
  // ==============================================================================================

  describe("loading state", () => {
    it("should set isAddingColumn to true during operation", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      // Mock with delay to capture loading state
      global.fetch = vi.fn((input: string | URL | Request) => {
        // Check state immediately when fetch is called
        const currentState = useDashboardStore.getState();
        expect(currentState.isAddingColumn).toBe(true);

        if (input.toString().includes("/api/grid-data")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockGridDataWithAccounts,
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response);
      });

      // Act
      await store.addColumn(newDate);

      // Loading state was verified inside the mock
    });

    it("should reset isAddingColumn to false after success", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      setupFetchMock([
        { url: "/api/value-entries", status: 200, body: {} },
        { url: "/api/grid-data", status: 200, body: mockGridDataWithAccounts },
      ]);

      // Act
      await store.addColumn(newDate);

      // Assert
      const state = useDashboardStore.getState();
      expect(state.isAddingColumn).toBe(false);
    });

    it("should reset isAddingColumn to false after error", async () => {
      // Arrange
      const store = useDashboardStore.getState();
      useDashboardStore.setState({ gridData: mockGridDataWithAccounts });

      const newDate = new Date("2024-03-01");

      // Mock all to fail
      global.fetch = vi.fn((input: string | URL | Request) => {
        const url = input.toString();
        if (url.includes("/api/value-entries")) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: async () => ({ message: "Error" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockGridDataWithAccounts,
        } as Response);
      });

      // Act
      try {
        await store.addColumn(newDate);
      } catch {
        // Expected error
      }

      // Assert
      const state = useDashboardStore.getState();
      expect(state.isAddingColumn).toBe(false);
    });
  });
});
