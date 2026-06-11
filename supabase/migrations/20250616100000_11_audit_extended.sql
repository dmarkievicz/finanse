-- Rozszerzenie audit_log na kolejne tabele (bez import_rows — zbyt duży wolumen przy imporcie)

CREATE OR REPLACE FUNCTION audit_log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, NEW.id, 'insert', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Istniejące (idempotentnie)
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_accounts ON accounts;
CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_categories ON categories;
CREATE TRIGGER audit_categories
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Nowe
DROP TRIGGER IF EXISTS audit_transaction_entries ON transaction_entries;
CREATE TRIGGER audit_transaction_entries
  AFTER INSERT OR UPDATE OR DELETE ON transaction_entries
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_subcategories ON subcategories;
CREATE TRIGGER audit_subcategories
  AFTER INSERT OR UPDATE OR DELETE ON subcategories
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_user_settings ON user_settings;
CREATE TRIGGER audit_user_settings
  AFTER INSERT OR UPDATE OR DELETE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_budgets ON budgets;
CREATE TRIGGER audit_budgets
  AFTER INSERT OR UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_categorization_rules ON categorization_rules;
CREATE TRIGGER audit_categorization_rules
  AFTER INSERT OR UPDATE OR DELETE ON categorization_rules
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_goals ON goals;
CREATE TRIGGER audit_goals
  AFTER INSERT OR UPDATE OR DELETE ON goals
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_instruments ON instruments;
CREATE TRIGGER audit_instruments
  AFTER INSERT OR UPDATE OR DELETE ON instruments
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_investment_transactions ON investment_transactions;
CREATE TRIGGER audit_investment_transactions
  AFTER INSERT OR UPDATE OR DELETE ON investment_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

DROP TRIGGER IF EXISTS audit_imports ON imports;
CREATE TRIGGER audit_imports
  AFTER INSERT OR UPDATE OR DELETE ON imports
  FOR EACH ROW EXECUTE FUNCTION audit_log_changes();

-- Zdarzenia systemowe (czyszczenie danych itp.) — wywoływane z aplikacji
CREATE OR REPLACE FUNCTION log_system_audit(
  p_user_id uuid,
  p_event text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Brak uprawnień';
  END IF;

  INSERT INTO audit_log (user_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    p_user_id,
    'system',
    p_user_id,
    'update',
    NULL,
    jsonb_build_object('event', p_event, 'details', p_details, 'at', now())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_system_audit(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION log_system_audit(uuid, text, jsonb) TO service_role;
