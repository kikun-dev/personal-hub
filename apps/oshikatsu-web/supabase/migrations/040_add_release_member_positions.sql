-- ============================================================
-- 040: シングルの選抜ポジション（メンバー × リリース）
-- ------------------------------------------------------------
-- - 選抜はシングルでのみ発生。リリース単位で各メンバーの位置を保持する
-- - tier(選抜/アンダー/期生) + 列 + センター + 福神/櫻エイト の分解モデル
-- - 巨大RPCは変更せず、専用関数で総入れ替えする
-- ============================================================

CREATE TABLE public.orbit_release_member_positions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id       UUID NOT NULL REFERENCES public.orbit_releases(id) ON DELETE CASCADE,
  member_id        UUID NOT NULL REFERENCES public.orbit_members(id) ON DELETE CASCADE,
  tier             TEXT NOT NULL CHECK (tier IN ('senbatsu', 'under', 'generation')),
  row_number       INT CHECK (row_number IS NULL OR row_number > 0),
  is_center        BOOLEAN NOT NULL DEFAULT false,
  is_front_special BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_release_member_positions_unique
  ON public.orbit_release_member_positions (release_id, member_id);
CREATE INDEX idx_orbit_release_member_positions_member
  ON public.orbit_release_member_positions (member_id);

ALTER TABLE public.orbit_release_member_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_release_member_positions_select"
  ON public.orbit_release_member_positions FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_member_positions_insert"
  ON public.orbit_release_member_positions FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_member_positions_update"
  ON public.orbit_release_member_positions FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_release_member_positions_delete"
  ON public.orbit_release_member_positions FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- リリースの選抜ポジションを総入れ替えする。
-- tier が無い項目は無視（=未設定メンバーは保持しない）。
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
    tier,
    row_number,
    is_center,
    is_front_special
  )
  SELECT
    p_release_id,
    (item->>'memberId')::UUID,
    item->>'tier',
    NULLIF(item->>'rowNumber', '')::INT,
    COALESCE((item->>'isCenter')::BOOLEAN, false),
    COALESCE((item->>'isFrontSpecial')::BOOLEAN, false)
  FROM jsonb_array_elements(COALESCE(p_positions, '[]'::JSONB)) AS item
  WHERE NULLIF(item->>'tier', '') IS NOT NULL
    AND NULLIF(item->>'memberId', '') IS NOT NULL;
END;
$$;
