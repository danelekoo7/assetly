import { z } from "zod";

/**
 * Schemat walidacji dla operacji upsert wpisu wartości (POST /value-entries).
 * Waliduje dane wejściowe zgodnie z typem UpsertValueEntryCommand.
 */
export const upsertValueEntrySchema = z.object({
  account_id: z.string().uuid("Nieprawidłowy format UUID dla account_id"),
  date: z.string().datetime("Nieprawidłowy format daty ISO 8601"),
  value: z.number({
    required_error: "Wartość jest wymagana",
    invalid_type_error: "Wartość musi być liczbą",
  }),
  cash_flow: z
    .number({
      invalid_type_error: "Cash flow musi być liczbą",
    })
    .nullable()
    .optional(),
  gain_loss: z
    .number({
      invalid_type_error: "Gain/loss musi być liczbą",
    })
    .nullable()
    .optional(),
});
