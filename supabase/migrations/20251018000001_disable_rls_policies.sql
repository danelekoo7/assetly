-- ============================================================================
-- Migration: Disable all RLS policies
-- ============================================================================
-- Purpose: Remove all RLS policies from accounts and value_entries tables
-- ============================================================================

-- Drop all policies from accounts table
drop policy if exists "authenticated_users_select_own_accounts" on accounts;
drop policy if exists "authenticated_users_insert_own_accounts" on accounts;
drop policy if exists "authenticated_users_update_own_accounts" on accounts;
drop policy if exists "authenticated_users_delete_own_accounts" on accounts;

-- Drop all policies from value_entries table
drop policy if exists "authenticated_users_select_own_value_entries" on value_entries;
drop policy if exists "authenticated_users_insert_own_value_entries" on value_entries;
drop policy if exists "authenticated_users_update_own_value_entries" on value_entries;
drop policy if exists "authenticated_users_delete_own_value_entries" on value_entries;

-- Disable RLS on both tables
alter table accounts disable row level security;
alter table value_entries disable row level security;

-- ============================================================================
-- End of migration
-- ============================================================================
