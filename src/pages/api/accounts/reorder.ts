import type { APIRoute } from "astro";
import { z } from "zod";
import { ConflictError, NotFoundError } from "@/lib/errors";

// Zod schema for request body validation
const reorderAccountsSchema = z.object({
  accountIds: z.array(z.string().uuid()),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const {
    data: { session },
  } = await locals.supabase.auth.getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parsedBody = reorderAccountsSchema.safeParse(body);

    if (!parsedBody.success) {
      return new Response(JSON.stringify(parsedBody.error.flatten()), { status: 400 });
    }

    const { accountIds } = parsedBody.data;

    // Use a transaction to ensure all updates succeed or none do.
    const { error } = await locals.supabase.rpc("reorder_accounts", {
      p_user_id: userId,
      p_account_ids: accountIds,
    });

    if (error) {
      // Check for specific function errors if any are defined in PostgreSQL function
      if (error.message.includes("User unauthorized")) {
        return new Response("Forbidden", { status: 403 });
      }
      return new Response("An internal error occurred.", { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.flatten()), { status: 400 });
    }
    if (error instanceof ConflictError) {
      return new Response(error.message, { status: 409 });
    }
    if (error instanceof NotFoundError) {
      return new Response(error.message, { status: 404 });
    }
    return new Response("An unexpected error occurred.", { status: 500 });
  }
};
