-- ============================================================
-- 041: E2E setlist member fixture（#453）
-- ============================================================
-- Scope:
-- - セットリスト楽曲の「センター切り替え」E2E 用に、専用ライブ
--   `【E2E】センター切り替え検証` を1本まるごと投入する。
-- - 内訳: ライブ1 / 公演1 / セットリスト項目1（登録曲1曲）/
--   メンバー18 / 出演メンバー18 / 披露メンバー18（うちセンター1）。
-- - #422: セットリスト楽曲は登録曲必須のため、040 と同様に
--   song_title の自由入力ではなく登録済み track（track_id）を参照する。
--
-- なぜ 040 のライブに相乗りせず専用ライブを作るか:
-- - orbit_live_performer_members に行を入れると LiveDetail.tsx が
--   「出演メンバー」セクションを新たに描画する（LiveDetail.tsx:307）。
-- - 040 が対象にしている `乃木坂46 真夏の全国ツアー2026` は既存の
--   4 spec（attendance-form-a11y / live-detail-attendance-density /
--   live-detail-overflow / form-focus-ring）が参照しており、そこへ
--   出演メンバーを足すと、それらの spec が assert している画面が変わる。
-- - よってこの fixture は自分専用の隔離されたライブを新規に作る。
--
-- なぜメンバーが 18 人ちょうどか:
-- - SetlistEditor の披露メンバー候補グリッドは 390px 幅で grid-cols-2
--   （SetlistEditor.tsx:652）。18 人 → 9 行となり、グリッドの
--   max-h-40（160px）を超えるため、縦スクロール経路を必ず通る。
--   この経路の検証が本 fixture の目的なので人数は意図的に固定する。
--
-- Notes:
-- - UUID は `e2e00000-0000-4000-8000-...` 予約名前空間の決定的な値を
--   明示指定する。どの行が E2E fixture かひと目で分かり、spec からも
--   直接参照できるようにするため。連番部分の割り当ては以下。
--     ...-0000000000 01 : ライブ
--     ...-0000000000 02 : 公演
--     ...-0000000000 03 : セットリスト項目
--     ...-0000000001 NN : メンバー（NN = 01..18）
--     ...-0000000002 NN : 出演メンバー（基準ロスター）
--     ...-0000000003 NN : 披露メンバー
-- - センターはメンバー01（候補グリッドの先頭）に固定する。spec 側は
--   スクロールしないと見えない後方のメンバーへ切り替える想定。
-- - 投入後に件数を検証し、不一致なら RAISE EXCEPTION で seed 自体を
--   失敗させる（063_add_orbit_track_members.sql の backfill 検証と同じ方針）。
--   中途半端に入った fixture は E2E を分かりにくく落とすため、
--   seed の時点で大きく失敗させる。
-- ============================================================

DO $seed$
DECLARE
  -- fixture 行の決定的 UUID（予約名前空間）
  c_live_id         CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000001';
  c_performance_id  CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000002';
  c_setlist_item_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000003';
  c_live_name       CONSTANT TEXT := '【E2E】センター切り替え検証';
  c_member_count    CONSTANT INT  := 18;

  v_track_id UUID;

  v_performer_member_count INT;
  v_item_member_count INT;
  v_center_count INT;
