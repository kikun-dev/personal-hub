-- ============================================================
-- 040: E2E setlist fixture（#363 / PR #375 レビュー対応）
-- ============================================================
-- Scope:
-- - 乃木坂46 真夏の全国ツアー2026 の最初の公演（sort_order 最小）へ、
--   セットリスト1曲の fixture 行を投入する。
-- - 目的: live-detail-attendance-density.spec.ts の「有効contextで
--   参戦記録がセットリストより前に現れる」Acceptance Criteria 検証が、
--   canonical seed（035 はセットリスト行を持たない）だけの環境でも
--   skip されず必ず実行されるようにする。
-- - #422: セットリスト楽曲は登録曲必須のため、この fixture も
--   song_title の自由入力ではなく登録済み track（track_id）を参照する。
--
-- Notes:
-- - Guard: 対象ライブのいずれかの公演にセットリスト行が既にある環境
--   （実データを運用中のDB）へは何も挿入しない。この seed が投入する
--   のはセットリストが完全に空の fresh 環境だけで、curated data と
--   fixture が混在しないようにする。
-- - 実在のセットリスト情報の curation は 035 の方針どおり後続 seed で
--   行う（このファイルは E2E fixture であり curated data ではない）。
-- ============================================================

DO $seed$
DECLARE
  v_performance_id UUID;
  v_track_id UUID;
BEGIN
  SELECT p.id
    INTO v_performance_id
    FROM public.orbit_live_performances p
    JOIN public.orbit_lives l ON l.id = p.live_id
   WHERE l.name = '乃木坂46 真夏の全国ツアー2026'
   ORDER BY p.sort_order
   LIMIT 1;

  -- 対象ライブが未投入の環境（035 未適用等）では何もしない
  IF v_performance_id IS NULL THEN
    RETURN;
  END IF;

  -- 対象ライブにセットリスト行が1件でもあれば実データ運用中とみなし挿入しない
  IF EXISTS (
    SELECT 1
      FROM public.orbit_setlist_items si
      JOIN public.orbit_live_performances p2 ON p2.id = si.performance_id
      JOIN public.orbit_lives l2 ON l2.id = p2.live_id
     WHERE l2.name = '乃木坂46 真夏の全国ツアー2026'
  ) THEN
    RETURN;
  END IF;

  -- 登録曲（乃木坂46「ぐるぐるカーテン」）を fixture の楽曲として参照する
  SELECT t.id INTO v_track_id
    FROM public.orbit_tracks t
    JOIN public.orbit_release_tracks rt ON rt.track_id = t.id
    JOIN public.orbit_releases r ON r.id = rt.release_id
    JOIN public.orbit_groups g ON g.id = r.group_id
   WHERE g.name_ja = '乃木坂46' AND t.title = 'ぐるぐるカーテン'
   LIMIT 1;

  -- 対象トラックが未投入の環境ではこの fixture をスキップする
  IF v_track_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.orbit_setlist_items (performance_id, position, item_type, track_id)
  VALUES (v_performance_id, 1, 'song', v_track_id);
END
$seed$;
