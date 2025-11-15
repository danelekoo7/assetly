import { describe, it, expect, vi } from "vitest";
import AccountService from "@/lib/services/account.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { UpdateAccountCommand } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Define a type for our mock Supabase client to avoid using 'any'
type MockSupabaseClient = SupabaseClient;

// Mock Supabase client
const createMockSupabase = (
  returnData: Record<string, unknown> | null,
  errorData: { code: string } | null = null,
  count?: number
): MockSupabaseClient => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: errorData }),
  };

  // For delete with count
  if (count !== undefined) {
    mock.delete.mockResolvedValue({ error: errorData, count });
  }

  return mock as unknown as MockSupabaseClient;
};

describe("AccountService", () => {
  describe("updateAccount", () => {
    it("should call update with the correct data including type", async () => {
      const mockSupabase = createMockSupabase({ id: "123", name: "Updated Name", type: "cash_asset" });
      const updateSpy = vi.spyOn(mockSupabase, "update");

      const command: UpdateAccountCommand = {
        name: "Updated Name",
        type: "cash_asset",
      };

      await AccountService.updateAccount(mockSupabase as SupabaseClient, "user-1", "account-1", command);

      expect(updateSpy).toHaveBeenCalledWith(command);
    });

    it("should throw NotFoundError if no account is updated", async () => {
      const mockSupabase = createMockSupabase(null); // No data returned

      const command: UpdateAccountCommand = { name: "New Name" };

      await expect(
        AccountService.updateAccount(mockSupabase as SupabaseClient, "user-1", "non-existent-id", command)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ConflictError on unique constraint violation", async () => {
      const mockSupabase = createMockSupabase(null, { code: "23505" });

      const command: UpdateAccountCommand = { name: "Existing Name" };

      await expect(
        AccountService.updateAccount(mockSupabase as SupabaseClient, "user-1", "account-1", command)
      ).rejects.toThrow(ConflictError);
    });
  });
});
