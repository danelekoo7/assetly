import type { APIRoute } from 'astro';
import { z } from 'zod';

import { AccountService } from '@/lib/services/account.service';
import { ConflictError } from '@/lib/errors';
import type { AccountDto } from '@/types';

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
				details: parseResult.error.format(),
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	const includeArchived = parseResult.data;

	// Fetch accounts from service
	const { data, error } = await AccountService.getAccounts(locals.supabase, includeArchived);

	if (error) {
		console.error('Error fetching accounts:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal Server Error',
				message: 'Failed to retrieve accounts',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};

const CreateAccountSchema = z.object({
	name: z.string().min(1, { message: 'Account name cannot be empty.' }),
	type: z.enum(['investment_asset', 'cash_asset', 'liability']),
	initial_value: z.number(),
	date: z.string().datetime({ message: 'Invalid date format. Expected ISO 8601 string.' }),
});

/**
 * POST /api/accounts
 *
 * Creates a new account and its initial value entry for the authenticated user.
 *
 * @body CreateAccountCommand
 *
 * @returns 201 - The newly created account object (AccountDto)
 * @returns 400 - Invalid request body
 * @returns 401 - User not authenticated
 * @returns 409 - An account with the same name already exists
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const { supabase, session } = locals;

	// Verify that a user session exists.
	if (!session) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Parse and validate request body.
	const body = await request.json();
	const parseResult = CreateAccountSchema.safeParse(body);

	if (!parseResult.success) {
		return new Response(
			JSON.stringify({
				error: 'Bad Request',
				details: parseResult.error.format(),
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
	const command = parseResult.data;

	try {
		// Call the service to perform the creation logic.
		const newAccount = await AccountService.createAccountWithInitialValue(
			supabase,
			session,
			command,
		);

		// Map the full account data to the AccountDto for the response.
		const accountDto: AccountDto = {
			id: newAccount.id,
			name: newAccount.name,
			type: newAccount.type,
			currency: newAccount.currency,
			archived_at: newAccount.archived_at,
			created_at: newAccount.created_at,
		};

		// Return the created account with a 201 status.
		return new Response(JSON.stringify(accountDto), {
			status: 201,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		// Handle specific conflict error for duplicate names.
		if (error instanceof ConflictError) {
			return new Response(JSON.stringify({ error: 'Conflict', message: error.message }), {
				status: 409,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Log and return a generic 500 error for any other failures.
		console.error('Failed to create account:', error);
		return new Response(
			JSON.stringify({
				error: 'Internal Server Error',
				message: 'Could not create account.',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}
};
