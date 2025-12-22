import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/db/database.types";
import type { AccountType, UpsertValueEntryCommand, ValueEntryDto } from "@/types";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Service for managing value entry operations.
 */
const ValueEntryService = {
  /**
   * Creates a new value entry or updates an existing one for a specific account and date.
   * Implements automatic calculation of cash_flow and gain_loss based on account type
   * and provided values.
   *
   * @param supabase - Supabase client with user session
   * @param userId - The authenticated user's ID
   * @param command - The command object containing value entry data
   * @returns The created or updated value entry
   * @throws {NotFoundError} If the account doesn't exist or doesn't belong to the user
   * @throws {ValidationError} If data consistency validation fails
   */
  async upsertValueEntry(
    supabase: SupabaseClient<Database>,
    userId: string,
    command: UpsertValueEntryCommand
  ): Promise<ValueEntryDto> {
    // Step 1: Verify account exists and belongs to the user
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, type, user_id")
      .eq("id", command.account_id)
      .single();

    if (accountError || !account || account.user_id !== userId) {
      throw new NotFoundError("Account not found or access denied");
    }

    // Step 2: Fetch the previous value entry for this account
    const { data: previousEntry } = await supabase
      .from("value_entries")
      .select("value")
      .eq("account_id", command.account_id)
      .lt("date", command.date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousValue = previousEntry?.value ?? 0;

    // Step 3: Calculate cash_flow and gain_loss based on the three scenarios
    const { cash_flow, gain_loss } = this.calculateCashFlowAndGainLoss(
      command.value,
      previousValue,
      account.type,
      command.cash_flow,
      command.gain_loss
    );

    // Step 4: Execute upsert operation
    const { data: upsertedEntry, error: upsertError } = await supabase
      .from("value_entries")
      .upsert(
        {
          account_id: command.account_id,
          date: command.date,
          value: command.value,
          cash_flow,
          gain_loss,
        },
        { onConflict: "account_id,date" }
      )
      .select()
      .single();

    if (upsertError) {
      throw upsertError;
    }

    // Step 5: Return ValueEntryDto
    return {
      id: upsertedEntry.id,
      account_id: upsertedEntry.account_id,
      date: upsertedEntry.date,
      value: upsertedEntry.value,
      cash_flow: upsertedEntry.cash_flow,
      gain_loss: upsertedEntry.gain_loss,
    };
  },

  /**
   * Calculates cash_flow and gain_loss based on four scenarios:
   * - Scenario 1: Only value provided → calculate based on account type
   * - Scenario 2a: Value + cash_flow provided → calculate gain_loss
   * - Scenario 2b: Value + gain_loss provided → calculate cash_flow
   * - Scenario 3: All three provided → validate consistency
   *
   * @param value - The new total value
   * @param previousValue - The previous value (0 if no previous entry)
   * @param accountType - The type of the account
   * @param cashFlowInput - Optional cash_flow from user
   * @param gainLossInput - Optional gain_loss from user
   * @returns Calculated cash_flow and gain_loss
   * @throws {ValidationError} If data consistency validation fails in scenario 3
   */
  calculateCashFlowAndGainLoss(
    value: number,
    previousValue: number,
    accountType: AccountType,
    cashFlowInput?: number | null,
    gainLossInput?: number | null
  ): { cash_flow: number; gain_loss: number } {
    const hasCashFlow = cashFlowInput !== null && cashFlowInput !== undefined;
    const hasGainLoss = gainLossInput !== null && gainLossInput !== undefined;
    const isLiability = accountType === "liability";
    const cfMultiplier = isLiability ? -1 : 1;

    // Scenario 3: All three values provided → validate consistency
    if (hasCashFlow && hasGainLoss) {
      const expectedValue = previousValue + cashFlowInput * cfMultiplier + gainLossInput;
      const tolerance = 0.0001; // Small tolerance for floating point comparison

      if (Math.abs(expectedValue - value) > tolerance) {
        throw new ValidationError(
          "Dane niespójne: poprzednia wartość + wpłata + zysk/strata nie równa się nowej wartości."
        );
      }

      return {
        cash_flow: cashFlowInput,
        gain_loss: gainLossInput,
      };
    }

    // Scenario 2a: Value + cash_flow provided → calculate gain_loss
    if (hasCashFlow) {
      return {
        cash_flow: cashFlowInput,
        gain_loss: value - previousValue - cashFlowInput * cfMultiplier,
      };
    }

    // Scenario 2b: Value + gain_loss provided → calculate cash_flow
    if (hasGainLoss) {
      return {
        cash_flow: (value - previousValue - gainLossInput) * cfMultiplier,
        gain_loss: gainLossInput,
      };
    }

    // Scenario 1: Only value provided → calculate based on account type
    if (accountType === "cash_asset" || accountType === "liability") {
      return {
        cash_flow: (value - previousValue) * cfMultiplier,
        gain_loss: 0,
      };
    }

    // accountType === 'investment_asset'
    return {
      cash_flow: 0,
      gain_loss: value - previousValue,
    };
  },

  /**
   * Delete all value entries for a specific date across all user's accounts.
   * This operation is irreversible and removes all entries for the given date.
   *
   * @param supabase - Supabase client with user session
   * @param userId - The authenticated user's ID
   * @param date - Date in YYYY-MM-DD format
   * @returns Number of deleted entries
   * @throws Error if deletion fails
   */
  async deleteEntriesByDate(supabase: SupabaseClient<Database>, userId: string, date: string): Promise<number> {
    // Step 1: Get all account IDs for the user
    const { data: accounts, error: accountsError } = await supabase.from("accounts").select("id").eq("user_id", userId);

    if (accountsError) {
      throw accountsError;
    }

    // If user has no accounts, return 0
    if (!accounts || accounts.length === 0) {
      return 0;
    }

    const accountIds = accounts.map((acc) => acc.id);

    // Step 2: Delete all value_entries for these accounts and the given date
    // RLS policies will automatically ensure we only delete entries for user's accounts
    const { data, error: deleteError } = await supabase
      .from("value_entries")
      .delete()
      .in("account_id", accountIds)
      .eq("date", date)
      .select();

    if (deleteError) {
      throw deleteError;
    }

    // Step 3: Return count of deleted entries
    return data?.length ?? 0;
  },
};

export default ValueEntryService;
