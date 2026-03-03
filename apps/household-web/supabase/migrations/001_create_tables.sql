-- ============================================================
-- categories（カテゴリ: システムデフォルト + ユーザーカスタム）
-- ============================================================
CREATE TABLE categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  sort_order  INT NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_categories_unique_name
  ON categories (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), name, type);

-- ============================================================
-- payment_methods（支払い方法）
-- ============================================================
CREATE TABLE payment_methods (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_payment_methods_unique_name
  ON payment_methods (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), name);

-- ============================================================
-- transactions（取引: 中核テーブル）
-- ============================================================
CREATE TABLE transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount            INT NOT NULL CHECK (amount > 0),
  category_id       UUID NOT NULL REFERENCES categories(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  memo              TEXT NOT NULL DEFAULT '',
  is_oshikatsu      BOOLEAN NOT NULL DEFAULT false,
  group_name        TEXT,
  activity_type     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date ON transactions (user_id, date);
CREATE INDEX idx_transactions_oshikatsu ON transactions (user_id, is_oshikatsu, date)
  WHERE is_oshikatsu = true;

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- categories: 自分のデータ + システムデフォルト（user_id IS NULL）
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (user_id = auth.uid());

-- payment_methods: 同上
CREATE POLICY "payment_methods_select" ON payment_methods FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "payment_methods_insert" ON payment_methods FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "payment_methods_update" ON payment_methods FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "payment_methods_delete" ON payment_methods FOR DELETE
  USING (user_id = auth.uid());

-- transactions: ユーザー自身のデータのみ
-- INSERT/UPDATE は外部キー先が自分のデータまたはシステムデフォルトであることも検証
CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM categories
      WHERE id = category_id AND (categories.user_id = auth.uid() OR categories.user_id IS NULL)
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1 FROM payment_methods
        WHERE id = payment_method_id AND (payment_methods.user_id = auth.uid() OR payment_methods.user_id IS NULL)
      )
    )
  );
CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM categories
      WHERE id = category_id AND (categories.user_id = auth.uid() OR categories.user_id IS NULL)
    )
    AND (
      payment_method_id IS NULL
      OR EXISTS (
        SELECT 1 FROM payment_methods
        WHERE id = payment_method_id AND (payment_methods.user_id = auth.uid() OR payment_methods.user_id IS NULL)
      )
    )
  );
CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (user_id = auth.uid());
