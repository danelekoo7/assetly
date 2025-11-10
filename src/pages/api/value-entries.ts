import type { APIRoute } from "astro";

import ValueEntryService from "@/lib/services/value-entry.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { upsertValueEntrySchema } from "@/lib/validation/value-entry.schemas";

// Ensure dynamic rendering for this API endpoint
export const prerender = false;

/**
 * POST /api/value-entries
 *
 * Creates a new value entry or updates an existing one (upsert operation).
 * Implements automatic calculation of cash_flow and gain_loss based on account type
 * and provided values.
 *
 * @body UpsertValueEntryCommand
 *
 * @returns 200 - The created or updated value entry (ValueEntryDto)
 * @returns 400 - Invalid request body or data consistency validation failure
 * @returns 401 - User not authenticated
 * @returns 404 - Account not found or access denied
 * @returns 500 - Internal server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase, user } = locals;

  // Verify that a user is authenticated.
  const userId = user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate request body.
  const body = await request.json();
  const parseResult = upsertValueEntrySchema.safeParse(body);

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: "Bad Request",
        details: parseResult.error.format(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const command = parseResult.data;

  try {
    // Call the service to perform the upsert operation.
    const valueEntry = await ValueEntryService.upsertValueEntry(supabase, userId, command);

    // Return the created or updated value entry with a 200 status.
    return new Response(JSON.stringify(valueEntry), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Handle account not found or access denied.
    if (error instanceof NotFoundError) {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: error.message,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle data consistency validation failure.
    if (error instanceof ValidationError) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Log and return a generic 500 error for any other failures.
    // eslint-disable-next-line no-console
    console.error("Failed to upsert value entry:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Could not create or update value entry.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
