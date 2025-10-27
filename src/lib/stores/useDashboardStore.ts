import { create } from "zustand";
import type {
  GridDataDto,
  DashboardSummaryDto,
  CreateAccountCommand,
  UpsertValueEntryCommand,
  UpdateAccountCommand,
  AccountDto,
} from "@/types";

interface DashboardState {
  // Data
  gridData: GridDataDto | null;
  summaryData: DashboardSummaryDto | null;

  // Filters
  dateRange: { from: Date; to: Date };
  showArchived: boolean;

  // UI State
  isLoading: boolean;
  error: Error | null;

  // Modal States
  activeModals: {
    addAccount: boolean;
    editAccount: { account: AccountDto } | null;
    editValue: {
      accountId: string;
      date: string;
      accountType: string;
      previousValue: number;
    } | null;
    confirmAction: {
      title: string;
      description: string;
      onConfirm: () => void;
    } | null;
  };

  // Actions
  fetchData: () => Promise<void>;
  setDateRange: (range: { from: Date; to: Date }) => void;
  setShowArchived: (show: boolean) => void;
  addAccount: (command: CreateAccountCommand) => Promise<void>;
  updateAccount: (id: string, command: UpdateAccountCommand) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateValueEntry: (command: UpsertValueEntryCommand) => Promise<void>;
  openModal: (modalName: keyof DashboardState["activeModals"], context?: unknown) => void;
  closeModal: (modalName: keyof DashboardState["activeModals"]) => void;
}

