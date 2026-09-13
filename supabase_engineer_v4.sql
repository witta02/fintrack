-- ============================================================
--  FinTrack — Supabase Database Architecture Modernization (v4)
--  Role: Senior Data Engineer
--  Target Project: https://supabase.com/dashboard/project/huckcazvoccnvjhsjhxt
--
--  KEY UPGRADES IN THIS MIGRATION:
--  1. [ADD] savings_goals first-class relational table with RLS & triggers
--  2. [UPGRADE] wallets table: Wallet 2.0 schema (wallet_group, bank_code, account_number, exclude_from_total, is_archived)
--  3. [UPGRADE] down_payments: title column interoperability
--  4. [UPGRADE] user_profiles: promptpay_id, category_budgets, gamification columns
--  5. [FIX] v_wallet_balances & v_monthly_spending: security_invoker = true + accurate transfer debit/credit math
--  6. [CUT] Safe drop of obsolete 'user' view
--  7. [DATA MIGRATION] Automatic backfill from quests_state.cloud_vault_bundle to dedicated tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────────────────
-- 0. Shared Trigger Function
-- ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────
-- 1. user_profiles (User Settings, Tax, Gamification)
-- ──────────────────────────────────────────────────────────
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
  category_budgets       JSONB                DEFAULT '{}',
  promptpay_id           TEXT,
  savings_milestones     JSONB                DEFAULT '{}',
  savings_claimed_milestones JSONB            DEFAULT '{}',
  total_savings_coins    INTEGER              DEFAULT 0,
  created_at             TIMESTAMPTZ          DEFAULT NOW(),
  updated_at             TIMESTAMPTZ          DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS category_budgets JSONB DEFAULT '{}';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS promptpay_id TEXT;
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS savings_milestones JSONB DEFAULT '{}';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS savings_claimed_milestones JSONB DEFAULT '{}';
  ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_savings_coins INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
DROP TRIGGER IF EXISTS trg_user_profiles_upd ON user_profiles;
CREATE TRIGGER trg_user_profiles_upd
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 2. wallets (Wallet 2.0 System)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT    NOT NULL,
  type               TEXT    NOT NULL DEFAULT 'cash',
  color              TEXT    NOT NULL DEFAULT '#F5C842',
  icon               TEXT    NOT NULL DEFAULT 'cash',
  currency           TEXT    NOT NULL DEFAULT 'THB',
  balance            NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_default         BOOLEAN NOT NULL DEFAULT FALSE,
  wallet_group       TEXT    NOT NULL DEFAULT 'liquid',
  bank_code          TEXT,
  account_number     TEXT,
  exclude_from_total BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived        BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ    DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_group TEXT NOT NULL DEFAULT 'liquid';
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bank_code TEXT;
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS account_number TEXT;
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS exclude_from_total BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_group   ON wallets(user_id, wallet_group);
DROP TRIGGER IF EXISTS trg_wallets_upd ON wallets;
CREATE TRIGGER trg_wallets_upd
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 3. savings_goals (NEW Dedicated Table)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT    NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  category       TEXT    NOT NULL DEFAULT 'general',
  color          TEXT    NOT NULL DEFAULT '#F5C842',
  emoji          TEXT    DEFAULT '🎯',
  deadline       TIMESTAMPTZ,
  is_completed   BOOLEAN NOT NULL DEFAULT FALSE,
  note           TEXT,
  wallet_id      UUID    REFERENCES wallets(id) ON DELETE SET NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_deadline ON savings_goals(deadline);
