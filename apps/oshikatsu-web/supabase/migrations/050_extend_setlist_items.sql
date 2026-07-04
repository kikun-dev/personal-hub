-- ============================================================
-- 050: セットリストのデータモデル拡張（#260）
-- ------------------------------------------------------------
-- 目的:
--   セットリスト項目（orbit_setlist_items）に、アンコール区分・
--   複数披露タイプ・衣装メモを追加し、item_type にダンストラック/
--   オーバーチュアを追加する。あわせて、セトリ楽曲ごとのフォーメーション
--   （公演×曲で一意）を保持する2テーブルを新設する。
--   020（orbit_track_formations 系）と異なり、セトリのフォーメーションは
--   曲マスタ単位ではなく「この公演のこの曲」単位で一意なため、
--   formations 中間テーブルは作らず、行テーブル（*_formation_rows）を
--   orbit_setlist_items 直下に置く2テーブル構成にする（Issue #260 Decision）。
--
-- 変更内容:
--   (1) orbit_setlist_items の拡張（すべて additive）
--       - section（アンコール区分。デフォルト 'main'）
--       - performance_styles（披露タイプの配列。033 の performance_style
--         単一値を置き換える新カラム。既存の非NULL値は
--         ARRAY[performance_style] で backfill する）
--       - costume_note（衣装メモ）
--       - item_type CHECK に dance_track / overture を追加
--   (2) orbit_setlist_item_formation_rows / _members の新設
--       （020 の orbit_track_formation_rows / _members と同形式。
--       中間テーブル無しで setlist_item_id 直下に rows を持つ点のみ異なる）
--   (3) upsert_orbit_live の拡張（048 の定義をベースに拡張。シグネチャ不変）
--
-- 旧 performance_style 列について:
--   当面削除しない。033 で追加された単一値カラムで、backfill 済み・
--   新コードは参照しない想定（新規参照は performance_styles のみ）。
--   デプロイ切替期間中の後方互換のため、RPC からは
--   performance_styles の先頭要素（無ければ NULL）を書き込み続ける。
--   旧列の CHECK 制約（'full','one_half','interlude_long','other'）は
--   そのまま残るため、performance_styles にこの4値以外を入れる場合は
--   旧列への書き込みが CHECK 違反になる点に注意（先に旧列を撤去する
--   フォローアップ Issue で対応する）。
--   フォローアップで新コードの参照が無いことを確認した上で
--   別 migration で DROP COLUMN performance_style する。
--
-- ロールバック方針:
--   1. upsert_orbit_live を 048_preserve_performance_ids_in_upsert.sql の
--      CREATE OR REPLACE FUNCTION 定義で再適用する。
--   2. DROP TABLE orbit_setlist_item_formation_members;
--      DROP TABLE orbit_setlist_item_formation_rows;
--      （ポリシー・インデックスはテーブル削除で同時に消える）
--   3. ALTER TABLE orbit_setlist_items
--        DROP COLUMN section,
--        DROP COLUMN performance_styles,
--        DROP COLUMN costume_note;
--      item_type CHECK は本 migration が DROP した旧制約名
--      （orbit_setlist_items_item_type_check）と同じ名前で、
--      032 時点の値集合 ('song','mc','shadow_announcement','vtr','other')
--      に戻して再作成する。
-- ============================================================

-- ============================================================
-- (1) orbit_setlist_items の拡張
-- ============================================================
ALTER TABLE orbit_setlist_items
  ADD COLUMN section TEXT NOT NULL DEFAULT 'main'
    CHECK (section IN ('main', 'encore', 'double_encore', 'triple_encore')),
  ADD COLUMN performance_styles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN costume_note TEXT;

-- 既存の performance_style（単一値）を performance_styles（配列）へ backfill する。
-- NULL の行は対象外（デフォルトの空配列のまま）。
UPDATE orbit_setlist_items
SET performance_styles = ARRAY[performance_style]
WHERE performance_style IS NOT NULL;

