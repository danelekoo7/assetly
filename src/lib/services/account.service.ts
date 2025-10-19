import type { Session, SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/db/database.types';
import type { AccountDto, CreateAccountCommand } from '@/types';
import { ConflictError } from '@/lib/errors';

const PG_UNIQUE_VIOLATION_ERROR_CODE = '23505';

/**
 * Service for managing account operations.
 */
export class AccountService {
	/**
	 * Retrieves all accounts for the authenticated user.
	 *
	 * @param supabase - Supabase client with user session
	 * @param includeArchived - If true, includes archived accounts in the result
	 * @returns Array of accounts or error
	 */
	static async getAccounts(
		supabase: SupabaseClient<Database>,
		includeArchived: boolean,
	): Promise<{ data: AccountDto[] | null; error: Error | null }> {
		try {
			// Build query - RLS policies will automatically filter by user_id
			let query = supabase
				.from('accounts')
				.select('id, name, type, currency, archived_at, created_at');

			// Filter out archived accounts if not requested
			if (!includeArchived) {
				query = query.is('archived_at', null);
			}

			const { data, error } = await query;

			if (error) {
				return {
					data: null,
					error: new Error(`Failed to fetch accounts: ${error.message}`),
				};
			}

			return { data: data as AccountDto[], error: null };
		} catch (err) {
			return {
				data: null,
				error: err instanceof Error ? err : new Error('Unknown error occurred'),
			};
		}
	}

	/**
	 * Creates a new account and its initial value entry.
	 * This operation is "pseudo-atomic" with manual rollback on failure.
	 *
	 * @param supabase - The Supabase client instance, scoped to the user's request.
	 * @param userId - The authenticated user's id.
	 * @param command - The command object containing data for the new account.
	 * @returns The newly created account data.
	 * @throws {ConflictError} If an account with the same name already exists for the user.
	 * @throws {Error} If any other database operation fails.
	 */
	static async createAccountWithInitialValue(
		supabase: SupabaseClient<Database>,
		userId: string,
		command: CreateAccountCommand,
	) {
		// Step 1: Insert the new account into the 'accounts' table.
		// The 'currency' field is hardcoded to 'PLN' as it's not in the command
		// but present in the example response. This might require future adjustments.
		const { data: newAccount, error: accountError } = await supabase
			.from('accounts')
			.insert({
				name: command.name,
				type: command.type,
				user_id: userId,
				currency: 'PLN', // Default currency
			})
			.select()
			.single();

		if (accountError) {
			// Check for unique constraint violation (Postgres error code '23505')
			// which indicates a duplicate name for the same user.
			if (accountError.code === PG_UNIQUE_VIOLATION_ERROR_CODE) {
				throw new ConflictError('An account with this name already exists.');
			}
			// For any other database error, re-throw it to be handled by the API layer.
			throw accountError;
		}

		// Step 2: Insert the initial value entry for the newly created account.
		const { error: valueEntryError } = await supabase.from('value_entries').insert({
			account_id: newAccount.id,
			date: command.date,
			value: command.initial_value,
			cash_flow: command.initial_value, // For the first entry, cash_flow equals the initial value.
		});

		if (valueEntryError) {
			// Step 3: Manual Rollback. If the value entry insertion fails,
			// delete the account that was just created to maintain data consistency.
			await supabase.from('accounts').delete().eq('id', newAccount.id);

			// Re-throw the original error from the value entry insertion to the caller.
			throw valueEntryError;
		}

		// Step 4: Success. Both inserts were successful.
		// Return the data of the newly created account.
		return newAccount;
	}
}