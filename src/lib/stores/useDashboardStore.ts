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
  fetchData: () => Promise<void>;
  setDateRange: (range: { from: Date; to: Date }) => void;
  setShowArchived: (show: boolean) => void;
  addAccount: (command: CreateAccountCommand) => Promise<void>;
  updateAccount: (id: string, data: Partial<UpdateAccountCommand>) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  restoreAccount: (id: string) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  updateValueEntry: (command: UpsertValueEntryCommand) => Promise<void>;
  addColumn: (date: Date) => Promise<void>;
  deleteColumn: (date: string) => Promise<void>;
  updateGridDataOptimistic: (newGridData: GridDataDto) => void;
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
  fetchData: async () => {
    set({ isLoading: true, error: null });

    try {
      const { showArchived } = get();

      const url = `/api/grid-data?archived=${showArchived}`;

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
    await get().fetchData();
    get().closeModal("addAccount");
  },

  updateAccount: async (id: string, data: Partial<UpdateAccountCommand>) => {
    const response = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        toast.error("Nazwa konta jest już w użyciu", {
          description: "Proszę wybrać inną nazwę.",
        });
      } else {
        toast.error("Błąd aktualizacji konta", {
          description: errorData.message || "Nie udało się zaktualizować danych konta.",
        });
      }
      throw new Error(errorData.message || "Failed to update account");
    }

    toast.success("Konto zostało pomyślnie zaktualizowane.");
    await get().fetchData();
    get().closeModal("editAccount");
  },

  archiveAccount: async (id: string) => {
    const command: UpdateAccountCommand = { archived_at: new Date().toISOString() };
    const response = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error("Błąd archiwizacji konta", { description: error.message });
      throw new Error(error.message || "Failed to archive account");
    }

    toast.success("Konto zostało zarchiwizowane.");
    await get().fetchData();
    get().closeModal("confirmAction");
  },

  restoreAccount: async (id: string) => {
    const command: UpdateAccountCommand = { archived_at: null };
    const response = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const error = await response.json();
      toast.error("Błąd przywracania konta", { description: error.message });
      throw new Error(error.message || "Failed to restore account");
    }

    toast.success("Konto zostało przywrócone.");
    await get().fetchData();
    get().closeModal("confirmAction");
  },

  deleteAccount: async (id) => {
    const response = await fetch(`/api/accounts/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Nie udało się usunąć konta." }));
      toast.error("Błąd usuwania konta", {
        description: error.message,
      });
      throw new Error(error.message);
    }

    toast.success("Konto zostało pomyślnie usunięte.");
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

  deleteColumn: async (date: string) => {
    const { gridData } = get();
    const previousGridData = gridData;

    try {
      // [1] Optimistic update - remove column from UI
      if (gridData) {
        const updatedGridData = { ...gridData };
        updatedGridData.dates = updatedGridData.dates.filter((d) => d !== date);

        // Remove entries for this date from all accounts
        updatedGridData.accounts = updatedGridData.accounts.map((account) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [date]: removed, ...remainingEntries } = account.entries;
          return { ...account, entries: remainingEntries };
        });

        set({ gridData: updatedGridData });
      }

      // [2] Call API
      const response = await fetch(`/api/value-entries?date=${date}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Rollback
        set({ gridData: previousGridData });
        const error = await response.json();
        toast.error("Nie udało się usunąć kolumny", {
          description: error.message,
        });
        throw new Error(error.message || "Failed to delete column");
      }

      // [3] Success
      const result = await response.json();
      toast.success(`Usunięto kolumnę ${format(new Date(date), "dd.MM.yyyy", { locale: pl })}`, {
        description: `Usunięto ${result.deleted_count} wpisów`,
      });

      // [4] Refresh data
      await get().fetchData();
      get().closeModal("confirmAction");
    } catch (error) {
      // Ensure rollback
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
        const cash_flow = null;
        const gain_loss = null;

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
      await get().fetchData(); // Refresh data regardless of partial errors

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

  updateGridDataOptimistic: (newGridData) => {
    set({ gridData: newGridData });
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
