import type { APIContext } from "astro";
import GridDataService from "@/lib/services/grid-data.service";
import { gridDataQuerySchema } from "@/lib/validation/grid-data.schemas";
import { createSupabaseServerInstance } from "@/db/supabase.server";

export const prerender = false;

/**
 * GET /api/grid-data
 *
 * Fetches aggregated grid data including accounts, value entries, and summary.
 *
 * Query Parameters:
 * - from (optional): Start date for data range (ISO 8601 or YYYY-MM-DD)
 * - to (optional): End date for data range (ISO 8601 or YYYY-MM-DD)
 * - archived (optional): Include archived accounts (default: false)
 *
 * @returns 200 OK with GridDataDto on success
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 401 Unauthorized if user is not authenticated
 * @returns 500 Internal Server Error on database or unexpected errors
 */
export async function GET({ url, request, cookies }: APIContext) {
  // Step 1: Verify authentication
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Step 2: Parse and validate query parameters
  const searchParams = Object.fromEntries(url.searchParams.entries());

  const validationResult = gridDataQuerySchema.safeParse(searchParams);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: "Nieprawidłowe parametry zapytania",
        details: validationResult.error.flatten(),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { from, to, archived } = validationResult.data;

  // Step 3: Call the service to fetch grid data
  try {
    const gridData = await GridDataService.getGridData(supabase, session.user.id, {
      from,
      to,
      showArchived: archived,
    });

    return new Response(JSON.stringify(gridData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60", // Cache for 60 seconds
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error in GET /api/grid-data:", error);

    return new Response(
      JSON.stringify({
        error: "Nie udało się pobrać danych. Spróbuj ponownie później.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
