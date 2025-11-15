import { z } from "zod";

/**
 * Schema for validating the account ID from the URL parameters.
 * Ensures that the ID is a valid UUID.
 */
export const accountIdSchema = z.object({
  id: z.string().uuid({ message: "Identyfikator konta musi być poprawnym UUID." }),
});

/**
 * Schema for validating the request body for updating an account (PATCH /accounts/{id}).
 *
 * It validates the following optional fields:
 * - `name`: Must be a non-empty string if provided.
 * - `archived_at`: Must be a valid ISO 8601 datetime string or `null` if provided.
 *
 * The `.refine()` method ensures that the request body is not empty and contains
 * at least one of the fields to be updated.
 */
export const updateAccountSchema = z
  .object({
    name: z.string().min(1, { message: "Nazwa nie może być pusta." }).optional(),
    archived_at: z
      .string()
      .datetime({ message: "Data archiwizacji musi być w formacie ISO 8601." })
      .nullable()
      .optional(),
    type: z.enum(["cash_asset", "investment_asset"]).optional(),
  })
  .refine((data) => data.name !== undefined || data.archived_at !== undefined || data.type !== undefined, {
    message: "Należy podać przynajmniej jedno pole do aktualizacji (name, archived_at lub type).",
    path: [], // Apply the error to the whole object if the check fails
  });
