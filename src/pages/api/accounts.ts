import type { APIRoute } from 'astro';
import { z } from 'zod';
import { AccountService } from '@/lib/services/account.service';

// Ensure dynamic rendering for this API endpoint
export const prerender = false;

/**
 * Zod schema for validating the 'archived' query parameter.
 * Accepts string values "true" or "false" and transforms them to boolean.
 */
const archivedQuerySchema = z
  .string()
  .optional()
  .default('false')
  .transform((val) => val === 'true')
  .pipe(z.boolean());

/**
 * GET /api/accounts
 *
 * Retrieves all accounts for the authenticated user.
 * In development mode, uses DEFAULT_USER_ID for mocked data.
 *
 * @query archived - Optional boolean parameter (default: false)
 *                   If true, includes archived accounts in the response
 *
 * @returns 200 - Array of AccountDto objects
 * @returns 400 - Invalid query parameter
 * @returns 500 - Internal server error
 */
export const GET: APIRoute = async ({ locals, url }) => {
  // Note: Authentication check skipped in development mode
  // RLS policies will filter data by DEFAULT_USER_ID

  // Validate and parse the 'archived' query parameter
  const archivedParam = url.searchParams.get('archived');
  const parseResult = archivedQuerySchema.safeParse(archivedParam);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        details: parseResult.error.format()
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const includeArchived = parseResult.data;

  // Fetch accounts from service
  const { data, error } = await AccountService.getAccounts(
    locals.supabase,
    includeArchived
  );

  if (error) {
    console.error('Error fetching accounts:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'Failed to retrieve accounts'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return new Response(
    JSON.stringify(data),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};
