-- ============================================================================
-- Migration: Add display_order to accounts table
-- ============================================================================
-- Purpose: Add a column to allow custom sorting of accounts by the user.
-- Tables affected: accounts
-- Special considerations:
--   - The display_order column is nullable for backward compatibility.
--   - A function is created to set the initial order for existing accounts.
-- ============================================================================

-- ============================================================================
-- 1. Add display_order column to accounts table
-- ============================================================================
alter table accounts
add column display_order integer;

-- ============================================================================
-- 2. Create a temporary function to set initial display_order
-- ============================================================================
-- This function iterates through each user's accounts and assigns an
-- incremental display_order based on their creation date.
create or replace function set_initial_account_order()
returns void as $$
declare
  user_record record;
  account_record record;
  i integer;
begin
  for user_record in select id from auth.users loop
    i := 0;
    for account_record in
      select id from accounts
      where user_id = user_record.id
      order by created_at asc
    loop
      update accounts
      set display_order = i
      where id = account_record.id;
      i := i + 1;
    end loop;
  end loop;
end;
$$ language plpgsql;

-- ============================================================================
-- 3. Execute the function to populate display_order for existing accounts
-- ============================================================================
select set_initial_account_order();

-- ============================================================================
-- 4. Drop the temporary function
-- ============================================================================
drop function set_initial_account_order();

-- ============================================================================
-- 5. Add a NOT NULL constraint to the display_order column
-- ============================================================================
-- After populating existing rows, we can enforce that new accounts
-- must have a display_order.
alter table accounts
alter column display_order set not null;

-- ============================================================================
-- End of migration
-- ============================================================================
