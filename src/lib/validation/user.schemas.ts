import { z } from "zod";

/**
 * Schema for validating user account deletion request
 * Requires password confirmation to prevent accidental deletion
 */
export const deleteUserAccountSchema = z.object({
  password: z.string().min(1, "Hasło jest wymagane").min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

/**
 * TypeScript type for delete user account request
 * Inferred from Zod schema for type safety
 */
export type DeleteUserAccountRequest = z.infer<typeof deleteUserAccountSchema>;
