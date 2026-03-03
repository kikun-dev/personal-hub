-- ============================================================
-- 003: 支出特化カスタマイズ
-- - category_id を nullable に（推し活はカテゴリ不要）
-- - RLS ポリシー更新（category_id IS NULL を許可）
-- - 支払い方法シードデータ差し替え
-- ============================================================

-- 1. category_id を nullable に変更
ALTER TABLE transactions ALTER COLUMN category_id DROP NOT NULL;

-- 2. RLS INSERT ポリシー更新（category_id IS NULL を許可）
DROP POLICY "transactions_insert" ON transactions;
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM categories
        WHERE id = category_id AND (categories.user_id = auth.uid() OR categories.user_id IS NULL)
      )
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1 FROM payment_methods
        WHERE id = payment_method_id AND (payment_methods.user_id = auth.uid() OR payment_methods.user_id IS NULL)
      )
    )
  );

-- 3. RLS UPDATE ポリシー更新（同様）
DROP POLICY "transactions_update" ON transactions;
CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      category_id IS NULL
      OR EXISTS (
        SELECT 1 FROM categories
        WHERE id = category_id AND (categories.user_id = auth.uid() OR categories.user_id IS NULL)
      )
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1 FROM payment_methods
        WHERE id = payment_method_id AND (payment_methods.user_id = auth.uid() OR payment_methods.user_id IS NULL)
      )
    )
  );

-- 4. 支払い方法シードデータ差し替え
-- 既存の「現金」はそのまま残す（名前一致）
-- 名前変更で対応できるものは UPDATE、不要なものは DELETE、新規は INSERT
UPDATE payment_methods SET name = 'クレカ(三井住友NL)', sort_order = 2 WHERE user_id IS NULL AND name = 'クレジットカード';
UPDATE payment_methods SET name = 'クレカ(楽天)', sort_order = 3 WHERE user_id IS NULL AND name = 'デビットカード';
UPDATE payment_methods SET name = 'クレカ(ヨドバシ)', sort_order = 4 WHERE user_id IS NULL AND name = '電子マネー';
UPDATE payment_methods SET name = 'QR決済', sort_order = 5 WHERE user_id IS NULL AND name = 'QRコード決済';
UPDATE payment_methods SET name = '口座振替', sort_order = 6 WHERE user_id IS NULL AND name = '銀行振込';
INSERT INTO payment_methods (user_id, name, sort_order, is_default) VALUES
  (NULL, 'その他', 7, true);