// Helper function to format date to YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// Calculate default date range (last 12 months)
const getDefaultDateRange = (): { from: Date; to: Date } => {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from, to };
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial State
  gridData: null,
  summaryData: null,
  dateRange: getDefaultDateRange(),
  showArchived: false,
  isLoading: false,
  error: null,
  activeModals: {
    addAccount: false,
    editAccount: null,
    editValue: null,
    confirmAction: null,
  },

  // Actions
  fetchData: async () => {
    set({ isLoading: true, error: null });

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { dateRange, showArchived } = get();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const fromDate = formatDate(dateRange.from);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const toDate = formatDate(dateRange.to);

      // TODO: Replace with real API calls when endpoints are available
      // Mock data for demonstration purposes
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

      const mockGridData: GridDataDto = {
        dates: ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01", "2024-06-01"],
        accounts: [
          {
            id: "1",
            name: "Konto oszczędnościowe",
            type: "investment_asset",
            entries: {
              "2024-01-01": { value: 10000, cash_flow: 1000, gain_loss: 0 },
              "2024-02-01": { value: 10500, cash_flow: 500, gain_loss: 0 },
              "2024-03-01": { value: 11200, cash_flow: 500, gain_loss: 200 },
              "2024-04-01": { value: 12000, cash_flow: 500, gain_loss: 300 },
              "2024-05-01": { value: 12800, cash_flow: 500, gain_loss: 300 },
              "2024-06-01": { value: 13500, cash_flow: 500, gain_loss: 200 },
            },
          },
          {
            id: "2",
            name: "Portfel inwestycyjny",
            type: "investment_asset",
            entries: {
              "2024-01-01": { value: 50000, cash_flow: 5000, gain_loss: 0 },
              "2024-02-01": { value: 52000, cash_flow: 0, gain_loss: 2000 },
              "2024-03-01": { value: 54500, cash_flow: 0, gain_loss: 2500 },
              "2024-04-01": { value: 53000, cash_flow: 0, gain_loss: -1500 },
              "2024-05-01": { value: 56000, cash_flow: 0, gain_loss: 3000 },
              "2024-06-01": { value: 58500, cash_flow: 0, gain_loss: 2500 },
            },
          },
          {
            id: "3",
            name: "Kredyt hipoteczny",
            type: "liability",
            entries: {
              "2024-01-01": { value: -200000, cash_flow: 0, gain_loss: 0 },
              "2024-02-01": { value: -198500, cash_flow: -1500, gain_loss: 0 },
              "2024-03-01": { value: -197000, cash_flow: -1500, gain_loss: 0 },
              "2024-04-01": { value: -195500, cash_flow: -1500, gain_loss: 0 },
              "2024-05-01": { value: -194000, cash_flow: -1500, gain_loss: 0 },
              "2024-06-01": { value: -192500, cash_flow: -1500, gain_loss: 0 },
            },
          },
        ],
        summary: {
          "2024-01-01": { net_worth: -140000 },
          "2024-02-01": { net_worth: -136000 },
          "2024-03-01": { net_worth: -131300 },
          "2024-04-01": { net_worth: -130500 },
          "2024-05-01": { net_worth: -125200 },
          "2024-06-01": { net_worth: -120500 },
        },
      };

      const mockSummaryData: DashboardSummaryDto = {
        net_worth: -120500,
        total_assets: 72000,
        total_liabilities: -192500,
        cumulative_cash_flow: 7000,
        cumulative_gain_loss: 8700,
      };

      set({ gridData: mockGridData, summaryData: mockSummaryData, isLoading: false });

      // Original API calls (commented out for now)
      /*
      const [gridResponse, summaryResponse] = await Promise.all([
        fetch(`/api/grid-data?from=${fromDate}&to=${toDate}&showArchived=${showArchived}`),
        fetch(`/api/dashboard/summary?date=${toDate}&showArchived=${showArchived}`),
      ]);

      if (!gridResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const gridData: GridDataDto = await gridResponse.json();
      const summaryData: DashboardSummaryDto = await summaryResponse.json();

      set({ gridData, summaryData, isLoading: false });
      */
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error("Unknown error"),
        isLoading: false,
      });
    }
  },

  setDateRange: (range) => {
    set({ dateRange: range });
    get().fetchData();
  },

  setShowArchived: (show) => {
    set({ showArchived: show });
    get().fetchData();
  },

  addAccount: async (command) => {
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create account");
    }

    // Refresh data after successful creation
    await get().fetchData();
    get().closeModal("addAccount");
  },

  updateAccount: async (id, command) => {
    const response = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update account");
    }

    // Refresh data after successful update
    await get().fetchData();
    get().closeModal("editAccount");
  },

  deleteAccount: async (id) => {
    const response = await fetch(`/api/accounts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete account");
    }

    // Refresh data after successful deletion
    await get().fetchData();
    get().closeModal("confirmAction");
  },

  updateValueEntry: async (command) => {
    const previousGridData = get().gridData;

    try {
      // Optimistic update
      const { gridData } = get();
      if (gridData) {
        const updatedGridData = { ...gridData };
        const accountIndex = updatedGridData.accounts.findIndex((acc) => acc.id === command.account_id);

        if (accountIndex !== -1) {
          const account = updatedGridData.accounts[accountIndex];
          updatedGridData.accounts[accountIndex] = {
            ...account,
            entries: {
              ...account.entries,
              [command.date]: {
                value: command.value,
                cash_flow: command.cash_flow ?? 0,
                gain_loss: command.gain_loss ?? 0,
              },
            },
          };
          set({ gridData: updatedGridData });
        }
      }

      const response = await fetch("/api/value-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        // Rollback on error
        set({ gridData: previousGridData });
        const error = await response.json();
        throw new Error(error.message || "Failed to update value entry");
      }

      // Refresh summary data
      const { dateRange, showArchived } = get();
      const toDate = formatDate(dateRange.to);
      const summaryResponse = await fetch(`/api/dashboard/summary?date=${toDate}&showArchived=${showArchived}`);

      if (summaryResponse.ok) {
        const summaryData: DashboardSummaryDto = await summaryResponse.json();
        set({ summaryData });
      }

      get().closeModal("editValue");
    } catch (error) {
      // Ensure rollback happened
      set({ gridData: previousGridData });
      throw error;
    }
  },

  openModal: (modalName, context) => {
    set((state) => ({
      activeModals: {
        ...state.activeModals,
        [modalName]: context ?? true,
      },
    }));
  },

  closeModal: (modalName) => {
    set((state) => ({
      activeModals: {
        ...state.activeModals,
        [modalName]: modalName === "addAccount" ? false : null,
      },
    }));
  },
}));
