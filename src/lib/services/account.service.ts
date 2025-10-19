import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import type { AccountDto } from '@/types';

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
    includeArchived: boolean
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
          error: new Error(`Failed to fetch accounts: ${error.message}`)
        };
      }

      return { data: data as AccountDto[], error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Unknown error occurred')
      };
    }
  }
}
