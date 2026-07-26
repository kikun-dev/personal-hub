-- ============================================================
-- 064: センターの旧正典（フォーメーション側）を撤去（#426 / ADR 0007 2026-07-24改訂）
-- ------------------------------------------------------------
-- 目的:
--   063 でセンターの正典を orbit_track_members.is_center へ移したため、
--   旧正典である orbit_track_formation_members.is_center 列と、それを更新する
--   set_track_centers 関数（039）を削除し、二重保持を残さない。
--
-- 適用順序（重要）:
--   本 migration は「063 の適用 → 新コードのデプロイ」が完了してから適用する。
--   旧コード（RPC 実行後に set_track_centers を呼ぶ songRepository）が
--   本番で動いている間に適用すると、センター保存が失敗する。
--   063 まで適用済みの状態はセンターを二重に持つだけで機能的には正しいため、
--   デプロイが落ち着くまで本 migration の適用を遅らせて構わない。
--
-- 変更内容:
--   (1) set_track_centers(UUID, JSONB) を削除
--   (2) orbit_track_formation_members.is_center を削除
--
-- RLS/Policy:
--   変更なし（列削除・関数削除のみ。新規テーブルは無い）。
--
-- ロールバック方針:
--   1. ALTER TABLE public.orbit_track_formation_members
--        ADD COLUMN is_center BOOLEAN NOT NULL DEFAULT false;
--   2. 039_add_formation_center.sql の set_track_centers 定義を再適用する。
--   3. orbit_track_members.is_center から is_center を復元する:
--        UPDATE public.orbit_track_formation_members AS fm
--        SET is_center = true
--        FROM public.orbit_track_formation_rows AS fr
--        JOIN public.orbit_track_formations AS f ON f.id = fr.formation_id
--        JOIN public.orbit_track_members AS tm
--          ON tm.track_id = f.track_id AND tm.is_center
--        WHERE fm.formation_row_id = fr.id
--          AND fr.row_number = 1
--          AND fm.member_id = tm.member_id;
-- ============================================================

DROP FUNCTION IF EXISTS public.set_track_centers(UUID, JSONB);

ALTER TABLE orbit_track_formation_members
  DROP COLUMN is_center;
