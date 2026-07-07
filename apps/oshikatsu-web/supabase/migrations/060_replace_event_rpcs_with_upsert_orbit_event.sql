-- ============================================================
-- 060: upsert_orbit_event RPC の追加、update_event_with_relations の廃止（#304）
-- ------------------------------------------------------------
-- 目的:
--   イベントの create は「event 挿入→groups 挿入→members 挿入」を複数
--   リクエストに分割し、途中失敗の被害は「作成したイベントを削除する」
--   補償削除で限定していた（repositories/eventRepository.ts の旧 create）。
--   update は既に 015/019 で update_event_with_relations にトランザクション
--   化済みだったが、create と update で書き込み経路が分かれていた。
--   スポットの create/update 統合（#289, migration 059）と同じ方式で
--   upsert_orbit_event(p_id, p_payload) に統合し、部分状態を根絶する。
--
-- 変更内容:
--   upsert_orbit_event(p_id, p_payload) を新設。
--   - p_id が NULL なら INSERT、非 NULL なら UPDATE + 子テーブル
--     （orbit_event_groups / orbit_event_members）を DELETE→再INSERT
--   - description は 015/019 と同じく COALESCE(..., '') で NOT NULL DEFAULT ''
--     の列に空文字を入れる（NULLIF は使わない。空文字→NULL変換をすると
--     既存の「description は常に空文字、NULLにはならない」挙動が変わって
--     しまうため。repositories/eventRepository.ts の旧 create の
--     `input.description || ""` と同じ結果になる）
--   - end_date / start_time / venue / url は NULLIF で空文字→NULLに変換
--     （旧実装の `input.endDate || null` 等と同じ結果）
--   - group_ids / member_ids は 015/019 と同じく DISTINCT で重複排除して
--     再挿入する
--   - update_event_with_relations（019 版, 12引数）を DROP FUNCTION で削除
--   - SECURITY INVOKER（既定）のため RLS はそのまま適用される
--     （書き込みは is_orbit_admin のポリシーが担保）
--
-- payload 形式（repository が CreateEventInput/UpdateEventInput から構築）:
--   {
--     "event_type_id": "uuid", "title": "...", "description": "",
--     "is_member_history": false, "date": "2024-01-01", "end_date": "",
--     "start_time": "", "venue": "", "url": "",
--     "group_ids": ["uuid", ...], "member_ids": ["uuid", ...]
--   }
--
-- ロールバック方針:
--   DROP FUNCTION public.upsert_orbit_event(UUID, JSONB);
--   019 の CREATE FUNCTION update_event_with_relations(...)（12引数版）を
--   再実行して復元し、repository を PR #304 以前の実装（create は複数
--   リクエスト+補償削除、update は update_event_with_relations 呼び出し）
--   に戻す。
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_orbit_event(
  p_id UUID,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO public.orbit_events (
      event_type_id, title, description, is_member_history,
      date, end_date, start_time, venue, url
    )
    VALUES (
      (p_payload->>'event_type_id')::uuid,
      p_payload->>'title',
      COALESCE(p_payload->>'description', ''),
      COALESCE((p_payload->>'is_member_history')::boolean, FALSE),
      (p_payload->>'date')::date,
      NULLIF(p_payload->>'end_date', '')::date,
      NULLIF(p_payload->>'start_time', '')::time,
      NULLIF(p_payload->>'venue', ''),
      NULLIF(p_payload->>'url', '')
    )
    RETURNING id INTO v_event_id;
  ELSE
    v_event_id := p_id;
    UPDATE public.orbit_events
    SET event_type_id = (p_payload->>'event_type_id')::uuid,
        title = p_payload->>'title',
        description = COALESCE(p_payload->>'description', ''),
        is_member_history = COALESCE((p_payload->>'is_member_history')::boolean, FALSE),
        date = (p_payload->>'date')::date,
        end_date = NULLIF(p_payload->>'end_date', '')::date,
        start_time = NULLIF(p_payload->>'start_time', '')::time,
        venue = NULLIF(p_payload->>'venue', ''),
        url = NULLIF(p_payload->>'url', '')
    WHERE id = v_event_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'event not found: %', v_event_id USING ERRCODE = 'P0002';
    END IF;

    -- 子データはトランザクション内で作り直す（1トランザクションのため
    -- アプリ実装で必要だった補償削除は不要）。
    DELETE FROM public.orbit_event_groups WHERE event_id = v_event_id;
    DELETE FROM public.orbit_event_members WHERE event_id = v_event_id;
  END IF;

  INSERT INTO public.orbit_event_groups (event_id, group_id)
  SELECT v_event_id, group_id
  FROM (
    SELECT DISTINCT (value)::uuid AS group_id
    FROM jsonb_array_elements_text(COALESCE(p_payload->'group_ids', '[]'::jsonb)) AS value
  ) AS group_items;

  INSERT INTO public.orbit_event_members (event_id, member_id)
  SELECT v_event_id, member_id
  FROM (
    SELECT DISTINCT (value)::uuid AS member_id
    FROM jsonb_array_elements_text(COALESCE(p_payload->'member_ids', '[]'::jsonb)) AS value
  ) AS member_items;

  RETURN v_event_id;
END;
$$;

DROP FUNCTION IF EXISTS public.update_event_with_relations(
  p_event_id UUID,
  p_event_type_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_is_member_history BOOLEAN,
  p_date DATE,
  p_end_date DATE,
  p_start_time TIME,
  p_venue TEXT,
  p_url TEXT,
  p_group_ids UUID[],
  p_member_ids UUID[]
);
