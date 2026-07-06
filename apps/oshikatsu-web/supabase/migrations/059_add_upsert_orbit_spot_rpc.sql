-- ============================================================
-- 059: upsert_orbit_spot RPC の追加（#289）
-- ------------------------------------------------------------
-- 目的:
--   スポットの create / update は spots + appearances + members + photos +
--   subtypes を複数リクエストで書き込んでおり、途中失敗の被害は
--   「新規挿入→旧削除」の順序化と補償削除で限定していたが（PR #288/#297
--   セルフレビュー）、コードベースの既存方針（012/015/022/031/052）に合わせ
--   1トランザクションの RPC に統合して部分状態を根絶する。
--
-- 変更内容:
--   upsert_orbit_spot(p_id, p_payload) を新設。
--   - p_id が NULL なら INSERT、非 NULL なら UPDATE + 子テーブル再構築
--   - サブ種別は (source_type, name) の find-or-create（ON CONFLICT）
--   - 出典FKは source_type に対応する1本だけを書き込む（アプリ層の
--     validateSpot / toAppearanceRow と同じ多層防御をDB側でも維持）
--   - SECURITY INVOKER（既定）のため RLS はそのまま適用される
--     （書き込みは is_orbit_admin のポリシーが担保）
--
-- payload 形式（repository が CreateSpotInput から構築。検証済み前提）:
--   {
--     "name": "...", "description": "", "latitude": 35.6, "longitude": 139.7,
--     "address": "", "prefecture": "", "google_place_id": "", "google_maps_url": "",
--     "appearances": [{
--       "source_type": "mv", "group_id": "uuid", "subtype_name": "",
--       "track_id": "", "video_id": "", "event_id": "", "live_id": "",
--       "note": "", "link_url": "", "member_ids": ["uuid", ...]
--     }, ...],
--     "photos": [{ "image_path": "spots/...", "caption": "" }, ...]
--   }
--
-- ロールバック方針:
--   DROP FUNCTION public.upsert_orbit_spot(UUID, JSONB);
--   （repository を PR #299 時点の逐次書き込み実装に戻す）
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_orbit_spot(
  p_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_spot_id        UUID;
  v_appearance     JSONB;
  v_appearance_id  UUID;
  v_source_type    TEXT;
  v_subtype_name   TEXT;
  v_subtype_id     UUID;
  v_member_id      TEXT;
  v_photo          JSONB;
  v_photo_sort     INT := 0;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.orbit_spots (
      name, description, latitude, longitude,
      address, prefecture, google_place_id, google_maps_url
    )
    VALUES (
      p_payload->>'name',
      NULLIF(p_payload->>'description', ''),
      (p_payload->>'latitude')::double precision,
      (p_payload->>'longitude')::double precision,
      NULLIF(p_payload->>'address', ''),
      NULLIF(p_payload->>'prefecture', ''),
      NULLIF(p_payload->>'google_place_id', ''),
      NULLIF(p_payload->>'google_maps_url', '')
    )
    RETURNING id INTO v_spot_id;
  ELSE
    v_spot_id := p_id;
    UPDATE public.orbit_spots
    SET name = p_payload->>'name',
        description = NULLIF(p_payload->>'description', ''),
        latitude = (p_payload->>'latitude')::double precision,
        longitude = (p_payload->>'longitude')::double precision,
        address = NULLIF(p_payload->>'address', ''),
        prefecture = NULLIF(p_payload->>'prefecture', ''),
        google_place_id = NULLIF(p_payload->>'google_place_id', ''),
        google_maps_url = NULLIF(p_payload->>'google_maps_url', '')
    WHERE id = v_spot_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'orbit_spot not found: %', v_spot_id USING ERRCODE = 'P0002';
    END IF;

    -- 子データはトランザクション内で作り直す（members は appearances の
    -- ON DELETE CASCADE で連動削除。1トランザクションのため
    -- アプリ実装で必要だった「新規挿入→旧削除」の順序配慮は不要）。
    DELETE FROM public.orbit_spot_appearances WHERE spot_id = v_spot_id;
    DELETE FROM public.orbit_spot_photos WHERE spot_id = v_spot_id;
  END IF;

  FOR v_appearance IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'appearances', '[]'::jsonb))
  LOOP
    v_source_type := v_appearance->>'source_type';
    v_subtype_name := NULLIF(BTRIM(COALESCE(v_appearance->>'subtype_name', '')), '');

    -- サブ種別の find-or-create（(source_type, name) 一意）。
    -- DO UPDATE の no-op 更新により、既存行でも RETURNING で id が返る。
    v_subtype_id := NULL;
    IF v_subtype_name IS NOT NULL THEN
      INSERT INTO public.orbit_spot_source_subtypes (source_type, name)
      VALUES (v_source_type, v_subtype_name)
      ON CONFLICT (source_type, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO v_subtype_id;
    END IF;

    INSERT INTO public.orbit_spot_appearances (
      spot_id, source_type, group_id, subtype_id,
      track_id, video_id, event_id, live_id,
      note, link_url
    )
    VALUES (
      v_spot_id,
      v_source_type,
      NULLIF(v_appearance->>'group_id', '')::uuid,
      v_subtype_id,
      -- 出典FKは source_type に対応する1本だけを書く（多層防御）
      CASE WHEN v_source_type = 'mv'
        THEN NULLIF(v_appearance->>'track_id', '')::uuid ELSE NULL END,
      CASE WHEN v_source_type = 'video'
        THEN NULLIF(v_appearance->>'video_id', '')::uuid ELSE NULL END,
      CASE WHEN v_source_type = 'event'
        THEN NULLIF(v_appearance->>'event_id', '')::uuid ELSE NULL END,
      CASE WHEN v_source_type = 'live'
        THEN NULLIF(v_appearance->>'live_id', '')::uuid ELSE NULL END,
      NULLIF(v_appearance->>'note', ''),
      NULLIF(v_appearance->>'link_url', '')
    )
    RETURNING id INTO v_appearance_id;

    FOR v_member_id IN
      SELECT * FROM jsonb_array_elements_text(COALESCE(v_appearance->'member_ids', '[]'::jsonb))
    LOOP
      IF v_member_id <> '' THEN
        INSERT INTO public.orbit_spot_appearance_members (appearance_id, member_id)
        VALUES (v_appearance_id, v_member_id::uuid);
      END IF;
    END LOOP;
  END LOOP;

  v_photo_sort := 0;
  FOR v_photo IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'photos', '[]'::jsonb))
  LOOP
    INSERT INTO public.orbit_spot_photos (spot_id, image_path, caption, sort_order)
    VALUES (
      v_spot_id,
      v_photo->>'image_path',
      NULLIF(v_photo->>'caption', ''),
      v_photo_sort
    );
    v_photo_sort := v_photo_sort + 1;
  END LOOP;

  RETURN v_spot_id;
END;
$$;
