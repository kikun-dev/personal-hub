-- 楽曲ラベルに「全員」(all) を追加する。
-- 既存の許容値に 'all' を加えるだけで、generation ルール等は変更しない。

ALTER TABLE public.orbit_tracks
  DROP CONSTRAINT IF EXISTS orbit_tracks_label_check;
ALTER TABLE public.orbit_tracks
  ADD CONSTRAINT orbit_tracks_label_check CHECK (
    label IS NULL
    OR label IN ('title', 'senbatsu', 'under', 'all', 'solo', 'unit', 'generation')
  );
