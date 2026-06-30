-- ============================================================
-- 042: 選抜ポジションをフォーメーション導出＋overlay化（案A, #178）
-- ------------------------------------------------------------
-- - 選抜/アンダー/期生・列・センターは楽曲フォーメーションから導出する方針へ
--   （Decision #177）。よって tier/row_number/is_center 列を撤去。
-- - overlay として「福神/櫻エイト(is_front_special)」「休業中(is_hiatus)」のみ保持。
-- - 既存データ移行は不要（運用上ほぼ未投入のため）。
-- ============================================================

ALTER TABLE public.orbit_release_member_positions
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS row_number,
  DROP COLUMN IF EXISTS is_center,
  ADD COLUMN IF NOT EXISTS is_hiatus BOOLEAN NOT NULL DEFAULT false;

-- overlay の総入れ替え。福神 or 休業中 のいずれかが立つ行のみ保持する。
CREATE OR REPLACE FUNCTION public.set_release_member_positions(
  p_release_id UUID,
  p_positions JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.orbit_release_member_positions
  WHERE release_id = p_release_id;

  INSERT INTO public.orbit_release_member_positions (
    release_id,
    member_id,
    is_front_special,
    is_hiatus
  )
  SELECT
    p_release_id,
    (item->>'memberId')::UUID,
    COALESCE((item->>'isFrontSpecial')::BOOLEAN, false),
    COALESCE((item->>'isHiatus')::BOOLEAN, false)
  FROM jsonb_array_elements(COALESCE(p_positions, '[]'::JSONB)) AS item
  WHERE NULLIF(item->>'memberId', '') IS NOT NULL
    -- いずれのフラグも立たない行は保持しない
    AND (
      COALESCE((item->>'isFrontSpecial')::BOOLEAN, false)
      OR COALESCE((item->>'isHiatus')::BOOLEAN, false)
    )
    -- 防御: シングルのみ
    AND EXISTS (
      SELECT 1 FROM public.orbit_releases r
      WHERE r.id = p_release_id AND r.release_type = 'single'
    )
    -- 防御: 当該リリースの参加メンバーに限定
    AND EXISTS (
      SELECT 1 FROM public.orbit_release_members rm
      WHERE rm.release_id = p_release_id
        AND rm.member_id = (item->>'memberId')::UUID
    );
END;
$$;
