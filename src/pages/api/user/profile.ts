import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.server";
import { deleteUserAccountSchema } from "../../../lib/validation/user.schemas";

export const prerender = false;

/**
 * DELETE /api/user/profile
 * Permanently deletes the authenticated user's account and all associated data
 *
 * Security:
 * - Requires authentication (enforced by middleware)
 * - Requires password verification before deletion
 * - Uses RPC to call secure database function
 *
 * @returns 204 No Content on success
 * @returns 400 Bad Request if validation fails
 * @returns 401 Unauthorized if password is incorrect
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = deleteUserAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Nieprawidłowe dane",
          details: validationResult.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { password } = validationResult.data;

    // Get user email from locals (set by middleware)
    const userEmail = locals.user?.email;
    if (!userEmail) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Verify password before deletion
    // This prevents accidental or unauthorized deletion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (signInError) {
      return new Response(JSON.stringify({ error: "Nieprawidłowe hasło" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call the database function to delete the user
    // This function runs with SECURITY DEFINER privileges
    // It will delete the user from auth.users and cascade delete all associated data
    const { error: deleteError } = await supabase.rpc("delete_current_user");

    if (deleteError) {
      return new Response(JSON.stringify({ error: "Nie udało się usunąć konta" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - user has been deleted
    return new Response(null, { status: 204 });
  } catch {
    return new Response(JSON.stringify({ error: "Wewnętrzny błąd serwera" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
