-- ============================================================
-- 039: フォーメーションにセンター(is_center)を追加
-- ------------------------------------------------------------
-- - センターは最前列(1列目 = row_number = 1)のメンバー限定
-- - Wセンターを許容（最大2人。件数上限はアプリ側で検証）
-- - 巨大RPCは変更せず、メイン更新の後に呼ぶ専用関数で設定する
-- ============================================================

ALTER TABLE public.orbit_track_formation_members
  ADD COLUMN IF NOT EXISTS is_center BOOLEAN NOT NULL DEFAULT false;

-- 楽曲のセンターを設定する。
-- 既存指定を解除し、1列目(row_number = 1)のメンバーのうち指定IDのみ is_center=true にする。
CREATE OR REPLACE FUNCTION public.set_track_centers(
  p_track_id UUID,
  p_center_member_ids JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- 既存のセンター指定を解除
  UPDATE public.orbit_track_formation_members AS fm
  SET is_center = false
  FROM public.orbit_track_formation_rows AS fr
  JOIN public.orbit_track_formations AS f ON f.id = fr.formation_id
  WHERE fm.formation_row_id = fr.id
    AND f.track_id = p_track_id
    AND fm.is_center;

  -- 1列目のメンバーのうち、指定IDをセンターに設定
  UPDATE public.orbit_track_formation_members AS fm
  SET is_center = true
  FROM public.orbit_track_formation_rows AS fr
  JOIN public.orbit_track_formations AS f ON f.id = fr.formation_id
  WHERE fm.formation_row_id = fr.id
    AND f.track_id = p_track_id
    AND fr.row_number = 1
    AND fm.member_id IN (
      SELECT (value)::UUID
      FROM jsonb_array_elements_text(COALESCE(p_center_member_ids, '[]'::JSONB)) AS t(value)
    );
END;
$$;
