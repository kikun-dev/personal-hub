-- ============================================================
-- 056: orbit_spots に updated_at を追加 / 楽曲動画IDの維持（#288 セルフレビュー）
-- ------------------------------------------------------------
-- 目的:
--   (1) orbit_spots が他の orbit_* エンティティ（venues/track_videos 等）と
--       異なり updated_at を持っていなかったため、既存の慣行
--       （029_create_orbit_venues.sql）に合わせて追加する。
--   (2) update_track_with_relations_v2（043 が現行定義。054 は再定義せず）は
--       orbit_track_videos を毎回「全DELETE→新規INSERT（新UUID）」しており、
--       055 で追加した orbit_spot_appearances.video_id（ON DELETE SET NULL）が
--       楽曲を編集しただけでサイレントに NULL になってしまう。
--       048（公演IDの維持）と同種の問題のため、同じ方針で修正する。
--
-- 変更内容:
--   (1) ALTER TABLE orbit_spots ADD COLUMN updated_at + UPDATE トリガー
--       （029 と同じ update_updated_at() トリガー関数を使う）
--   (2) update_track_with_relations_v2 を CREATE OR REPLACE。
--       043 の定義を全文コピーし、orbit_track_videos の
--       DELETE→INSERT ブロックだけを、(video_type, video_url) を自然キーとした
--       差分更新（DELETE不足分のみ／UPDATE一致分はid維持／INSERT不足分のみ）に
--       置き換える。パース条件・dance_practice のグループ制限・
--       WITH ORDINALITY の重複排除挙動は現行と等価に保つ。
--       シグネチャ・他のブロック（orbit_tracks の UPDATE、
--       update_track_with_relations の呼び出し）は変更しない。
--
-- 制限事項:
--   - URL や種別を変更した動画は「別動画」として delete+insert される
--     （(video_type, video_url) が変わるため）。その動画への spot 参照は
--     ON DELETE SET NULL で外れる（意図した挙動。動画そのものが差し替わる
--     ため、旧動画への参照を残す意味がない）。
--   - payload 内に同一 (video_type, video_url) が複数含まれる場合、
--     最初の1件（ord が最小のもの）に正規化される。
--
-- ロールバック方針:
--   1. update_track_with_relations_v2 を 043_add_track_videos.sql の
--      CREATE FUNCTION 定義で再適用する（DELETE→INSERT方式に戻す）。
--   2. ALTER TABLE orbit_spots DROP COLUMN updated_at;
--      （トリガー orbit_spots_updated_at は列削除に連動しないため、
--      先に DROP TRIGGER orbit_spots_updated_at ON orbit_spots; を実行する）
-- ============================================================

-- ============================================================
-- (1) orbit_spots に updated_at を追加（029 と同じパターン）
-- ============================================================
ALTER TABLE orbit_spots
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TRIGGER orbit_spots_updated_at
  BEFORE UPDATE ON orbit_spots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- (2) update_track_with_relations_v2: orbit_track_videos を
--     (video_type, video_url) 自然キーの差分更新にする
--     （043 の全文をベースに、動画ブロックのみ置き換え）
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_track_with_relations_v2(
  p_track_id UUID,
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_videos JSONB,
  p_costumes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.orbit_tracks
  SET
    group_id = p_group_id,
    label = p_label,
    generation = p_generation
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'track not found: %', p_track_id USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.update_track_with_relations(
    p_track_id,
    p_title,
    p_release_links,
    p_credits,
    p_formation_rows,
    p_mv,
    p_costumes
  );

  -- orbit_track_videos: (video_type, video_url) を自然キーとした差分更新。
  -- 055 で追加した orbit_spot_appearances.video_id（ON DELETE SET NULL）が
  -- 「編集しただけ」でサイレントに外れないよう、既存の (type, url) と
  -- 一致する行は id を維持したまま UPDATE する（DELETE+INSERT 全取っ替えにしない）。
  WITH parsed_videos AS (
    SELECT DISTINCT ON (video.video_type, video.video_url)
      video.video_type,
      video.video_url,
      video.published_on,
      video.memo
    FROM (
      SELECT
        NULLIF(BTRIM(item->>'type'), '') AS video_type,
        NULLIF(BTRIM(item->>'url'), '') AS video_url,
        CASE
          WHEN NULLIF(BTRIM(item->>'publishedOn'), '') IS NULL THEN NULL
          ELSE (item->>'publishedOn')::DATE
        END AS published_on,
        NULLIF(BTRIM(item->>'memo'), '') AS memo,
        ord
      FROM jsonb_array_elements(COALESCE(p_videos, '[]'::JSONB)) WITH ORDINALITY AS videos(item, ord)
    ) AS video
    WHERE video.video_type IS NOT NULL
      AND video.video_url IS NOT NULL
      AND (
        video.video_type <> 'dance_practice'
        OR EXISTS (
          SELECT 1
          FROM public.orbit_tracks tracks
          JOIN public.orbit_groups groups
            ON groups.id = tracks.group_id
          WHERE tracks.id = p_track_id
            AND groups.name_ja IN ('櫻坂46', '日向坂46')
        )
      )
    -- (video_type, video_url) が重複する場合は payload 内で最初に出現した
    -- 1件（ord が最小のもの）に絞る（DISTINCT ON はこの ORDER BY の並びに従う）。
    ORDER BY video.video_type, video.video_url, video.ord
  ),
  -- payload に無い (type, url) の既存行だけ削除する（全削除はしない）。
  deleted_videos AS (
    DELETE FROM public.orbit_track_videos
    WHERE track_id = p_track_id
      AND NOT EXISTS (
        SELECT 1 FROM parsed_videos pv
        WHERE pv.video_type = orbit_track_videos.video_type
          AND pv.video_url = orbit_track_videos.video_url
      )
    RETURNING id
  ),
  -- payload と (type, url) が一致する既存行は id を維持したまま内容だけ更新する。
  updated_videos AS (
    UPDATE public.orbit_track_videos otv
    SET published_on = pv.published_on,
        memo = pv.memo
    FROM parsed_videos pv
    WHERE otv.track_id = p_track_id
      AND otv.video_type = pv.video_type
      AND otv.video_url = pv.video_url
    RETURNING otv.video_type, otv.video_url
  )
  -- 既存に無かった (type, url) だけ新規挿入する。
  INSERT INTO public.orbit_track_videos (
    track_id,
    video_type,
    video_url,
    published_on,
    memo
  )
  SELECT
    p_track_id,
    pv.video_type,
    pv.video_url,
    pv.published_on,
    pv.memo
  FROM parsed_videos pv
  WHERE NOT EXISTS (
    SELECT 1 FROM updated_videos uv
    WHERE uv.video_type = pv.video_type
      AND uv.video_url = pv.video_url
  );
END;
$$;
