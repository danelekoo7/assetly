-- ============================================================================
-- Migration: Create accounts and value_entries tables
-- ============================================================================
-- Purpose: Initialize the core financial tracking schema for Assetly
-- Tables affected: accounts, value_entries
-- Types created: account_type enum
-- Special considerations:
--   - RLS enabled on all tables for user data isolation
--   - Cascading deletes ensure data cleanup when users are removed
--   - Numeric(18,4) precision for financial calculations
--   - Timestamptz for proper timezone handling
-- ============================================================================

-- ============================================================================
-- 1. Create custom ENUM types
-- ============================================================================

-- account_type: defines allowed account categories
-- - investment_asset: accounts holding investments (stocks, bonds, etc.)
-- - cash_asset: liquid cash accounts (savings, checking accounts)
-- - liability: debt accounts (loans, credit cards)
create type account_type as enum (
  'investment_asset',
  'cash_asset',
  'liability'
);

-- ============================================================================
-- 2. Create accounts table
-- ============================================================================

-- accounts: stores user financial accounts
-- each user can have multiple accounts of different types
create table accounts (
  -- primary key: uuid generated automatically
  id uuid primary key default gen_random_uuid(),

  -- foreign key to supabase auth.users
  -- on delete cascade ensures all accounts are removed when user is deleted
  user_id uuid not null references auth.users(id) on delete cascade,

  -- account name (e.g., "mBank", "XTB Portfolio")
  -- must be unique per user
  name text not null,

  -- account type from enum
  type account_type not null,

  -- currency code (ISO 4217)
  -- defaults to PLN for polish users
  currency text not null default 'PLN',

  -- soft delete: null = active, timestamptz = archived
  -- allows users to hide accounts without losing historical data
  archived_at timestamptz,

  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ensure account names are unique per user
  unique(user_id, name)
);

-- ============================================================================
-- 3. Create value_entries table
-- ============================================================================

-- value_entries: stores historical value snapshots for each account
-- one entry per account per date
create table value_entries (
  -- primary key: uuid generated automatically
  id uuid primary key default gen_random_uuid(),

  -- foreign key to accounts
  -- on delete cascade ensures entries are removed when account is deleted
  account_id uuid not null references accounts(id) on delete cascade,

  -- date of the value snapshot
  date timestamptz not null,

  -- total account value on this date
  -- numeric(18,4) provides precise financial calculations
  value numeric(18, 4) not null,

  -- cash flow: deposits (positive) or withdrawals (negative)
  -- tracks user's contributions/withdrawals
  cash_flow numeric(18, 4) not null default 0,

  -- gain/loss: investment returns
  -- calculated as: value = previous_value + cash_flow + gain_loss
  gain_loss numeric(18, 4) not null default 0,

  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ensure only one entry per account per date
  unique(account_id, date)
);

-- ============================================================================
-- 4. Create indexes for query performance
-- ============================================================================

-- index on accounts.user_id
-- optimizes queries filtering accounts by logged-in user
-- essential for: select * from accounts where user_id = current_user_id
create index idx_accounts_user_id on accounts(user_id);

-- composite index on value_entries (account_id, date desc)
-- optimizes time-series queries for chart rendering
-- desc order supports "latest first" queries
-- essential for: select * from value_entries where account_id = ? order by date desc
create index idx_value_entries_account_id_date on value_entries(account_id, date desc);

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================

-- enable rls on accounts table
-- users can only access their own accounts
alter table accounts enable row level security;

-- enable rls on value_entries table
-- users can only access entries for their own accounts
alter table value_entries enable row level security;

-- ============================================================================
-- 6. Create RLS Policies for accounts table
-- ============================================================================

-- policy: authenticated users can select their own accounts
-- rationale: users need to view their account list
create policy "authenticated_users_select_own_accounts"
  on accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: authenticated users can insert their own accounts
-- rationale: users need to create new accounts
create policy "authenticated_users_insert_own_accounts"
  on accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: authenticated users can update their own accounts
-- rationale: users need to edit account details (name, archive status, etc.)
create policy "authenticated_users_update_own_accounts"
  on accounts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: authenticated users can delete their own accounts
-- rationale: users need to permanently remove accounts
-- note: this will cascade delete all associated value_entries
create policy "authenticated_users_delete_own_accounts"
  on accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 7. Create RLS Policies for value_entries table
-- ============================================================================

-- policy: authenticated users can select entries for their own accounts
-- rationale: users need to view historical data for charts and reports
-- verification: checks ownership through accounts table join
create policy "authenticated_users_select_own_value_entries"
  on value_entries
  for select
  to authenticated
  using (
    exists (
      select 1 from accounts
      where accounts.id = value_entries.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- policy: authenticated users can insert entries for their own accounts
-- rationale: users need to add new value snapshots
-- verification: checks ownership through accounts table join
create policy "authenticated_users_insert_own_value_entries"
  on value_entries
  for insert
  to authenticated
  with check (
    exists (
      select 1 from accounts
      where accounts.id = value_entries.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- policy: authenticated users can update entries for their own accounts
-- rationale: users need to correct historical data
-- verification: checks ownership through accounts table join
create policy "authenticated_users_update_own_value_entries"
  on value_entries
  for update
  to authenticated
  using (
    exists (
      select 1 from accounts
      where accounts.id = value_entries.account_id
      and accounts.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from accounts
      where accounts.id = value_entries.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- policy: authenticated users can delete entries for their own accounts
-- rationale: users need to remove erroneous entries
-- verification: checks ownership through accounts table join
create policy "authenticated_users_delete_own_value_entries"
  on value_entries
  for delete
  to authenticated
  using (
    exists (
      select 1 from accounts
      where accounts.id = value_entries.account_id
      and accounts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- End of migration
-- ============================================================================