-- item_type の CHECK 制約を拡張する。
-- 032 で inline CHECK として定義されたため、制約名は Postgres の自動生成規則
-- （<table>_<column>_check）により orbit_setlist_items_item_type_check になる
-- （033/034/048 のいずれもこの制約に変更を加えておらず、リネームもされていない。
-- 本 migration 作成時に migrations 全文を確認して確定した）。
ALTER TABLE orbit_setlist_items
  DROP CONSTRAINT orbit_setlist_items_item_type_check;

ALTER TABLE orbit_setlist_items
  ADD CONSTRAINT orbit_setlist_items_item_type_check
  CHECK (item_type IN ('song', 'mc', 'shadow_announcement', 'vtr', 'dance_track', 'overture', 'other'));

-- ============================================================
-- (2) セトリ楽曲のフォーメーション（020 の形式を踏襲。中間テーブル無し）
-- ============================================================
CREATE TABLE orbit_setlist_item_formation_rows (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_item_id   UUID NOT NULL REFERENCES orbit_setlist_items(id) ON DELETE CASCADE,
  row_number        INT NOT NULL CHECK (row_number > 0),
  member_count      INT NOT NULL CHECK (member_count >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_setlist_item_formation_rows_unique
  ON orbit_setlist_item_formation_rows (setlist_item_id, row_number);
CREATE INDEX idx_orbit_setlist_item_formation_rows_setlist_item_id
  ON orbit_setlist_item_formation_rows (setlist_item_id);

CREATE TABLE orbit_setlist_item_formation_members (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  formation_row_id  UUID NOT NULL REFERENCES orbit_setlist_item_formation_rows(id) ON DELETE CASCADE,
  member_id         UUID NOT NULL REFERENCES orbit_members(id) ON DELETE RESTRICT,
  slot_order        INT NOT NULL CHECK (slot_order >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orbit_setlist_item_formation_members_unique_slot
  ON orbit_setlist_item_formation_members (formation_row_id, slot_order);
CREATE UNIQUE INDEX idx_orbit_setlist_item_formation_members_unique_member_in_row
  ON orbit_setlist_item_formation_members (formation_row_id, member_id);
CREATE INDEX idx_orbit_setlist_item_formation_members_member_id
  ON orbit_setlist_item_formation_members (member_id);

-- RLS: グローバルテーブルの標準パターン（045/046）。
-- select = has_orbit_read_role() / insert・update・delete = is_orbit_admin()
ALTER TABLE orbit_setlist_item_formation_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_setlist_item_formation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_setlist_item_formation_rows_select" ON orbit_setlist_item_formation_rows FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_setlist_item_formation_rows_insert" ON orbit_setlist_item_formation_rows FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_setlist_item_formation_rows_update" ON orbit_setlist_item_formation_rows FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_setlist_item_formation_rows_delete" ON orbit_setlist_item_formation_rows FOR DELETE
  USING ((select public.is_orbit_admin()));

CREATE POLICY "orbit_setlist_item_formation_members_select" ON orbit_setlist_item_formation_members FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_setlist_item_formation_members_insert" ON orbit_setlist_item_formation_members FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_setlist_item_formation_members_update" ON orbit_setlist_item_formation_members FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_setlist_item_formation_members_delete" ON orbit_setlist_item_formation_members FOR DELETE
  USING ((select public.is_orbit_admin()));

-- ============================================================
-- (3) upsert_orbit_live の拡張
-- ------------------------------------------------------------
-- 048_preserve_performance_ids_in_upsert.sql の定義をベースに、
-- setlist_items 部分にのみ以下を追加する（他は一切変更しない）:
--   - section: NULLIF(...,'') を 'main' にフォールバック
--   - performance_styles: 新 payload の配列を text[] に変換。
--     配列キーが無い旧 payload では単一値 performance_style を
--     1要素配列に変換（どちらも無ければ空配列）
--   - costume_note: NULLIF(...,'')
--   - 旧 performance_style 列: 新配列の先頭要素、無ければ旧 payload の
--     単一値を互換のため書き続ける（050 適用〜新アプリデプロイの間、
--     旧アプリの編集で披露タイプが失われないようにする）
--   - フォーメーション: v_item->'formation_rows'
--     （[{row_number, member_ids: [uuid,...]}, ...] 形式）から
--     orbit_setlist_item_formation_rows / _members へ INSERT する。
--     orbit_setlist_items は都度 DELETE→再構築されるため
--     （048 の子データ方針）、フォーメーションは ON DELETE CASCADE で
--     連動削除されたうえで、payload から再構築するのみでよい
--     （明示的な DELETE 文は不要）。
-- 旧 payload（section/performance_styles/costume_note/formation_rows を
-- 含まない）でも、COALESCE/NULLIF によりデフォルト値・空配列で
-- 壊れずに動作する。
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
  v_live_id              UUID;
  v_performance          JSONB;
  v_performance_id       UUID;
  v_keep_performance_ids UUID[];
  v_absence              JSONB;
  v_item                 JSONB;
  v_item_id              UUID;
  v_item_member          JSONB;
  v_formation_row        JSONB;
  v_formation_row_id     UUID;
  v_formation_member_id  TEXT;
  v_sort                 INT := 0;
  v_position              INT;
  v_member_sort            INT;
  v_slot_order             INT;
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

    -- 公演: payload に id が含まれない既存公演のみ削除する（全削除はしない。公演IDを維持するため）。
    -- payload に id が1つも含まれない場合、keep 対象は空配列になり既存公演は全て削除される
    -- （従来の全DELETE挙動と結果は同じ）。
    SELECT COALESCE(array_agg(NULLIF(perf->>'id', '')::uuid), ARRAY[]::uuid[])
    INTO v_keep_performance_ids
    FROM jsonb_array_elements(COALESCE(p_payload->'performances', '[]'::jsonb)) AS perf
    WHERE NULLIF(perf->>'id', '') IS NOT NULL;

    -- 参加記録（orbit_live_attendances）が残っている公演をここで削除しようとすると
    -- FK RESTRICT違反で例外になる（意図した挙動）。
    DELETE FROM public.orbit_live_performances
    WHERE live_id = v_live_id
      AND NOT (id = ANY (v_keep_performance_ids));

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
    v_performance_id := NULLIF(v_performance->>'id', '')::uuid;

    IF v_performance_id IS NULL THEN
      -- 新規公演
      INSERT INTO public.orbit_live_performances (
        live_id,
        venue_id,
        performance_date,
        doors_open_at,
        starts_at,
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
        COALESCE((v_performance->>'has_streaming')::boolean, false),
        COALESCE((v_performance->>'has_live_viewing')::boolean, false),
        NULLIF(v_performance->>'ticket_info', ''),
        NULLIF(v_performance->>'seat_info', ''),
        v_sort
      )
      RETURNING id INTO v_performance_id;
    ELSE
      -- 既存公演の更新（公演IDを維持する）。live_id条件により、
      -- 他ライブの公演IDを流用した改ざんを防ぐ。
      UPDATE public.orbit_live_performances
      SET venue_id = NULLIF(v_performance->>'venue_id', '')::uuid,
          performance_date = NULLIF(v_performance->>'performance_date', '')::date,
          doors_open_at = NULLIF(v_performance->>'doors_open_at', ''),
          starts_at = NULLIF(v_performance->>'starts_at', ''),
          has_streaming = COALESCE((v_performance->>'has_streaming')::boolean, false),
          has_live_viewing = COALESCE((v_performance->>'has_live_viewing')::boolean, false),
          ticket_info = NULLIF(v_performance->>'ticket_info', ''),
          seat_info = NULLIF(v_performance->>'seat_info', ''),
          sort_order = v_sort
      WHERE id = v_performance_id
        AND live_id = v_live_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'orbit_live_performance not found: %', v_performance_id;
      END IF;

      -- 子データ（ユーザーデータを持たない）は作り直す。
      -- orbit_setlist_item_members / orbit_setlist_item_formation_rows(_members) は
      -- orbit_setlist_items の削除で ON DELETE CASCADE により連動削除される。
      DELETE FROM public.orbit_live_performance_absences WHERE performance_id = v_performance_id;
      DELETE FROM public.orbit_setlist_items WHERE performance_id = v_performance_id;
    END IF;

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
        note,
        performance_style,
        section,
        performance_styles,
        costume_note
      )
      VALUES (
        v_performance_id,
        v_position,
        v_item->>'item_type',
        NULLIF(v_item->>'track_id', '')::uuid,
        NULLIF(v_item->>'song_title', ''),
        NULLIF(v_item->>'note', ''),
        -- 互換: 旧 performance_style 列には新配列の先頭要素、無ければ
        -- 旧 payload の performance_style（単一値）を書く。
        -- 050 適用〜新アプリデプロイの間、旧アプリの編集で披露タイプが
        -- 失われないようにするため（PR レビュー指摘）。
        COALESCE(
          NULLIF(v_item->'performance_styles'->>0, ''),
          NULLIF(v_item->>'performance_style', '')
        ),
        COALESCE(NULLIF(v_item->>'section', ''), 'main'),
        -- 新 performance_styles 列: 新 payload（配列）を優先し、
        -- 旧 payload（単一値）しか無ければ1要素配列に変換する
        CASE
          WHEN v_item ? 'performance_styles' THEN ARRAY(
            SELECT jsonb_array_elements_text(COALESCE(v_item->'performance_styles', '[]'::jsonb))
          )
          WHEN NULLIF(v_item->>'performance_style', '') IS NOT NULL
            THEN ARRAY[NULLIF(v_item->>'performance_style', '')]
          ELSE ARRAY[]::text[]
        END,
        NULLIF(v_item->>'costume_note', '')
      )
      RETURNING id INTO v_item_id;

      v_member_sort := 0;
      FOR v_item_member IN
        SELECT * FROM jsonb_array_elements(COALESCE(v_item->'members', '[]'::jsonb))
      LOOP
        IF COALESCE(v_item_member->>'member_id', '') <> '' THEN
          INSERT INTO public.orbit_setlist_item_members (
            setlist_item_id,
            member_id,
            is_center,
            sort_order
          )
          VALUES (
            v_item_id,
            (v_item_member->>'member_id')::uuid,
            COALESCE((v_item_member->>'is_center')::boolean, false),
            v_member_sort
          );
          v_member_sort := v_member_sort + 1;
        END IF;
      END LOOP;

      FOR v_formation_row IN
        SELECT * FROM jsonb_array_elements(COALESCE(v_item->'formation_rows', '[]'::jsonb))
      LOOP
        INSERT INTO public.orbit_setlist_item_formation_rows (
          setlist_item_id,
          row_number,
          member_count
        )
        VALUES (
          v_item_id,
          (v_formation_row->>'row_number')::int,
          jsonb_array_length(COALESCE(v_formation_row->'member_ids', '[]'::jsonb))
        )
        RETURNING id INTO v_formation_row_id;

        v_slot_order := 0;
        FOR v_formation_member_id IN
          SELECT * FROM jsonb_array_elements_text(COALESCE(v_formation_row->'member_ids', '[]'::jsonb))
        LOOP
          IF v_formation_member_id <> '' THEN
            INSERT INTO public.orbit_setlist_item_formation_members (
              formation_row_id,
              member_id,
              slot_order
            )
            VALUES (
              v_formation_row_id,
              v_formation_member_id::uuid,
              v_slot_order
            );
            v_slot_order := v_slot_order + 1;
          END IF;
        END LOOP;
      END LOOP;

      v_position := v_position + 1;
    END LOOP;

    v_sort := v_sort + 1;
  END LOOP;

  RETURN v_live_id;
END;
$$;