DROP TRIGGER IF EXISTS trg_savings_goals_upd ON savings_goals;
CREATE TRIGGER trg_savings_goals_upd
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 4. down_payments (Upgraded)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS down_payments (
  id             UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  title          TEXT,
  total_amount   NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
  paid_amount    NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  monthly_amount NUMERIC(15,2),
  due_date       TIMESTAMPTZ,
  due_day        INTEGER,
  is_complete    BOOLEAN NOT NULL DEFAULT FALSE,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE down_payments ADD COLUMN IF NOT EXISTS title TEXT;
  UPDATE down_payments SET title = name WHERE title IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_down_payments_user_id ON down_payments(user_id);
DROP TRIGGER IF EXISTS trg_down_payments_upd ON down_payments;
CREATE TRIGGER trg_down_payments_upd
  BEFORE UPDATE ON down_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 5. recurring_rules
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_rules (
  id            UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT    NOT NULL,
  amount        NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  is_income     BOOLEAN NOT NULL DEFAULT FALSE,
  category      TEXT    NOT NULL DEFAULT 'Other',
  type          TEXT    NOT NULL DEFAULT 'monthly',
  custom_days   INTEGER,
  next_due_date TIMESTAMPTZ NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  wallet_id     UUID    REFERENCES wallets(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE recurring_rules ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_rules_user_id ON recurring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_due     ON recurring_rules(next_due_date);
DROP TRIGGER IF EXISTS trg_recurring_upd ON recurring_rules;
CREATE TRIGGER trg_recurring_upd
  BEFORE UPDATE ON recurring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 6. transactions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                 TEXT    NOT NULL,
  amount                NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  is_income             BOOLEAN NOT NULL DEFAULT FALSE,
  category              TEXT    NOT NULL DEFAULT 'Other',
  date                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recurring_id          UUID    REFERENCES recurring_rules(id) ON DELETE SET NULL,
  wallet_id             UUID    REFERENCES wallets(id) ON DELETE SET NULL,
  transfer_to_wallet_id UUID    REFERENCES wallets(id) ON DELETE SET NULL,
  is_transfer           BOOLEAN NOT NULL DEFAULT FALSE,
  note                  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS note TEXT;
  ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id         ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date            ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category        ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet          ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_wallet ON transactions(transfer_to_wallet_id);

DROP TRIGGER IF EXISTS trg_transactions_upd ON transactions;
CREATE TRIGGER trg_transactions_upd
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────────────────
-- 7. budgets
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id  UUID    REFERENCES wallets(id) ON DELETE CASCADE,
  category   TEXT    NOT NULL,
  amount     NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
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


-- ──────────────────────────────────────────────────────────
-- 8. net_worth_snapshots
-- ──────────────────────────────────────────────────────────
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


-- ──────────────────────────────────────────────────────────
-- 9. split_bills
-- ──────────────────────────────────────────────────────────
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


-- ──────────────────────────────────────────────────────────
-- 10. Cut Obsolete Objects
-- ──────────────────────────────────────────────────────────
DROP VIEW IF EXISTS "user";


-- ──────────────────────────────────────────────────────────
-- 11. Row Level Security (RLS) Policies
-- ──────────────────────────────────────────────────────────
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE down_payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_worth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_bills         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own user_profiles select" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles insert" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles update" ON user_profiles;
DROP POLICY IF EXISTS "Own user_profiles delete" ON user_profiles;
DROP POLICY IF EXISTS "Own wallets"              ON wallets;
DROP POLICY IF EXISTS "Own savings_goals"        ON savings_goals;
DROP POLICY IF EXISTS "Own down_payments"        ON down_payments;
DROP POLICY IF EXISTS "Own recurring_rules"      ON recurring_rules;
DROP POLICY IF EXISTS "Own transactions"         ON transactions;
DROP POLICY IF EXISTS "Own budgets"              ON budgets;
DROP POLICY IF EXISTS "Own net_worth_snapshots"  ON net_worth_snapshots;
DROP POLICY IF EXISTS "Own split_bills"          ON split_bills;

CREATE POLICY "Own user_profiles select" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own user_profiles insert" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own user_profiles update" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Own user_profiles delete" ON user_profiles FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Own wallets"              ON wallets             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own savings_goals"        ON savings_goals       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own down_payments"        ON down_payments       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own recurring_rules"      ON recurring_rules     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own transactions"         ON transactions        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own budgets"              ON budgets             FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own net_worth_snapshots"  ON net_worth_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Own split_bills"          ON split_bills         FOR ALL USING (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────
-- 12. Views with security_invoker = true
-- ──────────────────────────────────────────────────────────
DROP VIEW IF EXISTS v_monthly_spending;
DROP VIEW IF EXISTS v_wallet_balances;

CREATE OR REPLACE VIEW v_monthly_spending
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  DATE_TRUNC('month', date)                                                                 AS month,
  category,
  SUM(CASE WHEN NOT is_income AND NOT COALESCE(is_transfer, FALSE) THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN     is_income AND NOT COALESCE(is_transfer, FALSE) THEN amount ELSE 0 END) AS total_income,
  COUNT(*)                                                                                  AS transaction_count
FROM transactions
GROUP BY user_id, DATE_TRUNC('month', date), category;

CREATE OR REPLACE VIEW v_wallet_balances
  WITH (security_invoker = true)
AS
WITH tx_in AS (
  SELECT wallet_id, SUM(amount) AS inc
  FROM transactions
  WHERE is_income = TRUE AND (is_transfer IS NULL OR is_transfer = FALSE)
  GROUP BY wallet_id
),
tx_out AS (
  SELECT wallet_id, SUM(amount) AS exp
  FROM transactions
  WHERE is_income = FALSE AND (is_transfer IS NULL OR is_transfer = FALSE)
  GROUP BY wallet_id
),
tx_transfer_in AS (
  SELECT transfer_to_wallet_id AS wallet_id, SUM(amount) AS xfer_in
  FROM transactions
  WHERE is_transfer = TRUE AND transfer_to_wallet_id IS NOT NULL
  GROUP BY transfer_to_wallet_id
),
tx_transfer_out AS (
  SELECT wallet_id, SUM(amount) AS xfer_out
  FROM transactions
  WHERE is_transfer = TRUE
  GROUP BY wallet_id
)
SELECT
  w.id                AS wallet_id,
  w.user_id,
  w.name,
  w.type,
  w.color,
  w.icon,
  w.currency,
  w.wallet_group,
  w.bank_code,
  w.account_number,
  w.exclude_from_total,
  w.is_archived,
  w.balance           AS initial_balance,
  COALESCE(ti.inc, 0) AS total_income,
  COALESCE(to_out.exp, 0) AS total_expense,
  COALESCE(txi.xfer_in, 0) AS total_transfer_in,
  COALESCE(txo.xfer_out, 0) AS total_transfer_out,
  (
    w.balance
    + COALESCE(ti.inc, 0)
    - COALESCE(to_out.exp, 0)
    + COALESCE(txi.xfer_in, 0)
    - COALESCE(txo.xfer_out, 0)
  )                   AS current_balance,
  w.is_default,
  w.sort_order
FROM wallets w
LEFT JOIN tx_in ti ON ti.wallet_id = w.id
LEFT JOIN tx_out to_out ON to_out.wallet_id = w.id
LEFT JOIN tx_transfer_in txi ON txi.wallet_id = w.id
LEFT JOIN tx_transfer_out txo ON txo.wallet_id = w.id;


-- ──────────────────────────────────────────────────────────
-- 13. Backfill from cloud_vault_bundle
-- ──────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
  w_elem JSONB;
  g_elem JSONB;
  dp_elem JSONB;
  target_uid UUID;
BEGIN
  FOR rec IN
    SELECT user_id, quests_state->'cloud_vault_bundle' AS bundle
    FROM user_profiles
    WHERE quests_state ? 'cloud_vault_bundle'
  LOOP
    target_uid := rec.user_id;

    -- Backfill wallets
    IF rec.bundle ? 'wallets' AND jsonb_typeof(rec.bundle->'wallets') = 'array' THEN
      FOR w_elem IN SELECT * FROM jsonb_array_elements(rec.bundle->'wallets') LOOP
        INSERT INTO wallets (
          id, user_id, name, type, color, icon, currency, balance, is_default, wallet_group
        ) VALUES (
          CASE 
            WHEN (w_elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (w_elem->>'id')::uuid
            WHEN (w_elem->>'id') = 'default' THEN '00000000-0000-4000-8000-000000000001'::uuid
            WHEN (w_elem->>'id') = 'bank_main' THEN '00000000-0000-4000-8000-000000000002'::uuid
            WHEN (w_elem->>'id') = 'invest_main' THEN '00000000-0000-4000-8000-000000000003'::uuid
            ELSE uuid_generate_v4()
          END,
          target_uid,
          COALESCE(w_elem->>'name', 'Wallet'),
          COALESCE(w_elem->>'type', 'cash'),
          COALESCE(w_elem->>'color', '#F5C842'),
          COALESCE(w_elem->>'icon', 'cash'),
          COALESCE(w_elem->>'currency', 'THB'),
          COALESCE((w_elem->>'balance')::numeric, 0),
          COALESCE((w_elem->>'isDefault')::boolean, (w_elem->>'is_default')::boolean, false),
          COALESCE(w_elem->>'wallet_group', w_elem->>'walletGroup', 'liquid')
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END IF;

    -- Backfill savings_goals
    IF rec.bundle ? 'savings_goals' AND jsonb_typeof(rec.bundle->'savings_goals') = 'array' THEN
      FOR g_elem IN SELECT * FROM jsonb_array_elements(rec.bundle->'savings_goals') LOOP
        INSERT INTO savings_goals (
          id, user_id, title, target_amount, current_amount, color, emoji, deadline, is_completed
        ) VALUES (
          CASE 
            WHEN (g_elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (g_elem->>'id')::uuid
            ELSE uuid_generate_v4()
          END,
          target_uid,
          COALESCE(g_elem->>'title', 'Savings Goal'),
          GREATEST(1, COALESCE((g_elem->>'targetAmount')::numeric, (g_elem->>'target_amount')::numeric, 1000)),
          GREATEST(0, COALESCE((g_elem->>'currentAmount')::numeric, (g_elem->>'current_amount')::numeric, 0)),
          COALESCE(g_elem->>'color', '#F5C842'),
          COALESCE(g_elem->>'emoji', '🎯'),
          CASE WHEN g_elem->>'deadline' IS NOT NULL THEN (g_elem->>'deadline')::timestamptz ELSE NULL END,
          COALESCE((g_elem->>'isCompleted')::boolean, (g_elem->>'is_completed')::boolean, false)
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END IF;

    -- Backfill down_payments
    IF rec.bundle ? 'down_payments' AND jsonb_typeof(rec.bundle->'down_payments') = 'array' THEN
      FOR dp_elem IN SELECT * FROM jsonb_array_elements(rec.bundle->'down_payments') LOOP
        INSERT INTO down_payments (
          id, user_id, name, title, total_amount, paid_amount, monthly_amount, due_date
        ) VALUES (
          CASE 
            WHEN (dp_elem->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
            THEN (dp_elem->>'id')::uuid
            ELSE uuid_generate_v4()
          END,
          target_uid,
          COALESCE(dp_elem->>'name', dp_elem->>'title', 'Down Payment'),
          COALESCE(dp_elem->>'title', dp_elem->>'name', 'Down Payment'),
          COALESCE((dp_elem->>'totalAmount')::numeric, (dp_elem->>'total_amount')::numeric, 0),
          COALESCE((dp_elem->>'paidAmount')::numeric, (dp_elem->>'paid_amount')::numeric, 0),
          COALESCE((dp_elem->>'monthlyPayment')::numeric, (dp_elem->>'monthly_amount')::numeric, 0),
          CASE WHEN dp_elem->>'dueDate' IS NOT NULL THEN (dp_elem->>'dueDate')::timestamptz ELSE NULL END
        )
        ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;
END $$;
