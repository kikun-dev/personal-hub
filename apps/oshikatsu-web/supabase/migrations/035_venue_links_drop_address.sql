-- ============================================================
-- 035: 会場入力の改善（#115）
-- 住所(address)を廃止し、Googleマップ/公式サイトのリンクを追加する。
-- 都道府県(prefecture)は単一フィールドのまま（フォーム側で 47＋海外 を選択）。
-- ============================================================

ALTER TABLE orbit_venues DROP COLUMN address;
ALTER TABLE orbit_venues ADD COLUMN map_url TEXT;
ALTER TABLE orbit_venues ADD COLUMN official_url TEXT;
