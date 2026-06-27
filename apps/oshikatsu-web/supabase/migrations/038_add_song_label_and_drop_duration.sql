-- ============================================================
-- 038: 楽曲にラベル/期を追加し、duration_seconds を廃止
-- ------------------------------------------------------------
-- - orbit_tracks に label / generation 列を追加
--   label: title/senbatsu/under/solo/unit/generation（任意）
--   generation: label = 'generation' のときのみ非NULL
-- - duration_seconds 列と関連RPCの duration 引数を撤去
-- ============================================================

-- 1) 列追加 + 制約
ALTER TABLE public.orbit_tracks
  ADD COLUMN IF NOT EXISTS label TEXT,
  ADD COLUMN IF NOT EXISTS generation TEXT;

ALTER TABLE public.orbit_tracks
  DROP CONSTRAINT IF EXISTS orbit_tracks_label_check;
ALTER TABLE public.orbit_tracks
  ADD CONSTRAINT orbit_tracks_label_check CHECK (
    label IS NULL
    OR label IN ('title', 'senbatsu', 'under', 'solo', 'unit', 'generation')
  );

ALTER TABLE public.orbit_tracks
  DROP CONSTRAINT IF EXISTS orbit_tracks_generation_rule;
ALTER TABLE public.orbit_tracks
  ADD CONSTRAINT orbit_tracks_generation_rule CHECK (
    (COALESCE(label, '') = 'generation' AND generation IS NOT NULL)
    OR (COALESCE(label, '') <> 'generation' AND generation IS NULL)
  );

-- 2) duration を参照する旧RPCを差し替え
DROP FUNCTION IF EXISTS public.create_track_with_relations(
  TEXT, INT, JSONB, JSONB, JSONB, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.create_track_with_relations_v2(
  TEXT, UUID, INT, JSONB, JSONB, JSONB, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.update_track_with_relations_v2(
  UUID, TEXT, UUID, INT, JSONB, JSONB, JSONB, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.update_track_with_relations(
  UUID, TEXT, INT, JSONB, JSONB, JSONB, JSONB, JSONB
);

-- 2-1) base: 楽曲のスカラー更新 + 関連の総入れ替え（duration を撤去）
CREATE FUNCTION public.update_track_with_relations(
  p_track_id UUID,
  p_title TEXT,
  p_release_links JSONB,
  p_credits JSONB,
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

  DELETE FROM public.orbit_track_formations
  WHERE track_id = p_track_id;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB))
  ) THEN
    IF EXISTS (
      WITH assigned_members AS (
        SELECT DISTINCT (member.member_id_text)::UUID AS member_id
        FROM jsonb_array_elements(COALESCE(p_formation_rows, '[]'::JSONB)) AS formation_row(item)
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(formation_row.item->'memberIds', '[]'::JSONB)
        ) AS member(member_id_text)
      ),
      allowed_members AS (
        SELECT DISTINCT rm.member_id
        FROM public.orbit_release_members rm
        JOIN public.orbit_release_tracks rt
          ON rt.release_id = rm.release_id
        WHERE rt.track_id = p_track_id
      )
      SELECT 1
      FROM assigned_members assigned
      LEFT JOIN allowed_members allowed
        ON allowed.member_id = assigned.member_id
      WHERE allowed.member_id IS NULL
    ) THEN
      RAISE EXCEPTION 'formation includes non-participant members' USING ERRCODE = '23514';
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

-- 2-2) v2 update: group_id / label / generation を設定して base へ委譲
CREATE FUNCTION public.update_track_with_relations_v2(
  p_track_id UUID,
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
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
END;
$$;

-- 2-3) v2 create: 楽曲を作成して update_v2 へ委譲
CREATE FUNCTION public.create_track_with_relations_v2(
  p_title TEXT,
  p_group_id UUID,
  p_label TEXT,
  p_generation TEXT,
  p_release_links JSONB,
  p_credits JSONB,
  p_formation_rows JSONB,
  p_mv JSONB,
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
    p_formation_rows,
    p_mv,
    p_costumes
  );

  RETURN v_track_id;
END;
$$;

-- 3) duration_seconds 列を削除
ALTER TABLE public.orbit_tracks
  DROP COLUMN IF EXISTS duration_seconds;
