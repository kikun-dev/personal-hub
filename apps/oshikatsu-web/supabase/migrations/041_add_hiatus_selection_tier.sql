-- ============================================================
-- 041: 選抜ポジションに休業中 tier を追加
-- ============================================================

ALTER TABLE public.orbit_release_member_positions
  DROP CONSTRAINT IF EXISTS orbit_release_member_positions_tier_check;

ALTER TABLE public.orbit_release_member_positions
  ADD CONSTRAINT orbit_release_member_positions_tier_check
  CHECK (tier IN ('senbatsu', 'under', 'generation', 'hiatus'));
