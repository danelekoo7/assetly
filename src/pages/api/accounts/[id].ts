import type { APIRoute } from "astro";
import { ZodError } from "zod";

import AccountService from "@/lib/services/account.service";
import { accountIdSchema, updateAccountSchema } from "@/lib/validation/account.schemas";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { AccountDto } from "@/types";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { supabase, session } = locals;

  // This should not happen due to middleware, but as a safeguard
  if (!session) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  try {
    // 1. Validate URL parameter
    const { id: accountId } = accountIdSchema.parse(params);

    // 2. Validate request body
    const body = await request.json();
    const command = updateAccountSchema.parse(body);

    // 3. Call the service to update the account
    const updatedAccount = await AccountService.updateAccount(supabase, session.user.id, accountId, command);

    // 4. Prepare and return the successful response DTO
    const responseDto: AccountDto = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      type: updatedAccount.type,
      currency: updatedAccount.currency,
      archived_at: updatedAccount.archived_at,
      created_at: updatedAccount.created_at,
    };

    return new Response(JSON.stringify(responseDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // 5. Handle errors
    if (error instanceof ZodError) {
      return new Response(JSON.stringify({ message: "Validation failed", errors: error.flatten() }), {
        status: 400,
      });
    }
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 404 });
    }
    if (error instanceof ConflictError) {
      return new Response(JSON.stringify({ message: error.message }), { status: 409 });
    }

    return new Response(JSON.stringify({ message: "An unexpected error occurred." }), { status: 500 });
  }
};
