-- ============================================================================
-- Migration: Create reorder_accounts function
-- ============================================================================
-- Purpose: Creates a PostgreSQL function to atomically update the display
--          order of a user's accounts.
-- Functions created: reorder_accounts
-- Special considerations:
--   - The function runs with the privileges of the caller (invoker security).
--   - It ensures that a user can only reorder their own accounts.
--   - The operation is atomic: all updates succeed or none do.
-- ============================================================================

-- ============================================================================
-- 1. Create the reorder_accounts function
-- ============================================================================
create or replace function reorder_accounts(
  p_user_id uuid,
  p_account_ids uuid[]
)
returns void as $$
declare
  account_id uuid;
  i integer := 0;
begin
  -- Loop through the provided array of account IDs.
  -- The index of the array determines the new display_order.
  foreach account_id in array p_account_ids
  loop
    update accounts
    set display_order = i
    where
      id = account_id and
      user_id = p_user_id; -- Security check: ensure user owns the account.

    i := i + 1;
  end loop;
end;
$$ language plpgsql;

-- ============================================================================
-- End of migration
-- ============================================================================
