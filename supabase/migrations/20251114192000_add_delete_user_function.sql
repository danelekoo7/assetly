-- ============================================================================
-- migration: add delete_current_user function
-- ============================================================================
-- purpose: enable authenticated users to permanently delete their own account
-- tables affected: auth.users (and cascading to accounts, value_entries)
-- security considerations:
--   - security definer allows the function to bypass rls and delete from auth.users
--   - auth.uid() check ensures users can only delete their own account
--   - cascading delete will remove all associated data (accounts, value_entries)
-- ============================================================================

-- ============================================================================
-- create function to delete current authenticated user
-- ============================================================================

-- delete_current_user: allows user to permanently delete their own account
-- this function runs with elevated privileges (security definer) to access auth.users
-- rationale: regular users don't have direct delete access to auth.users table
create or replace function delete_current_user()
returns void
language plpgsql
security definer -- run with elevated privileges to access auth.users
set search_path = public, auth -- explicitly set search path for security
as $$
begin
  -- guard clause: ensure user is authenticated
  -- prevents anonymous users from calling this function
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  
  -- delete the current user from auth.users
  -- on delete cascade will automatically remove:
  --   - all accounts belonging to this user
  --   - all value_entries belonging to those accounts
  -- note: this operation is irreversible
  delete from auth.users 
  where id = auth.uid();
  
  -- note: no need to explicitly return anything for void function
  -- if delete fails, postgres will raise an exception automatically
end;
$$;

-- ============================================================================
-- grant execute permission to authenticated users
-- ============================================================================

-- allow authenticated users to call this function
-- anon users are explicitly excluded for security
grant execute on function delete_current_user() to authenticated;

-- revoke from anon to be explicit about security
revoke execute on function delete_current_user() from anon;

-- ============================================================================
-- end of migration
-- ============================================================================
