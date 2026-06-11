-- Budżety miesięczne i reguły auto-kategoryzacji (Faza 2 audytu)

CREATE TABLE budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  year         int NOT NULL,
  month        int NOT NULL CHECK (month BETWEEN 1 AND 12),
  limit_pln    numeric(18, 2) NOT NULL CHECK (limit_pln > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, year, month)
);

CREATE TABLE categorization_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern         text NOT NULL,
  category_id     uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategory_id  uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  priority        int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_budgets_user_period ON budgets(user_id, year, month);
CREATE INDEX idx_categorization_rules_user ON categorization_rules(user_id) WHERE is_active = true;

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select_own" ON budgets FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "budgets_insert_own" ON budgets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets_update_own" ON budgets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "budgets_delete_own" ON budgets FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "categorization_rules_select_own" ON categorization_rules FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "categorization_rules_insert_own" ON categorization_rules FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "categorization_rules_update_own" ON categorization_rules FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "categorization_rules_delete_own" ON categorization_rules FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
