/**
 * This file contains shared DTO (Data Transfer Object) and Command Model types
 * for the Assetly application, used for both frontend and backend communication.
 *
 * These types are derived from the database entity types located in `@/db/database.types.ts`
 * to ensure consistency and type safety across the stack.
 */
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/db/database.types";

// ================================================================================================
// BASE ENTITY TYPES
// These are direct aliases to the database table row types for easier reference.
// ================================================================================================

/**
 * Represents the `accounts` table row in the database.
 */
export type Account = Tables<"accounts">;

/**
 * Represents the `value_entries` table row in the database.
 */
export type ValueEntry = Tables<"value_entries">;

/**
 * Represents the `account_type` enum from the database.
 */
export type AccountType = Enums<"account_type">;

// =================================================_
// DTO (DATA TRANSFER OBJECTS)
// These types define the shape of data sent from the API to the client.
// They are subsets or transformations of the base entity types.
// =================================================_

/**
 * DTO for an `Account`.
 * This is the standard representation of an account sent to the client.
 *
 * @see Account
 * @description Omits `user_id` and `updated_at` from the base `Account` type.
 */
export type AccountDto = Pick<Account, "id" | "name" | "type" | "currency" | "archived_at" | "created_at">;

/**
 * DTO for a `ValueEntry`.
 * This is the standard representation of a value entry sent to the client.
 *
 * @see ValueEntry
 */
export type ValueEntryDto = Pick<ValueEntry, "id" | "account_id" | "date" | "value" | "cash_flow" | "gain_loss">;

/**
 * DTO for the main data grid view (`GET /grid-data`).
 * It contains all accounts, relevant dates, and their corresponding value entries
 * in a format optimized for the frontend grid component.
 */
export interface GridDataDto {
  /** A sorted list of all date strings (YYYY-MM-DD) in the data range. */
  dates: string[];
  /** An array of accounts, each with its value entries mapped by date. */
  accounts: GridAccountDto[];
  /** An object containing net worth summaries for each date and aggregated KPIs. */
  summary: {
    /** Net worth for each date, used for the chart. */
    by_date: Record<string, GridSummaryDto>; // Key is date string (YYYY-MM-DD)
    /** Aggregated key performance indicators for the selected date range. */
    kpi: GridKpiDto;
  };
}

/**
 * Represents a single account within the `GridDataDto`.
 *
 * @see Account
 * @see GridEntryDto
 */
export type GridAccountDto = Pick<Account, "id" | "name" | "type"> & {
  /** A dictionary of value entries, keyed by date string (YYYY-MM-DD). */
  entries: Record<string, GridEntryDto>;
};

/**
 * Represents a single value entry cell within the `GridDataDto`.
 *
 * @see ValueEntry
 */
export type GridEntryDto = Pick<ValueEntry, "value" | "cash_flow" | "gain_loss">;

/**
 * Represents the summary row data for a specific date in the `GridDataDto`.
 */
export interface GridSummaryDto {
  net_worth: number;
}

/**
 * DTO for Key Performance Indicators (KPIs) for the dashboard.
 * These are calculated for the selected date range.
 */
export interface GridKpiDto {
  /** Net worth as of the last date in the range. */
  net_worth: number;
  /** Total assets as of the last date in the range. */
  total_assets: number;
  /** Total liabilities as of the last date in the range. */
  total_liabilities: number;
  /** Sum of all cash flows within the date range. */
  cumulative_cash_flow: number;
  /** Sum of all gains and losses within the date range. */
  cumulative_gain_loss: number;
}

/**
 * DTO for the dashboard summary (`GET /dashboard/summary`).
 * Provides key performance indicators calculated from the most recent value entries.
 */
export interface DashboardSummaryDto {
  net_worth: number;
  total_assets: number;
  total_liabilities: number;
  cumulative_cash_flow: number;
  cumulative_gain_loss: number;
}

// =================================================_
// COMMAND MODELS
// These types define the shape of data sent from the client to the API to perform actions.
// =================================================_

/**
 * Command model for creating a new account (`POST /accounts`).
 * It includes the initial value and date to create the first value entry atomically.
 *
 * @see Account
 * @see ValueEntry
 */
export type CreateAccountCommand = Pick<TablesInsert<"accounts">, "name" | "type"> & {
  /** The initial monetary value of the account. */
  initial_value: number;
  /** The date for the initial value entry (ISO 8601 string). */
  date: string;
};

/**
 * Command model for updating an account (`PATCH /accounts/{id}`).
 * Allows partial updates to the account's name or archival status.
 *
 * @see Account
 * @description Derived from `TablesUpdate<'accounts'>` to ensure properties are optional.
 */
export type UpdateAccountCommand = Pick<TablesUpdate<"accounts">, "name" | "archived_at">;

/**
 * Command model for creating or updating a value entry (`POST /value-entries`).
 *
 * @see ValueEntry
 */
export interface UpsertValueEntryCommand {
  account_id: string;
  /** The date for the value entry (ISO 8601 string). */
  date: string;
  /** The total value of the account on the given date. */
  value: number;
  /**
   * The net amount of cash moved into or out of the account.
   * Can be omitted or null for automatic calculation based on `account.type`.
   */
  cash_flow?: number | null;
  /**
   * The investment gain or loss.
   * Can be omitted or null for automatic calculation.
   */
  gain_loss?: number | null;
}
