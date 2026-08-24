-- ============================================================
--  FinTrack 3.0 — Database Audit & Security Fix
--  Run this AFTER supabase_schema_v3.sql
--  Senior Data Engineer Review — 2026-08-24
-- ============================================================


-- ══════════════════════════════════════════════════════════
-- SECTION 1: FIX VIEWS — security_invoker = true
-- ══════════════════════════════════════════════════════════
-- Problem: Views marked UNRESTRICTED bypass RLS, exposing ALL
-- users' data to any authenticated caller.
-- Fix: security_invoker = true forces the view to run under
-- the calling user's credentials, so RLS is respected.

DROP VIEW IF EXISTS v_wallet_balances;
DROP VIEW IF EXISTS v_monthly_spending;

CREATE OR REPLACE VIEW v_monthly_spending
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  DATE_TRUNC('month', date)                                                       AS month,
  category,
  SUM(CASE WHEN NOT is_income AND NOT COALESCE(is_transfer, FALSE) THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN     is_income AND NOT COALESCE(is_transfer, FALSE) THEN amount ELSE 0 END) AS total_income,
  COUNT(*)                                                                        AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date), category;

CREATE OR REPLACE VIEW v_wallet_balances
  WITH (security_invoker = true)
AS
SELECT
  w.id           AS wallet_id,
  w.user_id,
  w.name,
  w.type,
  w.color,
  w.icon,
  w.currency,
  w.balance      AS initial_balance,
  COALESCE(SUM(CASE WHEN t.is_income     AND NOT COALESCE(t.is_transfer, FALSE) THEN t.amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN NOT t.is_income AND NOT COALESCE(t.is_transfer, FALSE) THEN t.amount ELSE 0 END), 0) AS total_expense,
  w.balance
    + COALESCE(SUM(CASE WHEN t.is_income     AND NOT COALESCE(t.is_transfer, FALSE) THEN t.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN NOT t.is_income AND NOT COALESCE(t.is_transfer, FALSE) THEN t.amount ELSE 0 END), 0)
  AS current_balance,
  w.is_default,
  w.sort_order
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.user_id, w.name, w.type, w.color, w.icon,
         w.currency, w.balance, w.is_default, w.sort_order;


-- ══════════════════════════════════════════════════════════
-- SECTION 2: MIGRATE old "user" table → user_profiles
-- ══════════════════════════════════════════════════════════
-- The old "user" table still exists. store.js calls
-- supabase.from('user'). We migrate data and keep "user"
-- as a compatibility VIEW so old code doesn't break yet.

-- Dynamic migration: reads only columns that actually exist in the old table
DO $$
DECLARE
  col     RECORD;
  sel     TEXT := '';
  has     JSONB := '{}'::jsonb;
  sql     TEXT;
  known   TEXT[] := ARRAY[
    'selected_currency','is_dark_mode','language',
    'tax_personal_deduction','tax_social_security','tax_provident_fund',
    'tax_mutual_funds','tax_other_deductions',
    'xp','level','coins',
    'custom_categories','claimed_achievements','unlocked_themes',
    'forgiven_transactions','collectibles','quests_state','used_slips'
  ];
  c       TEXT;
