-- ============================================================
-- 063: 楽曲参加メンバーの正典 orbit_track_members を追加（#426 / ADR 0007 2026-07-24改訂）
-- ------------------------------------------------------------
-- 目的:
--   楽曲単位の「参加メンバー」と「センター」を、フォーメーション
--   （orbit_track_formations 系）から独立した正典として保持する。
--   現状は orbit_track_formation_members が楽曲固有の参加者とセンターを
--   兼ねているため、「参加メンバーやセンターは判明しているが
--   フォーメーションは未解禁」という頻出状態を表現できない。
--
-- 変更内容:
--   (1) orbit_track_members を新設（track_id / member_id / is_center）。
--       列・配置順・ポジションは持たせない（それらはフォーメーションの責務）。
--   (2) 既存フォーメーションから参加メンバーとセンターを backfill し、
--       件数・集合・センターの一致を DO ブロックで検証する。
--   (3) 楽曲RPCを差し替え、参加メンバー・センター・フォーメーションを
--       同一トランザクションで保存する。RPC 後に set_track_centers を
--       別実行する現行方式（039）をやめ、途中失敗による部分更新をなくす。
--   (4) フォーメーション保存時の不変条件を DB 側の最終防御として実装する。
--       - センターは参加メンバー内・最大2人
--       - フォーメーションがある場合、全列のメンバー集合と参加メンバー集合が完全一致
--       - フォーメーションがある場合、センターは1列目に含まれる
--   (5) update 経路にのみ存在した「フォーメーションは紐づくリリース参加メンバーの
--       和集合に限る」ハード制約（038）を撤去する。#425 の Decision により、
--       楽曲参加メンバーがリリース参加メンバー外でも DB では拒否せず、
--       不一致は管理UIの警告として扱う（create 経路（023）には元から
--       同制約が無く、両経路の挙動が非対称だった点もここで揃う）。
--   (6) センターの旧正典（orbit_track_formation_members.is_center 列と
--       set_track_centers 関数（039））を削除し、二重保持を残さない。
--
-- RPC シグネチャ:
--   overload を残さないため、038 の前例に従って旧シグネチャを DROP してから
--   CREATE する（v3 は作らず名前は据え置く）。
--   参加メンバーとセンターは「参加メンバー → センター → フォーメーション」の
--   段階順に合わせ、p_credits と p_formation_rows の間へ挿入する。
--
-- デプロイ時の非互換期間（既知・許容する）:
--   本 migration は旧アプリと互換性が無い。`supabase db push` は保留中の
--   migration を全件適用し、特定 version で止める手段が無いため、
--   「migration を先に適用し、アプリのデプロイ完了までの数分間は旧アプリが
--   動いている」状態が必ず生じる。その間、旧アプリでは
--   - 楽曲の作成・更新: 旧シグネチャの RPC を解決できず失敗する
--   - 楽曲詳細 / メンバー詳細 / リリース詳細の閲覧: is_center 列が無く失敗する
--   データ破壊は起きず、アプリのデプロイ完了で解消する。
--   038 / 043 / 056 も同じ割り切りで v2 RPC のシグネチャを変更している。
--   断絶をゼロにするには expand/contract を2つのPRへ分ける必要があるが、
--   オーナー1人が push とデプロイを続けて実行する運用のため、本Issueでは
--   この窓を許容する（#426 の実装Decision）。
--
-- RLS/Policy:
--   グローバルテーブルの標準パターン（045/046、061 と同じ）。
--   SELECT = has_orbit_read_role() / INSERT・UPDATE・DELETE = is_orbit_admin()。
--
-- ロールバック方針:
--   1. ALTER TABLE public.orbit_track_formation_members
--        ADD COLUMN is_center BOOLEAN NOT NULL DEFAULT false;
--   2. orbit_track_members.is_center から is_center を復元する:
--        UPDATE public.orbit_track_formation_members AS fm
--        SET is_center = true
--        FROM public.orbit_track_formation_rows AS fr
--        JOIN public.orbit_track_formations AS f ON f.id = fr.formation_id
--        JOIN public.orbit_track_members AS tm
--          ON tm.track_id = f.track_id AND tm.is_center
--        WHERE fm.formation_row_id = fr.id
--          AND fr.row_number = 1
--          AND fm.member_id = tm.member_id;
--   3. 039_add_formation_center.sql の set_track_centers 定義を再適用する。
--   4. 本ファイルの RPC 3本を、それぞれ元の定義で再適用する
--      （update_track_with_relations = 038、update_track_with_relations_v2 = 056、
--       create_track_with_relations_v2 = 043。いずれも新シグネチャを
--       DROP してから旧シグネチャで CREATE する）。
--   5. DROP TABLE public.orbit_track_members;
-- ============================================================

