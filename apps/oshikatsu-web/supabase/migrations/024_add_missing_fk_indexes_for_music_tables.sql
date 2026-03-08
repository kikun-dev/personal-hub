-- ============================================================
-- 024: 楽曲領域の未カバーFKインデックスを追加
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orbit_track_credits_person_id
  ON public.orbit_track_credits (person_id);

CREATE INDEX IF NOT EXISTS idx_orbit_track_mvs_director_person_id
  ON public.orbit_track_mvs (director_person_id);

CREATE INDEX IF NOT EXISTS idx_orbit_track_costumes_stylist_person_id
  ON public.orbit_track_costumes (stylist_person_id);