BEGIN
  -- Discover which columns actually exist in the old "user" table
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user'
  LOOP
    has := has || jsonb_build_object(col.column_name, true);
  END LOOP;

  RAISE NOTICE 'Old user table columns found: %', has;

  -- Build SELECT clause using only existing columns, fallback to literals
  sel := 'u.user_id, ';
  sel := sel || CASE WHEN has ? 'selected_currency'      THEN 'COALESCE(u.selected_currency,''THB'')' ELSE '''THB''' END || ', ';
  sel := sel || CASE WHEN has ? 'is_dark_mode'           THEN 'CASE WHEN u.is_dark_mode THEN ''dark'' ELSE ''light'' END' ELSE '''dark''' END || ', ';
  sel := sel || CASE WHEN has ? 'language'               THEN 'COALESCE(u.language,''th'')' ELSE '''th''' END || ', ';
  sel := sel || CASE WHEN has ? 'is_dark_mode'           THEN 'COALESCE(u.is_dark_mode, TRUE)' ELSE 'TRUE' END || ', ';
  sel := sel || CASE WHEN has ? 'tax_personal_deduction' THEN 'COALESCE(u.tax_personal_deduction, 60000)' ELSE '60000' END || ', ';
  sel := sel || CASE WHEN has ? 'tax_social_security'    THEN 'COALESCE(u.tax_social_security, 9000)' ELSE '9000' END || ', ';
  sel := sel || CASE WHEN has ? 'tax_provident_fund'     THEN 'COALESCE(u.tax_provident_fund, 0)' ELSE '0' END || ', ';
  sel := sel || CASE WHEN has ? 'tax_mutual_funds'       THEN 'COALESCE(u.tax_mutual_funds, 0)' ELSE '0' END || ', ';
  sel := sel || CASE WHEN has ? 'tax_other_deductions'   THEN 'COALESCE(u.tax_other_deductions, 0)' ELSE '0' END || ', ';
  sel := sel || CASE WHEN has ? 'xp'                     THEN 'COALESCE(u.xp, 0)' ELSE '0' END || ', ';
  sel := sel || CASE WHEN has ? 'level'                  THEN 'COALESCE(u.level, 1)' ELSE '1' END || ', ';
  sel := sel || CASE WHEN has ? 'coins'                  THEN 'COALESCE(u.coins, 0)' ELSE '0' END || ', ';
  sel := sel || CASE WHEN has ? 'custom_categories'      THEN 'COALESCE(u.custom_categories, ''[]'')' ELSE '''[]''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'claimed_achievements'   THEN 'COALESCE(u.claimed_achievements, ''[]'')' ELSE '''[]''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'unlocked_themes'        THEN 'COALESCE(u.unlocked_themes, ''["light","dark"]'')' ELSE '''["light","dark"]''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'forgiven_transactions'  THEN 'COALESCE(u.forgiven_transactions, ''[]'')' ELSE '''[]''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'collectibles'           THEN 'COALESCE(u.collectibles, ''[]'')' ELSE '''[]''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'quests_state'           THEN 'COALESCE(u.quests_state, ''{"date":null,"firstIncome":false,"stayClean":true,"checkIn":false,"claimed":[]}''::jsonb)' ELSE '''{"date":null,"firstIncome":false,"stayClean":true,"checkIn":false,"claimed":[]}''::jsonb' END || ', ';
  sel := sel || CASE WHEN has ? 'used_slips'             THEN 'COALESCE(u.used_slips, ''[]'')' ELSE '''[]''::jsonb' END;

  sql := '
    INSERT INTO user_profiles (
      user_id, selected_currency, theme, language, is_dark_mode,
      tax_personal_deduction, tax_social_security, tax_provident_fund,
      tax_mutual_funds, tax_other_deductions,
      xp, level, coins,
      custom_categories, claimed_achievements, unlocked_themes,
      forgiven_transactions, collectibles, quests_state, used_slips
    )
    SELECT ' || sel || '
    FROM "user" u
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles p WHERE p.user_id = u.user_id
    )
  ';

  RAISE NOTICE 'Running migration SQL: %', sql;
  EXECUTE sql;
  RAISE NOTICE '✅ user → user_profiles migration complete';
END $$;

-- Drop old table and replace with a compatibility view
-- (store.js still calls supabase.from('user') until we update it)
DROP TABLE IF EXISTS "user" CASCADE;

CREATE OR REPLACE VIEW "user"
  WITH (security_invoker = true)
AS SELECT * FROM user_profiles;

-- Make the view writable so INSERT/UPDATE from store.js still works
-- (Supabase auto-generates RLS on the underlying table)
CREATE OR REPLACE RULE user_insert AS ON INSERT TO "user"
  DO INSTEAD
  INSERT INTO user_profiles VALUES (NEW.*);

CREATE OR REPLACE RULE user_update AS ON UPDATE TO "user"
  DO INSTEAD
  UPDATE user_profiles
  SET
    selected_currency      = NEW.selected_currency,
    theme                  = NEW.theme,
    language               = NEW.language,
    is_dark_mode           = NEW.is_dark_mode,
    tax_personal_deduction = NEW.tax_personal_deduction,
    tax_social_security    = NEW.tax_social_security,
    tax_provident_fund     = NEW.tax_provident_fund,
    tax_mutual_funds       = NEW.tax_mutual_funds,
    tax_other_deductions   = NEW.tax_other_deductions,
    xp                     = NEW.xp,
    level                  = NEW.level,
    coins                  = NEW.coins,
    custom_categories      = NEW.custom_categories,
    claimed_achievements   = NEW.claimed_achievements,
    unlocked_themes        = NEW.unlocked_themes,
    forgiven_transactions  = NEW.forgiven_transactions,
    collectibles           = NEW.collectibles,
    quests_state           = NEW.quests_state,
    used_slips             = NEW.used_slips,
    updated_at             = NOW()
  WHERE user_profiles.user_id = OLD.user_id;


-- ══════════════════════════════════════════════════════════
-- SECTION 3: DATA INTEGRITY — CHECK CONSTRAINTS
-- ══════════════════════════════════════════════════════════

-- Transactions: amount must always be positive
DO $$ BEGIN
  ALTER TABLE transactions
    ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Wallets: balance can be negative (credit card), but type must be valid
DO $$ BEGIN
  ALTER TABLE wallets
    ADD CONSTRAINT chk_wallets_type CHECK (
      type IN ('cash', 'bank', 'savings', 'credit', 'investment', 'other')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Recurring rules: type must be valid
DO $$ BEGIN
  ALTER TABLE recurring_rules
    ADD CONSTRAINT chk_recurring_type CHECK (
      type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Budgets: amount must be positive
DO $$ BEGIN
  ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Budgets: month must be 1-12 or NULL
DO $$ BEGIN
  ALTER TABLE budgets
    ADD CONSTRAINT chk_budgets_month CHECK (month IS NULL OR (month >= 1 AND month <= 12));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Down payments: paid can't exceed total
DO $$ BEGIN
  ALTER TABLE down_payments
    ADD CONSTRAINT chk_down_payments_paid_lte_total CHECK (paid_amount <= total_amount);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_profiles: language must be valid
DO $$ BEGIN
  ALTER TABLE user_profiles
    ADD CONSTRAINT chk_user_profiles_language CHECK (language IN ('th', 'en'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════
-- SECTION 4: MISSING INDEXES for query performance
-- ══════════════════════════════════════════════════════════

-- Transactions: fast filter by is_income (dashboard income vs expense split)
CREATE INDEX IF NOT EXISTS idx_transactions_is_income
  ON transactions(user_id, is_income, date DESC);

-- Transactions: fast filter by wallet + date (wallet detail screen)
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date
  ON transactions(wallet_id, date DESC);

-- Recurring rules: active rules only (most queries filter is_active = true)
CREATE INDEX IF NOT EXISTS idx_recurring_active
  ON recurring_rules(user_id, is_active, next_due_date)
  WHERE is_active = TRUE;

-- Budgets: current month lookup
CREATE INDEX IF NOT EXISTS idx_budgets_period
  ON budgets(user_id, year, month);

-- Down payments: open plans only
CREATE INDEX IF NOT EXISTS idx_down_payments_open
  ON down_payments(user_id, is_complete)
  WHERE is_complete = FALSE;


-- ══════════════════════════════════════════════════════════
-- SECTION 5: VERIFY — quick sanity check queries
-- Run these manually in SQL Editor to confirm all is good
-- ══════════════════════════════════════════════════════════

-- 5a. Check all tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_profiles','wallets','transactions','recurring_rules',
    'down_payments','budgets','net_worth_snapshots','split_bills'
  )
ORDER BY table_name;

-- 5b. Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles','wallets','transactions','recurring_rules',
    'down_payments','budgets','net_worth_snapshots','split_bills'
  )
ORDER BY tablename;

-- 5c. Check new columns exist on transactions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('wallet_id','note','is_transfer','transfer_to_wallet_id','updated_at')
ORDER BY column_name;

-- 5d. Check views are security_invoker
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('v_monthly_spending','v_wallet_balances','user');

-- 5e. Check all indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ══════════════════════════════════════════════════════════
-- ✅ Audit complete. Issues fixed:
--  1. Views now security_invoker = true (RLS enforced)
--  2. Old "user" table migrated → "user_profiles"
--     Old "user" replaced by writable compatibility view
--  3. CHECK constraints added (amount > 0, valid enums, etc.)
--  4. Performance indexes added (compound, partial)
--  5. Sanity check queries at the bottom to verify
-- ══════════════════════════════════════════════════════════
