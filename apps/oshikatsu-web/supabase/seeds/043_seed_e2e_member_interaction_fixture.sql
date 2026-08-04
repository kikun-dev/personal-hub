-- ============================================================
-- 043: E2E member interaction contract fixture（#482）
-- ============================================================
-- Scope:
-- - `playwright/interaction-contract.spec.ts` の Member 系検証
--   （MemberSongsSection の focus / hit area / aria-expanded /
--   aria-controls / 開閉後の状態）をローカル Supabase だけで完結させる。
-- - 投入するのは 041 が作った合成メンバー01 に対する
--   所属グループ1件 と 参加楽曲2件のみ。
--
-- なぜ fixture が要るか:
-- - memberRepository の一覧クエリは
--   `member_filter_groups:orbit_member_groups!inner(...)` で所属を
--   inner join する（memberRepository.ts:76）。ローカル seed には
--   orbit_member_groups が1件も無いため、メンバー一覧が常に0件になり、
--   一覧から Member detail へ到達できない。
-- - 参加楽曲セクションは songRepository.findByMemberId が返す
--   orbit_track_members 由来（songRepository.ts:507）。こちらも
--   ローカルは0件なので、disclosure 自体が描画されない。
--
-- なぜ既存メンバーを再利用し、新規メンバーを作らないか:
-- - 041 は「披露メンバー候補グリッドが 390px / grid-cols-2 で
--   18人=9行となり max-h-40 を超える」ことを検証条件として
--   メンバー数を18人ちょうどに固定している。19人目を足すと
--   その前提を崩し setlist-center-toggle.spec.ts へ波及しうる。
-- - よって新規メンバーは作らず、既存のメンバー01へ所属と参加楽曲を足す。
--
-- なぜ楽曲を新規に作らず既存 track を参照するか:
-- - 参加楽曲セクションの描画に必要なのは「その member に紐づく track が
--   1件以上あること」だけで、track 自体の内容は検証対象ではない。
--   release / track を新設すると リリース一覧・楽曲一覧の見え方が変わり、
--   検証に不要な差分が増える。
--
-- 影響範囲:
-- - メンバー一覧が 0件 → 1件になる。/members を訪れる既存 spec は
--   reduced-motion.spec.ts の URL 遷移確認のみで、件数に依存しない。
-- - 参照した track の楽曲詳細に参加メンバーが1人表示される。
--
-- Notes:
-- - seeds/ は config.toml の [db.seed] により **ローカル db reset のみ**
--   で適用される。本番は migration（db push）経由なので影響しない。
-- - curated data が入っている環境（orbit_member_groups または
--   orbit_track_members が既に1件でもある）へは投入しない。
--   人手で調べた正典へ合成 fixture を混ぜないための 040 / 041 と同じ考え方。
-- - 投入後に件数を検証し、不一致なら RAISE EXCEPTION で seed 自体を
--   失敗させる（041 と同じ方針）。
-- ============================================================

DO $seed$
DECLARE
  -- 041 が投入する合成メンバーの先頭（...-0000000001NN の NN=01）
  c_member_id    CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000101';
  c_group_name   CONSTANT TEXT := '乃木坂46';
  c_track_count  CONSTANT INT  := 2;

  v_group_id UUID;
  v_member_group_count INT;
  v_track_member_count INT;
BEGIN
  -- 冪等性: 所属が既にあれば二重投入しない。
  -- curated data 運用中の環境（実在メンバーの所属が入っている）も同じ条件で弾ける。
  IF EXISTS (
    SELECT 1 FROM public.orbit_member_groups
  ) THEN
    RETURN;
  END IF;

  -- 参加楽曲が1件でもある環境は curated data 運用中とみなし、合成 fixture を混ぜない。
  IF EXISTS (
    SELECT 1 FROM public.orbit_track_members
  ) THEN
    RETURN;
  END IF;

  -- 041 未適用の環境（合成メンバーがいない）ではこの fixture をスキップする
  IF NOT EXISTS (
    SELECT 1 FROM public.orbit_members WHERE id = c_member_id
  ) THEN
    RETURN;
  END IF;

  SELECT id INTO v_group_id
    FROM public.orbit_groups
   WHERE name_ja = c_group_name
   LIMIT 1;

  -- 対象グループが未投入の環境ではこの fixture をスキップする
  IF v_group_id IS NULL THEN
    RETURN;
  END IF;

  -- 所属1件。graduated_at を NULL にして「現役」にし、
  -- 在籍状況フィルタが既定（現役）のままでも一覧へ出るようにする。
  INSERT INTO public.orbit_member_groups (member_id, group_id, generation, joined_at, graduated_at)
  VALUES (c_member_id, v_group_id, '1', DATE '2011-08-21', NULL);

  -- 参加楽曲。対象グループのリリース収録曲から先頭2曲を紐づける。
  -- 曲そのものは検証対象ではないので title は固定しない。
  INSERT INTO public.orbit_track_members (track_id, member_id, is_center)
  SELECT t.id, c_member_id, FALSE
    FROM public.orbit_tracks t
    JOIN public.orbit_release_tracks rt ON rt.track_id = t.id
    JOIN public.orbit_releases r ON r.id = rt.release_id
   WHERE r.group_id = v_group_id
   ORDER BY t.id
   LIMIT c_track_count;

  -- ------------------------------------------------------------
  -- 投入後の検証（041 と同じ方針）
  -- 一部だけ入った fixture は E2E を分かりにくく落とすので、
  -- ここで件数が合わなければ seed 自体を失敗させる。
  -- ------------------------------------------------------------
  SELECT COUNT(*) INTO v_member_group_count
    FROM public.orbit_member_groups
   WHERE member_id = c_member_id;

  SELECT COUNT(*) INTO v_track_member_count
    FROM public.orbit_track_members
   WHERE member_id = c_member_id;

  IF v_member_group_count <> 1 OR v_track_member_count <> c_track_count THEN
    RAISE EXCEPTION
      'E2E member fixture の投入に失敗しました（所属=%件 期待=1件, 参加楽曲=%件 期待=%件）',
      v_member_group_count, v_track_member_count, c_track_count;
  END IF;
END
$seed$;
