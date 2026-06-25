-- ============================================================
-- 032: セットリスト基盤（#101）
-- 公演ごとのセットリスト項目（楽曲/MC/影アナ/VTR/その他）を順序つきで保持する。
-- 楽曲は orbit_tracks 参照（登録曲）または song_title テキスト（未登録曲）。
-- upsert_orbit_live RPC を拡張し、公演ごとのセットリストも 1 トランザクションで置換する。
-- ============================================================

CREATE TABLE orbit_setlist_items (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  performance_id  UUID NOT NULL REFERENCES orbit_live_performances(id) ON DELETE CASCADE,
  position        INT NOT NULL,
  item_type       TEXT NOT NULL
                  CHECK (item_type IN ('song', 'mc', 'shadow_announcement', 'vtr', 'other')),
  track_id        UUID REFERENCES orbit_tracks(id) ON DELETE RESTRICT,
  song_title      TEXT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orbit_setlist_items_performance_id
  ON orbit_setlist_items (performance_id);
CREATE INDEX idx_orbit_setlist_items_track_id
  ON orbit_setlist_items (track_id);

ALTER TABLE orbit_setlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_setlist_items_select" ON orbit_setlist_items FOR SELECT
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_setlist_items_insert" ON orbit_setlist_items FOR INSERT
  WITH CHECK ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_setlist_items_update" ON orbit_setlist_items FOR UPDATE
  USING ((select auth.role()) = 'authenticated');
CREATE POLICY "orbit_setlist_items_delete" ON orbit_setlist_items FOR DELETE
  USING ((select auth.role()) = 'authenticated');

-- ============================================================
-- upsert_orbit_live を拡張（公演ごとのセットリスト挿入を追加）
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_orbit_live(
  p_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_live_id        UUID;
  v_performance    JSONB;
  v_performance_id UUID;
  v_absence        JSONB;
  v_item           JSONB;
  v_sort           INT := 0;
  v_position       INT;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.orbit_lives (name, live_type, description)
    VALUES (
      p_payload->>'name',
      p_payload->>'live_type',
      NULLIF(p_payload->>'description', '')
    )
    RETURNING id INTO v_live_id;
  ELSE
    v_live_id := p_id;
    UPDATE public.orbit_lives
    SET name = p_payload->>'name',
        live_type = p_payload->>'live_type',
        description = NULLIF(p_payload->>'description', '')
    WHERE id = v_live_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'orbit_live not found: %', v_live_id;
    END IF;

    DELETE FROM public.orbit_live_performances WHERE live_id = v_live_id;
    DELETE FROM public.orbit_live_performer_groups WHERE live_id = v_live_id;
    DELETE FROM public.orbit_live_performer_members WHERE live_id = v_live_id;
  END IF;

  INSERT INTO public.orbit_live_performer_groups (live_id, group_id)
  SELECT v_live_id, value::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'performer_group_ids', '[]'::jsonb));

  INSERT INTO public.orbit_live_performer_members (live_id, member_id)
  SELECT v_live_id, value::uuid
  FROM jsonb_array_elements_text(COALESCE(p_payload->'performer_member_ids', '[]'::jsonb));

  FOR v_performance IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'performances', '[]'::jsonb))
  LOOP
    INSERT INTO public.orbit_live_performances (
      live_id,
      venue_id,
      performance_date,
      doors_open_at,
      starts_at,
      session_label,
      has_streaming,
      has_live_viewing,
      ticket_info,
      seat_info,
      sort_order
    )
    VALUES (
      v_live_id,
      NULLIF(v_performance->>'venue_id', '')::uuid,
      NULLIF(v_performance->>'performance_date', '')::date,
      NULLIF(v_performance->>'doors_open_at', ''),
      NULLIF(v_performance->>'starts_at', ''),
      NULLIF(v_performance->>'session_label', ''),
      COALESCE((v_performance->>'has_streaming')::boolean, false),
      COALESCE((v_performance->>'has_live_viewing')::boolean, false),
      NULLIF(v_performance->>'ticket_info', ''),
      NULLIF(v_performance->>'seat_info', ''),
      v_sort
    )
    RETURNING id INTO v_performance_id;

    FOR v_absence IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_performance->'absences', '[]'::jsonb))
    LOOP
      IF COALESCE(v_absence->>'member_id', '') <> '' THEN
        INSERT INTO public.orbit_live_performance_absences (performance_id, member_id, note)
        VALUES (
          v_performance_id,
          (v_absence->>'member_id')::uuid,
          NULLIF(v_absence->>'note', '')
        );
      END IF;
    END LOOP;

    v_position := 0;
    FOR v_item IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_performance->'setlist_items', '[]'::jsonb))
    LOOP
      INSERT INTO public.orbit_setlist_items (
        performance_id,
        position,
        item_type,
        track_id,
        song_title,
        note
      )
      VALUES (
        v_performance_id,
        v_position,
        v_item->>'item_type',
        NULLIF(v_item->>'track_id', '')::uuid,
        NULLIF(v_item->>'song_title', ''),
        NULLIF(v_item->>'note', '')
      );
      v_position := v_position + 1;
    END LOOP;

    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_live_id;
END;
$$;