-- ============================================================
-- (1) orbit_track_members
-- ============================================================
CREATE TABLE orbit_track_members (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- track_id は楽曲に従属するため CASCADE、member_id は他のメンバー参照
  -- （orbit_release_members / orbit_setlist_item_members /
  --  orbit_track_formation_members）と同じく RESTRICT にして、
  -- 参加登録が残っているメンバーの誤削除を防ぐ。
  track_id   UUID NOT NULL REFERENCES orbit_tracks (id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES orbit_members (id) ON DELETE RESTRICT,
  is_center  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (track_id, member_id)
);

-- track_id 側は UNIQUE (track_id, member_id) の先頭列で引けるため、
-- 追加が必要なのは member_id 側（メンバー詳細の参加楽曲・センター楽曲）。
CREATE INDEX idx_orbit_track_members_member_id
  ON orbit_track_members (member_id);

ALTER TABLE orbit_track_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_track_members_select" ON orbit_track_members FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_track_members_insert" ON orbit_track_members FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_track_members_update" ON orbit_track_members FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_track_members_delete" ON orbit_track_members FOR DELETE
  USING ((select public.is_orbit_admin()));

-- ============================================================
-- (2) backfill: 既存フォーメーションから参加メンバーとセンターを移す
-- ------------------------------------------------------------
-- - フォーメーションがある楽曲のみ対象。フォーメーションが無い楽曲は
--   空のままとし、リリース参加メンバーからの推測補完はしない（#425）。
-- - 同一メンバーが複数列に現れることは想定しないが、集約時に
--   BOOL_OR でセンター指定を落とさないようにする。
-- ============================================================
INSERT INTO orbit_track_members (track_id, member_id, is_center)
SELECT
  formations.track_id,
  formation_members.member_id,
  BOOL_OR(formation_members.is_center)
FROM orbit_track_formation_members AS formation_members
JOIN orbit_track_formation_rows AS formation_rows
  ON formation_rows.id = formation_members.formation_row_id
JOIN orbit_track_formations AS formations
  ON formations.id = formation_rows.formation_id
GROUP BY formations.track_id, formation_members.member_id;

-- backfill の件数・集合・センターが一致することを検証する。
-- 不一致があれば migration 自体を失敗させ、部分移行を残さない。
DO $$
DECLARE
  v_missing_pairs INT;
  v_extra_pairs INT;
  v_center_mismatch INT;
BEGIN
  WITH formation_pairs AS (
    SELECT DISTINCT
      formations.track_id,
      formation_members.member_id
    FROM orbit_track_formation_members AS formation_members
    JOIN orbit_track_formation_rows AS formation_rows
      ON formation_rows.id = formation_members.formation_row_id
    JOIN orbit_track_formations AS formations
      ON formations.id = formation_rows.formation_id
  )
  SELECT COUNT(*)
  INTO v_missing_pairs
  FROM formation_pairs
  WHERE NOT EXISTS (
    SELECT 1
    FROM orbit_track_members AS track_members
    WHERE track_members.track_id = formation_pairs.track_id
      AND track_members.member_id = formation_pairs.member_id
  );

  WITH formation_pairs AS (
    SELECT DISTINCT
      formations.track_id,
      formation_members.member_id
    FROM orbit_track_formation_members AS formation_members
    JOIN orbit_track_formation_rows AS formation_rows
      ON formation_rows.id = formation_members.formation_row_id
    JOIN orbit_track_formations AS formations
      ON formations.id = formation_rows.formation_id
  )
  SELECT COUNT(*)
  INTO v_extra_pairs
  FROM orbit_track_members AS track_members
  WHERE NOT EXISTS (
    SELECT 1
    FROM formation_pairs
    WHERE formation_pairs.track_id = track_members.track_id
      AND formation_pairs.member_id = track_members.member_id
  );

  WITH formation_centers AS (
    SELECT DISTINCT
      formations.track_id,
      formation_members.member_id
    FROM orbit_track_formation_members AS formation_members
    JOIN orbit_track_formation_rows AS formation_rows
      ON formation_rows.id = formation_members.formation_row_id
    JOIN orbit_track_formations AS formations
      ON formations.id = formation_rows.formation_id
    WHERE formation_members.is_center
  ),
  member_centers AS (
    SELECT track_id, member_id
    FROM orbit_track_members
    WHERE is_center
  )
  SELECT COUNT(*)
  INTO v_center_mismatch
  FROM (
    (
      SELECT track_id, member_id FROM formation_centers
      EXCEPT
      SELECT track_id, member_id FROM member_centers
    )
    UNION ALL
    (
      SELECT track_id, member_id FROM member_centers
      EXCEPT
      SELECT track_id, member_id FROM formation_centers
    )
  ) AS mismatched;

  IF v_missing_pairs <> 0 OR v_extra_pairs <> 0 OR v_center_mismatch <> 0 THEN
    RAISE EXCEPTION
      'orbit_track_members backfill mismatch (missing=%, extra=%, center=%)',
      v_missing_pairs, v_extra_pairs, v_center_mismatch;
  END IF;
END;
$$;

-- ============================================================
-- (3) 楽曲RPCの差し替え
-- ------------------------------------------------------------
-- 依存順に DROP する（create_v2 → update_v2 → base）。
-- ============================================================
DROP FUNCTION IF EXISTS public.create_track_with_relations_v2(
  TEXT, UUID, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.update_track_with_relations_v2(
  UUID, TEXT, UUID, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.update_track_with_relations(
  UUID, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB
);

-- ------------------------------------------------------------
-- 3-1) base: 038 の定義をベースに、参加メンバー・センターの保存と
--      不変条件の検証を追加し、リリース参加者のハード制約を撤去する。
-- ------------------------------------------------------------
CREATE FUNCTION public.update_track_with_relations(
  p_track_id UUID,
  p_title TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_track_member_ids JSONB,
  p_center_member_ids JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_costumes JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_formation_id UUID;
  v_director_person_id UUID;
  v_mv_url TEXT;
  v_mv_director_name TEXT;
  v_mv_location TEXT;
  v_mv_published_on DATE;
  v_mv_memo TEXT;
  v_center_count INT;
BEGIN
  UPDATE public.orbit_tracks
  SET
    title = p_title
  WHERE id = p_track_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'track not found: %', p_track_id USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.orbit_release_tracks
  WHERE track_id = p_track_id;

  INSERT INTO public.orbit_release_tracks (
    track_id,
    release_id,
    track_number
  )
  SELECT
    p_track_id,
    link.release_id,
    link.track_number
  FROM (
    SELECT
      (item->>'releaseId')::UUID AS release_id,
      (item->>'trackNumber')::INT AS track_number,
      ord
    FROM jsonb_array_elements(COALESCE(p_release_links, '[]'::JSONB)) WITH ORDINALITY AS link(item, ord)
  ) AS link
  ORDER BY link.ord;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orbit_release_tracks
    WHERE track_id = p_track_id
  ) THEN
    RAISE EXCEPTION 'track must have at least one release link: %', p_track_id USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.orbit_track_credits
  WHERE track_id = p_track_id;

  INSERT INTO public.orbit_people (display_name)
  SELECT DISTINCT credit.person_name
  FROM (
    SELECT NULLIF(BTRIM(item->>'personName'), '') AS person_name
    FROM jsonb_array_elements(COALESCE(p_credits, '[]'::JSONB)) AS credits(item)
  ) AS credit
  WHERE credit.person_name IS NOT NULL
  ON CONFLICT (display_name) DO NOTHING;

  INSERT INTO public.orbit_track_credits (
    track_id,
    credit_role,
    person_id,
    sort_order
  )
  SELECT
    p_track_id,
    (credit.item->>'role')::TEXT,
    people.id,
    COALESCE((credit.item->>'sortOrder')::INT, (credit.ord - 1)::INT)
  FROM jsonb_array_elements(COALESCE(p_credits, '[]'::JSONB)) WITH ORDINALITY AS credit(item, ord)
  JOIN public.orbit_people people
    ON people.display_name = NULLIF(BTRIM(credit.item->>'personName'), '')
  WHERE NULLIF(BTRIM(credit.item->>'personName'), '') IS NOT NULL
  ORDER BY credit.ord;

  -- ------------------------------------------------------------
  -- 参加メンバーとセンター（正典）
  -- フォーメーションの有無に関わらず保存できる。センターは参加メンバー内の
  -- 最大2人（Wセンター可）に限定する。
  -- ------------------------------------------------------------
  SELECT COUNT(DISTINCT center.value)
  INTO v_center_count
  FROM jsonb_array_elements_text(COALESCE(p_center_member_ids, '[]'::JSONB)) AS center(value);

  IF v_center_count > 2 THEN
    RAISE EXCEPTION 'track centers must be at most 2: %', p_track_id USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(p_center_member_ids, '[]'::JSONB)) AS center(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(p_track_member_ids, '[]'::JSONB)) AS member(value)
      WHERE (member.value)::UUID = (center.value)::UUID
    )
  ) THEN
    RAISE EXCEPTION 'track centers must be track members: %', p_track_id USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.orbit_track_members
  WHERE track_id = p_track_id;

  INSERT INTO public.orbit_track_members (
    track_id,
    member_id,
    is_center
  )
  SELECT
    p_track_id,
    member.member_id,
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(p_center_member_ids, '[]'::JSONB)) AS center(value)
      WHERE (center.value)::UUID = member.member_id
    )
  FROM (
    SELECT DISTINCT (value)::UUID AS member_id
    FROM jsonb_array_elements_text(COALESCE(p_track_member_ids, '[]'::JSONB)) AS members(value)
  ) AS member;

  DELETE FROM public.orbit_track_formations
  WHERE track_id = p_track_id;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB))
  ) THEN
    -- フォーメーションがある場合、全列のメンバー集合と参加メンバー集合を
    -- 完全一致させる。部分集合は「未配置」と「入力漏れ」を区別できないため
    -- 許可しない（#425 / ADR 0007 2026-07-24改訂）。
    IF EXISTS (
      WITH assigned_members AS (
        SELECT DISTINCT (member.member_id_text)::UUID AS member_id
        FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB)) AS formation_row(item)
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(formation_row.item->'memberIds', '[]'::JSONB)
        ) AS member(member_id_text)
      ),
      track_members AS (
        SELECT DISTINCT (value)::UUID AS member_id
        FROM jsonb_array_elements_text(COALESCE(p_track_member_ids, '[]'::JSONB)) AS members(value)
      )
      SELECT 1
      FROM assigned_members
      FULL OUTER JOIN track_members
        ON track_members.member_id = assigned_members.member_id
      WHERE assigned_members.member_id IS NULL
         OR track_members.member_id IS NULL
    ) THEN
      RAISE EXCEPTION 'formation members must exactly match track members: %', p_track_id USING ERRCODE = '23514';
    END IF;

    -- センターはフォーメーションがある場合のみ、1列目に含まれることを必須とする。
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(COALESCE(p_center_member_ids, '[]'::JSONB)) AS center(value)
      WHERE NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB)) WITH ORDINALITY AS formation_row(item, ord)
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(formation_row.item->'memberIds', '[]'::JSONB)
        ) AS member(member_id_text)
        WHERE COALESCE((formation_row.item->>'rowNumber')::INT, formation_row.ord::INT) = 1
          AND (member.member_id_text)::UUID = (center.value)::UUID
      )
    ) THEN
      RAISE EXCEPTION 'track centers must be in the first formation row: %', p_track_id USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.orbit_track_formations (
      track_id,
      column_count
    )
    VALUES (
      p_track_id,
      (
        SELECT COUNT(*)
        FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB))
      )
    )
    RETURNING id INTO v_formation_id;

    WITH rows AS (
      SELECT
        COALESCE((row.item->>'rowNumber')::INT, row.ord::INT) AS row_number,
        COALESCE((row.item->>'memberCount')::INT, 0) AS member_count,
        COALESCE(row.item->'memberIds', '[]'::JSONB) AS member_ids
      FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB)) WITH ORDINALITY AS row(item, ord)
    ),
    inserted_rows AS (
      INSERT INTO public.orbit_track_formation_rows (
        formation_id,
        row_number,
        member_count
      )
      SELECT
        v_formation_id,
        rows.row_number,
        rows.member_count
      FROM rows
      RETURNING id, row_number
    ),
    member_items AS (
      SELECT
        rows.row_number,
        (member.member_id_text)::UUID AS member_id,
        (member.ord - 1)::INT AS slot_order
      FROM rows
      CROSS JOIN LATERAL jsonb_array_elements_text(rows.member_ids) WITH ORDINALITY AS member(member_id_text, ord)
    )
    INSERT INTO public.orbit_track_formation_members (
      formation_row_id,
      member_id,
      slot_order
    )
    SELECT
      inserted_rows.id,
      member_items.member_id,
      member_items.slot_order
    FROM member_items
    JOIN inserted_rows
      ON inserted_rows.row_number = member_items.row_number;
  END IF;

  v_mv_url := NULL;
  v_mv_director_name := NULL;
  v_mv_location := NULL;
  v_mv_published_on := NULL;
  v_mv_memo := NULL;

  IF p_mv IS NOT NULL THEN
    v_mv_url := NULLIF(BTRIM(COALESCE(p_mv->>'url', '')), '');
    v_mv_director_name := NULLIF(BTRIM(COALESCE(p_mv->>'directorName', '')), '');
    v_mv_location := NULLIF(BTRIM(COALESCE(p_mv->>'location', '')), '');
    v_mv_memo := NULLIF(BTRIM(COALESCE(p_mv->>'memo', '')), '');

    IF NULLIF(BTRIM(COALESCE(p_mv->>'publishedOn', '')), '') IS NOT NULL THEN
      v_mv_published_on := (p_mv->>'publishedOn')::DATE;
    END IF;
  END IF;

  IF v_mv_url IS NULL
    AND v_mv_director_name IS NULL
    AND v_mv_location IS NULL
    AND v_mv_published_on IS NULL
    AND v_mv_memo IS NULL
  THEN
    DELETE FROM public.orbit_track_mvs
    WHERE track_id = p_track_id;
  ELSE
    IF v_mv_director_name IS NOT NULL THEN
      INSERT INTO public.orbit_people (display_name)
      VALUES (v_mv_director_name)
      ON CONFLICT (display_name) DO NOTHING;

      SELECT id
      INTO v_director_person_id
      FROM public.orbit_people
      WHERE display_name = v_mv_director_name;
    ELSE
      v_director_person_id := NULL;
    END IF;

    INSERT INTO public.orbit_track_mvs (
      track_id,
      mv_url,
      director_person_id,
      location,
      published_on,
      memo
    )
    VALUES (
      p_track_id,
      COALESCE(v_mv_url, ''),
      v_director_person_id,
      v_mv_location,
      v_mv_published_on,
      v_mv_memo
    )
    ON CONFLICT (track_id) DO UPDATE
    SET
      mv_url = EXCLUDED.mv_url,
      director_person_id = EXCLUDED.director_person_id,
      location = EXCLUDED.location,
      published_on = EXCLUDED.published_on,
      memo = EXCLUDED.memo;
  END IF;

  DELETE FROM public.orbit_track_costumes
  WHERE track_id = p_track_id;

  INSERT INTO public.orbit_people (display_name)
  SELECT DISTINCT costume.stylist_name
  FROM (
    SELECT NULLIF(BTRIM(item->>'stylistName'), '') AS stylist_name
    FROM jsonb_array_elements(COALESCE(p_costumes, '[]'::JSONB)) AS costumes(item)
  ) AS costume
  WHERE costume.stylist_name IS NOT NULL
  ON CONFLICT (display_name) DO NOTHING;

  INSERT INTO public.orbit_track_costumes (
    track_id,
    stylist_person_id,
    image_path,
    note,
    sort_order
  )
  SELECT
    p_track_id,
    people.id,
    costume.image_path,
    costume.note,
    costume.sort_order
  FROM (
    SELECT
      (ord - 1)::INT AS sort_order,
      NULLIF(BTRIM(item->>'stylistName'), '') AS stylist_name,
      NULLIF(BTRIM(item->>'imagePath'), '') AS image_path,
      NULLIF(BTRIM(item->>'note'), '') AS note
    FROM jsonb_array_elements(COALESCE(p_costumes, '[]'::JSONB)) WITH ORDINALITY AS costumes(item, ord)
  ) AS costume
  JOIN public.orbit_people people
    ON people.display_name = costume.stylist_name
  WHERE costume.stylist_name IS NOT NULL
    AND costume.image_path IS NOT NULL
  ORDER BY costume.sort_order;
