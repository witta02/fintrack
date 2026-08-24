-- ============================================================
--  FinTrack 3.0 — Supabase Database Schema (v3 FINAL FIX)
--  ✅ Safe on FRESH install AND existing database
--  ✅ Each column added individually with exception guard
--  Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- Shared trigger function
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ══════════════════════════════════════════════════════════
-- 1. user_profiles
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_profiles (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_currency      TEXT        NOT NULL DEFAULT 'THB',
  theme                  TEXT        NOT NULL DEFAULT 'dark',
  language               TEXT        NOT NULL DEFAULT 'th',
  is_dark_mode           BOOLEAN     NOT NULL DEFAULT TRUE,
  tax_personal_deduction NUMERIC(12,2)        DEFAULT 60000,
  tax_social_security    NUMERIC(12,2)        DEFAULT 9000,
  tax_provident_fund     NUMERIC(12,2)        DEFAULT 0,
  tax_mutual_funds       NUMERIC(12,2)        DEFAULT 0,
  tax_other_deductions   NUMERIC(12,2)        DEFAULT 0,
  xp                     INTEGER              DEFAULT 0,
  level                  INTEGER              DEFAULT 1,
  coins                  INTEGER              DEFAULT 0,
  custom_categories      JSONB                DEFAULT '[]',
  claimed_achievements   JSONB                DEFAULT '[]',
  unlocked_themes        JSONB                DEFAULT '["light","dark"]',
  forgiven_transactions  JSONB                DEFAULT '[]',
  collectibles           JSONB                DEFAULT '[]',
  quests_state           JSONB                DEFAULT '{"date":null,"firstIncome":false,"stayClean":true,"checkIn":false,"claimed":[]}',
  used_slips             JSONB                DEFAULT '[]',
  show_net_worth_card    BOOLEAN              DEFAULT TRUE,
  wallet_order           JSONB                DEFAULT '[]',
  created_at             TIMESTAMPTZ          DEFAULT NOW(),
  updated_at             TIMESTAMPTZ          DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
DROP TRIGGER IF EXISTS trg_user_profiles_upd ON user_profiles;
CREATE TRIGGER trg_user_profiles_upd
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════════════════════════
-- 2. wallets  (NEW — must be before transactions & recurring)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL DEFAULT 'cash',
  color      TEXT    NOT NULL DEFAULT '#F5C842',
  icon       TEXT    NOT NULL DEFAULT 'wallet',
  currency   TEXT    NOT NULL DEFAULT 'THB',
  balance    NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ    DEFAULT NOW(),
  updated_at TIMESTAMPTZ    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
DROP TRIGGER IF EXISTS trg_wallets_upd ON wallets;
CREATE TRIGGER trg_wallets_upd
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════════════════════════
-- 3. recurring_rules  (must be BEFORE transactions)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recurring_rules (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  amount        NUMERIC(15,2) NOT NULL,
  is_income     BOOLEAN NOT NULL DEFAULT FALSE,
  category      TEXT    NOT NULL DEFAULT 'Other',
  type          TEXT    NOT NULL DEFAULT 'monthly',
  custom_days   INTEGER,
  next_due_date TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON recurring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_due     ON recurring_rules(next_due_date);
DROP TRIGGER IF EXISTS trg_recurring_upd ON recurring_rules;
CREATE TRIGGER trg_recurring_upd
  BEFORE UPDATE ON recurring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Upgrade: add wallet_id to recurring_rules
DO $$ BEGIN
  ALTER TABLE recurring_rules ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════
-- 4. transactions
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  amount        NUMERIC(15,2) NOT NULL,
  is_income     BOOLEAN NOT NULL DEFAULT FALSE,
  category      TEXT    NOT NULL DEFAULT 'Other',
  date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recurring_id  UUID    REFERENCES recurring_rules(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
DROP TRIGGER IF EXISTS trg_transactions_upd ON transactions;
CREATE TRIGGER trg_transactions_upd
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Upgrade: add new 3.0 columns one-by-one (safe for existing tables)
DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN note TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN transfer_to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN is_transfer BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);


-- ══════════════════════════════════════════════════════════
-- 5. down_payments  (now cloud-synced)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS down_payments (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  total_amount   NUMERIC(15,2) NOT NULL,
  paid_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  monthly_amount NUMERIC(15,2),
  due_date       TIMESTAMPTZ,
  due_day        INTEGER,
  is_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_down_payments_user_id ON down_payments(user_id);
DROP TRIGGER IF EXISTS trg_down_payments_upd ON down_payments;
CREATE TRIGGER trg_down_payments_upd
  BEFORE UPDATE ON down_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════════════════════════
-- 6. budgets  (NEW)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id  UUID    REFERENCES wallets(id) ON DELETE CASCADE,
  category   TEXT    NOT NULL,
  amount     NUMERIC(15,2) NOT NULL,
  period     TEXT    NOT NULL DEFAULT 'monthly',
  year       INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  month      INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category, period, year, month)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
DROP TRIGGER IF EXISTS trg_budgets_upd ON budgets;
CREATE TRIGGER trg_budgets_upd
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════════════════════════
-- 7. net_worth_snapshots  (now cloud-synced)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assets      JSONB NOT NULL DEFAULT '{"cash":0,"investments":0,"property":0,"other":0}',
  liabilities JSONB NOT NULL DEFAULT '{"creditCard":0,"loans":0,"other":0}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_net_worth_user_id ON net_worth_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_date    ON net_worth_snapshots(recorded_at DESC);


-- ══════════════════════════════════════════════════════════
-- 8. split_bills  (now cloud-synced)
-- ══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS split_bills (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency   TEXT    NOT NULL DEFAULT 'THB',
  members    JSONB   NOT NULL DEFAULT '[]',
  items      JSONB   NOT NULL DEFAULT '[]',
  is_settled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_split_bills_user_id ON split_bills(user_id);
DROP TRIGGER IF EXISTS trg_split_bills_upd ON split_bills;
CREATE TRIGGER trg_split_bills_upd
  BEFORE UPDATE ON split_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE down_payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills          ENABLE ROW LEVEL SECURITY;

-- Drop & recreate policies (idempotent)
DROP POLICY IF EXISTS "Own user_profiles select" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles insert" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles update" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles delete" ON user_profiles;
DROP POLICY IF EXISTS "Own wallets"              ON wallets;
DROP POLICY IF EXISTS "Own transactions"         ON transactions;
DROP POLICY IF EXISTS "Own recurring_rules"      ON recurring_rules;
DROP POLICY IF EXISTS "Own down_payments"        ON down_payments;
DROP POLICY IF EXISTS "Own budgets"              ON budgets;
DROP POLICY IF EXISTS "Own net_worth_snapshots"  ON net_worth_snapshots;
DROP POLICY IF EXISTS "Own split_bills"          ON split_bills;

CREATE POLICY "Own user_profiles select" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own user_profiles insert" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own user_profiles update" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own user_profiles delete" ON user_profiles FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Own wallets"             ON wallets             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own transactions"        ON transactions        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own recurring_rules"     ON recurring_rules     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own down_payments"       ON down_payments       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own budgets"             ON budgets             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own net_worth_snapshots" ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own split_bills"         ON split_bills         FOR ALL USING (auth.uid() = user_id);


-- ══════════════════════════════════════════════════════════
-- VIEWS (created last — all columns exist by now)
-- ══════════════════════════════════════════════════════════

DROP VIEW IF EXISTS v_monthly_spending;
CREATE VIEW v_monthly_spending AS
SELECT
  user_id,
  DATE_TRUNC('month', date)                                                AS month,
  category,
  SUM(CASE WHEN NOT is_income AND NOT COALESCE(is_transfer,FALSE) THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN     is_income AND NOT COALESCE(is_transfer,FALSE) THEN amount ELSE 0 END) AS total_income,
  COUNT(*)                                                                 AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date), category;

DROP VIEW IF EXISTS v_wallet_balances;
CREATE VIEW v_wallet_balances AS
SELECT
  w.id        AS wallet_id,
  w.user_id,
  w.name,
  w.type,
  w.color,
  w.currency,
  w.balance   AS initial_balance,
  COALESCE(SUM(CASE WHEN t.is_income AND NOT COALESCE(t.is_transfer,FALSE) THEN t.amount ELSE 0 END), 0)     AS total_income,
  COALESCE(SUM(CASE WHEN NOT t.is_income AND NOT COALESCE(t.is_transfer,FALSE) THEN t.amount ELSE 0 END), 0) AS total_expense,
  w.balance
    + COALESCE(SUM(CASE WHEN t.is_income AND NOT COALESCE(t.is_transfer,FALSE) THEN t.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN NOT t.is_income AND NOT COALESCE(t.is_transfer,FALSE) THEN t.amount ELSE 0 END), 0)
  AS current_balance
FROM wallets w
LEFT JOIN transactions t ON t.wallet_id = w.id
GROUP BY w.id, w.user_id, w.name, w.type, w.color, w.currency, w.balance;


-- ══════════════════════════════════════════════════════════
-- ✅ DONE — FinTrack 3.0 schema ready
-- ══════════════════════════════════════════════════════════
