-- ============================================================
-- 004: RLS の auth 関数呼び出し最適化
-- Supabase Performance Advisor (auth_rls_initplan) 対応
-- ============================================================

-- categories
ALTER POLICY "categories_select" ON categories
  USING (user_id = (select auth.uid()) OR user_id IS NULL);

ALTER POLICY "categories_insert" ON categories
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "categories_update" ON categories
  USING (user_id = (select auth.uid()));

ALTER POLICY "categories_delete" ON categories
  USING (user_id = (select auth.uid()));

-- payment_methods
ALTER POLICY "payment_methods_select" ON payment_methods
  USING (user_id = (select auth.uid()) OR user_id IS NULL);

ALTER POLICY "payment_methods_insert" ON payment_methods
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "payment_methods_update" ON payment_methods
  USING (user_id = (select auth.uid()));

ALTER POLICY "payment_methods_delete" ON payment_methods
  USING (user_id = (select auth.uid()));

-- transactions
ALTER POLICY "transactions_select" ON transactions
  USING (user_id = (select auth.uid()));

ALTER POLICY "transactions_insert" ON transactions
  WITH CHECK (
    user_id = (select auth.uid())
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM categories
        WHERE id = category_id
          AND (categories.user_id = (select auth.uid()) OR categories.user_id IS NULL)
      )
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM payment_methods
        WHERE id = payment_method_id
          AND (payment_methods.user_id = (select auth.uid()) OR payment_methods.user_id IS NULL)
      )
    )
  );

ALTER POLICY "transactions_update" ON transactions
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM categories
        WHERE id = category_id
          AND (categories.user_id = (select auth.uid()) OR categories.user_id IS NULL)
      )
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM payment_methods
        WHERE id = payment_method_id
          AND (payment_methods.user_id = (select auth.uid()) OR payment_methods.user_id IS NULL)
      )
    )
  );

ALTER POLICY "transactions_delete" ON transactions
  USING (user_id = (select auth.uid()));