END;
$$;

-- ------------------------------------------------------------
-- 3-2) v2 update: 056 の定義をベースに、参加メンバー・センターを base へ委譲する。
--      orbit_track_videos の (video_type, video_url) 自然キー差分更新（056）は
--      そのまま維持する。
-- ------------------------------------------------------------
CREATE FUNCTION public.update_track_with_relations_v2(
  p_track_id UUID,
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_track_member_ids JSONB,
  p_center_member_ids JSONB,
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
    p_track_member_ids,
    p_center_member_ids,
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

-- ------------------------------------------------------------
-- 3-3) v2 create: 043 の定義をベースに、参加メンバー・センターを update_v2 へ委譲する。
-- ------------------------------------------------------------
CREATE FUNCTION public.create_track_with_relations_v2(
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_track_member_ids JSONB,
  p_center_member_ids JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
  p_videos JSONB,
  p_costumes JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_track_id UUID;
BEGIN
  INSERT INTO public.orbit_tracks (
    title,
    group_id
  )
  VALUES (
    p_title,
    p_group_id
  )
  RETURNING id INTO v_track_id;

  PERFORM public.update_track_with_relations_v2(
    v_track_id,
    p_title,
    p_group_id,
    p_label,
    p_generation,
    p_release_links,
    p_credits,
    p_track_member_ids,
    p_center_member_ids,
    p_formation_rows,
    p_mv,
    p_videos,
    p_costumes
  );

  RETURN v_track_id;
END;
$$;

-- ============================================================
-- (4) センターの旧正典を撤去する
-- ------------------------------------------------------------
-- backfill（2）と新RPC（3）でセンターの正典が orbit_track_members.is_center へ
-- 移ったため、旧正典を残すと二重保持になる。新RPCはフォーメーション行へ
-- is_center を書かないので、列を残しても以後は更新されない。
-- ============================================================
DROP FUNCTION IF EXISTS public.set_track_centers(UUID, JSONB);

ALTER TABLE orbit_track_formation_members
  DROP COLUMN is_center;