BEGIN
  -- 冪等性: 同じ fixture ライブが既にあれば二重投入しない
  IF EXISTS (
    SELECT 1 FROM public.orbit_lives WHERE name = c_live_name
  ) THEN
    RETURN;
  END IF;

  -- 披露メンバーが1件でもある環境は curated data 運用中とみなす。
  -- 実在ライブの披露メンバーは人手で調べた正典なので、そこへ合成 fixture を
  -- 混ぜない（040 のセットリスト行ガードと同じ考え方）。
  IF EXISTS (
    SELECT 1 FROM public.orbit_setlist_item_members
  ) THEN
    RETURN;
  END IF;

  -- メンバーが1件でもある環境にも投入しない。合成メンバー18人を足すと
  -- メンバー一覧やメンバー詳細に fixture が混ざり、curated data を汚染する。
  IF EXISTS (
    SELECT 1 FROM public.orbit_members
  ) THEN
    RETURN;
  END IF;

  -- 登録曲（乃木坂46「ぐるぐるカーテン」）を fixture の楽曲として参照する（040 と同じ曲）
  SELECT t.id INTO v_track_id
    FROM public.orbit_tracks t
    JOIN public.orbit_release_tracks rt ON rt.track_id = t.id
    JOIN public.orbit_releases r ON r.id = rt.release_id
    JOIN public.orbit_groups g ON g.id = r.group_id
   WHERE g.name_ja = '乃木坂46' AND t.title = 'ぐるぐるカーテン'
   LIMIT 1;

  -- 対象トラックが未投入の環境（030〜032 未適用等）ではこの fixture をスキップする
  IF v_track_id IS NULL THEN
    RETURN;
  END IF;

  -- ライブ本体。live_type は CHECK（single/tour/festival/online/other）を満たす 'other'。
  INSERT INTO public.orbit_lives (id, name, live_type, description)
  VALUES (
    c_live_id,
    c_live_name,
    'other',
    'E2E（#453）セットリストのセンター切り替え検証用。実在のライブではない。'
  );

  -- 公演は1本だけ。会場は検証に不要なので venue_id は NULL のままにする。
  -- 日付は既存 spec が参照していない 2026-03 を選ぶ。
  INSERT INTO public.orbit_live_performances (id, live_id, performance_date, sort_order)
  VALUES (c_performance_id, c_live_id, DATE '2026-03-15', 0);

  -- セットリストは登録曲1曲のみ（#422 により song_title は使わない）
  INSERT INTO public.orbit_setlist_items (id, performance_id, position, item_type, track_id)
  VALUES (c_setlist_item_id, c_performance_id, 1, 'song', v_track_id);

  -- 合成メンバー18人。NOT NULL は name_ja / name_kana のみ。
  -- 手書き54行を避け、generate_series で人数が一目で分かるようにする。
  INSERT INTO public.orbit_members (id, name_ja, name_kana)
  SELECT
    format('e2e00000-0000-4000-8000-0000000001%s', lpad(i::TEXT, 2, '0'))::UUID,
    format('【E2E】メンバー%s', lpad(i::TEXT, 2, '0')),
    format('イーツーイーメンバー%s', lpad(i::TEXT, 2, '0'))
  FROM generate_series(1, c_member_count) AS i;

  -- 出演メンバー（基準ロスター）。SetlistEditor の候補一覧はここから作られる。
  INSERT INTO public.orbit_live_performer_members (id, live_id, member_id)
  SELECT
    format('e2e00000-0000-4000-8000-0000000002%s', lpad(i::TEXT, 2, '0'))::UUID,
    c_live_id,
    format('e2e00000-0000-4000-8000-0000000001%s', lpad(i::TEXT, 2, '0'))::UUID
  FROM generate_series(1, c_member_count) AS i;

  -- 披露メンバー。18人全員を選択済みにし、センターはメンバー01 の1人だけ。
  INSERT INTO public.orbit_setlist_item_members (id, setlist_item_id, member_id, is_center, sort_order)
  SELECT
    format('e2e00000-0000-4000-8000-0000000003%s', lpad(i::TEXT, 2, '0'))::UUID,
    c_setlist_item_id,
    format('e2e00000-0000-4000-8000-0000000001%s', lpad(i::TEXT, 2, '0'))::UUID,
    i = 1,
    i - 1
  FROM generate_series(1, c_member_count) AS i;

  -- ------------------------------------------------------------
  -- 投入後の検証（063 の backfill 検証と同じ方針）
  -- 一部だけ入った fixture は E2E を分かりにくく落とすので、
  -- ここで件数が合わなければ seed 自体を失敗させる。
  -- ------------------------------------------------------------
  SELECT COUNT(*) INTO v_performer_member_count
    FROM public.orbit_live_performer_members
   WHERE live_id = c_live_id;

  SELECT COUNT(*) INTO v_item_member_count
    FROM public.orbit_setlist_item_members
   WHERE setlist_item_id = c_setlist_item_id;

  SELECT COUNT(*) INTO v_center_count
    FROM public.orbit_setlist_item_members
   WHERE setlist_item_id = c_setlist_item_id
     AND is_center;

  IF v_performer_member_count <> c_member_count
     OR v_item_member_count <> c_member_count
     OR v_center_count <> 1
  THEN
    RAISE EXCEPTION
      'E2E fixture の投入に失敗しました（出演メンバー=%件 期待=%件, 披露メンバー=%件 期待=%件, センター=%件 期待=1件）',
      v_performer_member_count, c_member_count,
      v_item_member_count, c_member_count,
      v_center_count;
  END IF;
END
$seed$;
