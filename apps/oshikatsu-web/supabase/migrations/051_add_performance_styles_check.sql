-- ============================================================
-- 051: performance_styles 配列の要素値に CHECK 制約を追加する
-- ------------------------------------------------------------
-- 050 で追加した orbit_setlist_items.performance_styles（text[]）は
-- 配列内の各値を検証しておらず、旧 performance_style 列の CHECK は
-- RPC が書く先頭要素にしか効かない。例えば ['full', 'invalid'] のような
-- payload では2要素目の不正値がそのまま保存され、読み取り側の
-- 実行時ガード（isPerformanceStyle）で落とされて保存値と表示が
-- ずれる可能性がある（PR #265 レビュー指摘）。
-- 配列全体を DB 境界で検証する CHECK を追加する。
--
-- 050 は適用済みのため、050 の編集ではなく本 migration として追加する。
-- 既存データは backfill 元の旧列が同じ値集合の CHECK を持つため
-- すべて本制約を満たす（空配列も <@ により true）。
--
-- 注意: 披露タイプの値を将来追加する場合は、本制約と
-- 旧 performance_style 列の CHECK（撤去予定）の両方の更新が必要。
--
-- ロールバック方針:
--   ALTER TABLE orbit_setlist_items
--     DROP CONSTRAINT orbit_setlist_items_performance_styles_check;
-- ============================================================

ALTER TABLE orbit_setlist_items
  ADD CONSTRAINT orbit_setlist_items_performance_styles_check
  CHECK (
    performance_styles <@ ARRAY['full', 'one_half', 'interlude_long', 'other']::text[]
  );
