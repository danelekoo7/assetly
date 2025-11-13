import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GridDataDto, GridAccountDto, GridEntryDto, GridSummaryDto } from "@/types";

/**
 * Options for fetching grid data.
 */
export interface GetGridDataOptions {
  /** Optional start date for data range (ISO 8601 or YYYY-MM-DD) */
  from?: string;
  /** Optional end date for data range (ISO 8601 or YYYY-MM-DD) */
  to?: string;
  /** Whether to include archived accounts (default: false) */
  showArchived?: boolean;
}

/**
 * Service for managing grid data operations.
 * Aggregates accounts and value entries into a format optimized for the data grid component.
 */
const GridDataService = {
  /**
   * Fetches all data needed to render the main data grid.
   *
   * @param supabase - Supabase client instance
   * @param userId - User ID (note: RLS filters by user_id automatically)
   * @param options - Query options (date range, archived filter)
   * @returns GridDataDto containing dates, accounts with entries, and summary
   *
   * @throws {Error} If database queries fail
   */
  async getGridData(
    supabase: SupabaseClient<Database>,
    userId: string,
    options: GetGridDataOptions = {}
  ): Promise<GridDataDto> {
    // Step 1: Fetch user's accounts
    let accountsQuery = supabase.from("accounts").select("id, name, type");

    // Filter archived accounts if showArchived is false
    if (!options.showArchived) {
      accountsQuery = accountsQuery.is("archived_at", null);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    // Early return if no accounts found
    if (!accounts || accounts.length === 0) {
      return {
        dates: [],
        accounts: [],
        summary: {},
      };
    }

    // Step 2: Fetch value_entries for the accounts
    const accountIds = accounts.map((acc) => acc.id);

    let entriesQuery = supabase
      .from("value_entries")
      .select("account_id, date, value, cash_flow, gain_loss")
      .in("account_id", accountIds)
      .order("date", { ascending: true });

    // Apply date range filters if provided
    if (options.from) {
      entriesQuery = entriesQuery.gte("date", options.from);
    }

    if (options.to) {
      entriesQuery = entriesQuery.lte("date", options.to);
    }

    const { data: valueEntries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      throw new Error(`Failed to fetch value entries: ${entriesError.message}`);
    }

    // Step 3: Extract unique dates and sort them
    const dateSet = new Set<string>();
    valueEntries?.forEach((entry) => {
      const dateStr = new Date(entry.date).toISOString().split("T")[0]; // YYYY-MM-DD
      dateSet.add(dateStr);
    });

    const dates = Array.from(dateSet).sort();

    // Step 4: Group entries by account_id and date
    const entriesByAccountAndDate: Record<string, Record<string, GridEntryDto>> = {};

    valueEntries?.forEach((entry) => {
      const dateStr = new Date(entry.date).toISOString().split("T")[0];

      if (!entriesByAccountAndDate[entry.account_id]) {
        entriesByAccountAndDate[entry.account_id] = {};
      }

      entriesByAccountAndDate[entry.account_id][dateStr] = {
        value: entry.value,
        cash_flow: entry.cash_flow,
        gain_loss: entry.gain_loss,
      };
    });

    // Step 5: Format accounts to GridAccountDto with forward-fill logic
    const gridAccounts: GridAccountDto[] = accounts.map((account) => {
      const accountEntries = entriesByAccountAndDate[account.id] || {};
      const filledEntries: Record<string, GridEntryDto> = {};

      // Forward-fill logic: for each date, use the entry if it exists,
      // otherwise use the most recent previous entry
      let lastKnownEntry: GridEntryDto | null = null;

      dates.forEach((date) => {
        if (accountEntries[date]) {
          // Entry exists for this date
          lastKnownEntry = accountEntries[date];
          filledEntries[date] = accountEntries[date];
        } else if (lastKnownEntry) {
          // No entry for this date, but we have a previous entry - forward-fill
          filledEntries[date] = { ...lastKnownEntry };
        }
        // If no entry and no previous entry, don't add anything (null will be shown)
      });

      return {
        id: account.id,
        name: account.name,
        type: account.type,
        entries: filledEntries,
      };
    });

    // Step 6: Calculate summary (net_worth) for each date
    const summary: Record<string, GridSummaryDto> = {};

    dates.forEach((date) => {
      let netWorth = 0;

      gridAccounts.forEach((account) => {
        const entry = account.entries[date];
        if (entry) {
          if (account.type === "liability") {
            // Subtract liabilities from net worth
            netWorth -= entry.value;
          } else {
            // Add assets (cash_asset, investment_asset) to net worth
            netWorth += entry.value;
          }
        }
      });

      summary[date] = { net_worth: netWorth };
    });

    // Step 7: Return GridDataDto
    return {
      dates,
      accounts: gridAccounts,
      summary,
    };
  },
};

export default GridDataService;
