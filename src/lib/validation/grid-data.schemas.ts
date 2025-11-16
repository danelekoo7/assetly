import { z } from "zod";

/**
 * Schema for validating query parameters for the GET /api/grid-data endpoint.
 *
 * @property from - Optional start date for data range (ISO 8601 or YYYY-MM-DD)
 * @property to - Optional end date for data range (ISO 8601 or YYYY-MM-DD)
 */
export const gridDataQuerySchema = z
  .object({
    from: z.string().date().optional().or(z.string().datetime().optional()),
    to: z.string().date().optional().or(z.string().datetime().optional()),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: "Data 'from' nie może być późniejsza niż 'to'",
      path: ["from"],
    }
  );

/**
 * Inferred TypeScript type from the gridDataQuerySchema.
 */
export type GridDataQuery = z.infer<typeof gridDataQuerySchema>;
