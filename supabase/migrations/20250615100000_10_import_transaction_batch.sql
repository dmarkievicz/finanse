-- Atomowy import batcha: import_rows + transactions + transaction_entries

CREATE OR REPLACE FUNCTION import_transaction_batch(
  p_user_id   uuid,
  p_import_id uuid,
  p_items     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item          jsonb;
  ir            jsonb;
  tx            jsonb;
  entry         jsonb;
  row_id        uuid;
  tx_id         uuid;
  v_imported    int := 0;
  v_errors      int := 0;
  v_status      text;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Brak uprawnień do importu';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items musi być tablicą JSON';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    ir := item -> 'import_row';
    v_status := ir ->> 'status';

    INSERT INTO import_rows (
      import_id,
      user_id,
      row_number,
      raw_data,
      import_hash,
      status,
      validation_errors
    ) VALUES (
      p_import_id,
      p_user_id,
      (ir ->> 'row_number')::int,
      ir -> 'raw_data',
      ir ->> 'import_hash',
      v_status,
      ir -> 'validation_errors'
    )
    RETURNING id INTO row_id;

    IF v_status = 'error' THEN
      v_errors := v_errors + 1;
      CONTINUE;
    END IF;

    tx := item -> 'transaction';
    IF tx IS NULL OR tx = 'null'::jsonb THEN
      CONTINUE;
    END IF;

    INSERT INTO transactions (
      user_id,
      date,
      type,
      description,
      details,
      category_id,
      subcategory_id,
      import_id,
      status,
      validation_issues
    ) VALUES (
      p_user_id,
      (tx ->> 'date')::date,
      tx ->> 'type',
      tx ->> 'description',
      tx ->> 'details',
      NULLIF(tx ->> 'category_id', '')::uuid,
      NULLIF(tx ->> 'subcategory_id', '')::uuid,
      p_import_id,
      tx ->> 'status',
      COALESCE(tx -> 'validation_issues', '[]'::jsonb)
    )
    RETURNING id INTO tx_id;

    FOR entry IN SELECT value FROM jsonb_array_elements(COALESCE(item -> 'entries', '[]'::jsonb))
    LOOP
      INSERT INTO transaction_entries (
        transaction_id,
        user_id,
        account_id,
        amount,
        currency,
        exchange_rate,
        amount_pln,
        sort_order
      ) VALUES (
        tx_id,
        p_user_id,
        (entry ->> 'account_id')::uuid,
        (entry ->> 'amount')::numeric(18, 2),
        entry ->> 'currency',
        COALESCE((entry ->> 'exchange_rate')::numeric(18, 6), 1),
        (entry ->> 'amount_pln')::numeric(18, 2),
        COALESCE((entry ->> 'sort_order')::int, 0)
      );
    END LOOP;

    UPDATE import_rows
    SET transaction_id = tx_id, status = 'imported'
    WHERE id = row_id;

    v_imported := v_imported + 1;
  END LOOP;

  RETURN jsonb_build_object('imported', v_imported, 'errors', v_errors);
END;
$$;

GRANT EXECUTE ON FUNCTION import_transaction_batch(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION import_transaction_batch(uuid, uuid, jsonb) TO service_role;

-- Weryfikacja spójności sald (do testów / audytu)
CREATE OR REPLACE FUNCTION verify_balance_integrity(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  check_name text,
  issue_count bigint,
  sample_ids uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Wymagany user_id';
  END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Brak uprawnień';
  END IF;

  RETURN QUERY
  WITH uid AS (SELECT p_user_id AS user_id),
  pln_mismatch AS (
    SELECT te.id
    FROM transaction_entries te
    JOIN transactions t ON t.id = te.transaction_id
    CROSS JOIN uid
    WHERE t.user_id = uid.user_id
      AND t.deleted_at IS NULL
      AND ABS(te.amount_pln - ROUND(te.amount * te.exchange_rate, 2)) > 0.02
  ),
  transfer_imbalance AS (
    SELECT t.id
    FROM transactions t
    JOIN transaction_entries te ON te.transaction_id = t.id
    CROSS JOIN uid
    WHERE t.user_id = uid.user_id
      AND t.deleted_at IS NULL
      AND t.type IN ('transfer', 'exchange')
    GROUP BY t.id
    HAVING ABS(SUM(te.amount_pln)) > 0.02
  ),
  confirmed_without_entries AS (
    SELECT t.id
    FROM transactions t
    CROSS JOIN uid
    WHERE t.user_id = uid.user_id
      AND t.deleted_at IS NULL
      AND t.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM transaction_entries te WHERE te.transaction_id = t.id
      )
  )
  SELECT 'amount_pln_mismatch'::text, COUNT(*)::bigint, (ARRAY_AGG(id ORDER BY id))[1:5]
  FROM pln_mismatch
  UNION ALL
  SELECT 'transfer_not_zero'::text, COUNT(*)::bigint, (ARRAY_AGG(id ORDER BY id))[1:5]
  FROM transfer_imbalance
  UNION ALL
  SELECT 'confirmed_without_entries'::text, COUNT(*)::bigint, (ARRAY_AGG(id ORDER BY id))[1:5]
  FROM confirmed_without_entries;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_balance_integrity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_balance_integrity(uuid) TO service_role;
