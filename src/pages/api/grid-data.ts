import type { APIContext } from "astro";
import GridDataService from "@/lib/services/grid-data.service";
import { gridDataQuerySchema } from "@/lib/validation/grid-data.schemas";

export const prerender = false;

/**
 * GET /api/grid-data
 *
 * Fetches aggregated grid data including accounts, value entries, and summary.
 *
 * Query Parameters:
 * - from (optional): Start date for data range (ISO 8601 or YYYY-MM-DD)
 * - to (optional): End date for data range (ISO 8601 or YYYY-MM-DD)
 *
 * @returns 200 OK with GridDataDto on success
 * @returns 400 Bad Request if query parameters are invalid
 * @returns 401 Unauthorized if user is not authenticated
 * @returns 500 Internal Server Error on database or unexpected errors
 */
export async function GET({ locals, url }: APIContext) {
  // Step 1: Verify authentication
  const { supabase, user } = locals;

  if (!user?.id) {
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

  const { from, to } = validationResult.data;

  // Step 3: Call the service to fetch grid data
  try {
    const gridData = await GridDataService.getGridData(supabase, user.id, {
      from,
      to,
    });

    return new Response(JSON.stringify(gridData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
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
