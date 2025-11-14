import { create } from "zustand";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import type {
  GridDataDto,
  DashboardSummaryDto,
  CreateAccountCommand,
  UpsertValueEntryCommand,
  UpdateAccountCommand,
  AccountDto,
} from "@/types";
import { findLastEntry } from "@/lib/utils/grid-helpers";

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
  isAddingColumn: boolean;
  addColumnError: Error | null;

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
  fetchData: (skipCache?: boolean) => Promise<void>;
  setDateRange: (range: { from: Date; to: Date }) => void;
  setShowArchived: (show: boolean) => void;
  addAccount: (command: CreateAccountCommand) => Promise<void>;
  updateAccount: (id: string, command: UpdateAccountCommand) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateValueEntry: (command: UpsertValueEntryCommand) => Promise<void>;
  addColumn: (date: Date) => Promise<void>;
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
  isAddingColumn: false,
  addColumnError: null,
  activeModals: {
    addAccount: false,
    editAccount: null,
    editValue: null,
    confirmAction: null,
  },

  // Actions
  fetchData: async (skipCache = false) => {
    set({ isLoading: true, error: null });

    try {
      const { showArchived } = get();

      // Add cache-busting timestamp when skipCache is true
      const url = skipCache
        ? `/api/grid-data?archived=${showArchived}&_t=${Date.now()}`
        : `/api/grid-data?archived=${showArchived}`;

      // Fetch grid data from the API (includes accounts, dates, entries)
      const gridDataResponse = await fetch(url);

      if (!gridDataResponse.ok) {
        // Log error to console but don't show error to user
        // eslint-disable-next-line no-console
        console.error("Failed to fetch grid data:", gridDataResponse.status, gridDataResponse.statusText);

        // Set empty data
        const emptyGridData: GridDataDto = {
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

        const emptySummaryData: DashboardSummaryDto = {
          net_worth: 0,
          total_assets: 0,
          total_liabilities: 0,
          cumulative_cash_flow: 0,
          cumulative_gain_loss: 0,
        };

        set({ gridData: emptyGridData, summaryData: emptySummaryData, isLoading: false, error: null });
        return;
      }

      const gridData: GridDataDto = await gridDataResponse.json();

      // KPIs are now calculated in the API response
      const summaryData: DashboardSummaryDto = gridData.summary.kpi;

      set({ gridData, summaryData, isLoading: false });
    } catch (error) {
      // Even if there's an exception, show empty data instead of error
      // eslint-disable-next-line no-console
      console.error("Error in fetchData:", error);

      // Set empty data
      const emptyGridData: GridDataDto = {
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
    await get().fetchData(true);
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
    await get().fetchData(true);
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
    await get().fetchData(true);
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
      await get().fetchData(true);

      get().closeModal("editValue");
    } catch (error) {
      // Ensure rollback happened
      set({ gridData: previousGridData });
      throw error;
    }
  },

  addColumn: async (date: Date) => {
    const { gridData } = get();

    // [1] Validation
    if (!gridData || gridData.accounts.length === 0) {
      toast.error("Brak kont", {
        description: "Dodaj najpierw konta, aby móc tworzyć wpisy wartości",
      });
      throw new Error("Dodaj najpierw konta, aby móc tworzyć wpisy wartości");
    }

    const dateStr = format(date, "yyyy-MM-dd");

    // Check if column already exists
    if (gridData.dates.includes(dateStr)) {
      toast.warning("Kolumna już istnieje", {
        description: `Kolumna z datą ${format(date, "dd.MM.yyyy", { locale: pl })} już istnieje w siatce`,
      });
      return; // Don't throw error, just return early
    }

    // Check if date is not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) {
      toast.error("Nieprawidłowa data", {
        description: "Nie można dodać kolumny z datą w przyszłości",
      });
      throw new Error("Nie można dodać kolumny z datą w przyszłości");
    }

    // [2] Set loading state
    set({ isAddingColumn: true, addColumnError: null });

    try {
      // [3] Prepare data
      const commands: UpsertValueEntryCommand[] = [];
      const errors: { accountName: string; error: string }[] = [];

      for (const account of gridData.accounts) {
        // Find last entry for this account
        const lastEntry = findLastEntry(account.entries, gridData.dates);

        // Determine initial value
        let value = 0;
        const cash_flow = 0;
        const gain_loss = 0;

        if (lastEntry) {
          value = lastEntry.entry.value;
        }

        commands.push({
          account_id: account.id,
          date: dateStr,
          value,
          cash_flow,
          gain_loss,
        });
      }

      // [4] Sequential POST requests
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const account = gridData.accounts[i];

        try {
          const response = await fetch("/api/value-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
          });

          if (!response.ok) {
            const error = await response.json();
            errors.push({
              accountName: account.name,
              error: error.message || "Nieznany błąd",
            });
          }
        } catch (err) {
          errors.push({
            accountName: account.name,
            error: err instanceof Error ? err.message : "Błąd sieciowy",
          });
        }
      }

      // [5] Handle results
      await get().fetchData(true); // Refresh data regardless of partial errors, skip cache

      if (errors.length === 0) {
        // Full success
        toast.success(`Pomyślnie dodano kolumnę ${format(date, "dd.MM.yyyy", { locale: pl })}`);
        set({ isAddingColumn: false });
      } else if (errors.length < commands.length) {
        // Partial success
        const errorMsg = `Częściowy błąd: ${errors.length}/${commands.length} kont nie zostało zaktualizowanych`;
        toast.warning("Częściowo dodano kolumnę", {
          description: `${commands.length - errors.length}/${commands.length} kont zaktualizowano pomyślnie`,
        });
        set({
          isAddingColumn: false,
          addColumnError: new Error(errorMsg),
        });
      } else {
        // Complete failure
        throw new Error("Nie udało się dodać kolumny dla żadnego konta");
      }
    } catch (error) {
      // [6] Global error handler
      const errorMsg = error instanceof Error ? error.message : "Wystąpił błąd podczas dodawania kolumny";
      toast.error("Nie udało się dodać kolumny", {
        description: errorMsg,
      });
      set({
        isAddingColumn: false,
        addColumnError: error instanceof Error ? error : new Error(errorMsg),
      });
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
      isAddingColumn: false,
      addColumnError: null,
      activeModals: {
        addAccount: false,
        editAccount: null,
        editValue: null,
        confirmAction: null,
      },
    });
  },
}));
