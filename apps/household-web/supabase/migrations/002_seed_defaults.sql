-- ============================================================
-- デフォルトカテゴリ（支出）
-- ============================================================
INSERT INTO categories (user_id, name, type, sort_order, is_default) VALUES
  (NULL, '食費',     'expense', 1,  true),
  (NULL, '日用品',   'expense', 2,  true),
  (NULL, '交通費',   'expense', 3,  true),
  (NULL, '住居費',   'expense', 4,  true),
  (NULL, '光熱費',   'expense', 5,  true),
  (NULL, '通信費',   'expense', 6,  true),
  (NULL, '医療費',   'expense', 7,  true),
  (NULL, '衣服',     'expense', 8,  true),
  (NULL, '娯楽',     'expense', 9,  true),
  (NULL, '教育',     'expense', 10, true),
  (NULL, '推し活',   'expense', 11, true),
  (NULL, 'その他',   'expense', 99, true);

-- ============================================================
-- デフォルトカテゴリ（収入）
-- ============================================================
INSERT INTO categories (user_id, name, type, sort_order, is_default) VALUES
  (NULL, '給与',     'income', 1,  true),
  (NULL, '副業',     'income', 2,  true),
  (NULL, 'お小遣い', 'income', 3,  true),
  (NULL, 'その他',   'income', 99, true);

-- ============================================================
-- デフォルト支払い方法
-- ============================================================
INSERT INTO payment_methods (user_id, name, sort_order, is_default) VALUES
  (NULL, '現金',              1, true),
  (NULL, 'クレジットカード',  2, true),
  (NULL, 'デビットカード',    3, true),
  (NULL, '電子マネー',        4, true),
  (NULL, 'QRコード決済',      5, true),
  (NULL, '銀行振込',          6, true);
