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
  resetStore: () => void;
}

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
      const { showArchived } = get();

      // Fetch accounts from the real API
      const accountsResponse = await fetch(`/api/accounts?archived=${showArchived}`);

      // If request fails, show empty data instead of error
      let accounts: AccountDto[] = [];

      if (accountsResponse.ok) {
        accounts = await accountsResponse.json();
      } else {
        // Log error to console but don't show error to user
        // eslint-disable-next-line no-console
        console.error("Failed to fetch accounts:", accountsResponse.status, accountsResponse.statusText);
      }

      // Transform accounts into GridDataDto format
      // For now, we show accounts without historical data (empty entries)
      const gridData: GridDataDto = {
        dates: [], // No historical dates yet
        accounts: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          entries: {}, // No historical entries yet
        })),
        summary: {}, // No summary data yet
      };

      // Set default summary data
      const summaryData: DashboardSummaryDto = {
        net_worth: 0,
        total_assets: 0,
        total_liabilities: 0,
        cumulative_cash_flow: 0,
        cumulative_gain_loss: 0,
      };

      set({ gridData, summaryData, isLoading: false });
    } catch (error) {
      // Even if there's an exception, show empty data instead of error
      // eslint-disable-next-line no-console
      console.error("Error in fetchData:", error);

      // Set empty data
      const emptyGridData: GridDataDto = {
        dates: [],
        accounts: [],
        summary: {},
      };

      const emptySummaryData: DashboardSummaryDto = {
        net_worth: 0,
        total_assets: 0,
        total_liabilities: 0,
        cumulative_cash_flow: 0,
        cumulative_gain_loss: 0,
      };

      set({ gridData: emptyGridData, summaryData: emptySummaryData, isLoading: false, error: null });
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

      // Note: Summary data refresh removed until /api/dashboard/summary endpoint is implemented
      // For now, we'll refresh all data to get the latest state
      await get().fetchData();

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

  resetStore: () => {
    set({
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
    });
  },
}));
