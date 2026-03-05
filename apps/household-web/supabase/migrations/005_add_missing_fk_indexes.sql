-- ============================================================
-- 005: FK 列の不足インデックス追加
-- Supabase Performance Advisor (unindexed_foreign_keys) 対応
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_categories_user_id
  ON categories (user_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
  ON payment_methods (user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
  ON transactions (category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id
  ON transactions (payment_method_id);
