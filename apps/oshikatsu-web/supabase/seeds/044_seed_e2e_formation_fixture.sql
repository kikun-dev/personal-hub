-- ============================================================
-- 044: E2E formation fixture（#484）
-- ============================================================
-- Scope:
-- - `playwright/center-text-contrast.spec.ts` の Song detail /
--   Setlist detail 側検証（`FormationRows` のセンター表示 `★`）を
--   ローカル Supabase だけで完結させる。
-- - 投入するのは以下の最小データのみ。
--   - Song formation: `orbit_track_formations` 1件 /
--     `orbit_track_formation_rows` 1件 /
--     `orbit_track_formation_members` 3件（センター1・非センター2）
--   - Setlist formation: `orbit_setlist_item_formation_rows` 1件 /
--     `orbit_setlist_item_formation_members` 3件（センター1・非センター2）
--
-- なぜ fixture が要るか:
-- - `FormationRows`（components/ui/FormationRows.tsx）は
--   Song detail の `FormationDisplay` と Setlist detail の
--   `SetlistFormationDisplay` から使われるが、どちらも `rows.length === 0`
--   なら何も描画しない。ローカル seed には formation 系テーブルが
--   1件も無いため、#484 が対象とする `text-center-text` のセンター名
--   表示（`FormationRows.tsx:58`）を実測できない。
--
-- なぜ 043 がセンターに設定した track を Song formation の対象にするか:
-- - センターの正典は `orbit_track_members.is_center`（ADR 0007
--   2026-07-24改訂、`components/songs/FormationDisplay.tsx` 冒頭コメント）で、
--   formation 行自体はセンター情報を持たず memberId で突き合わせる。
--   043（#482, 本コミットで #484 分の変更を追加）がメンバー01を
--   is_center = TRUE にした track と同じ曲で formation を組むことで、
--   Member detail と Song detail で同じセンター曲を検証できる。
--
-- なぜ既存メンバーを再利用し、新規メンバー/新規曲を作らないか:
-- - 041 は「合成メンバーが18人ちょうど」であることを披露メンバー候補
--   グリッドのスクロール経路検証の前提にしている（041 のコメント参照）。
--   新規メンバーを足すとその前提を崩す。よって 041 のメンバー01
--   （センター）・02・03（非センター）を再利用する。
-- - 新規に楽曲/セットリスト項目を作ると 040/041 が既に検証している
--   一覧件数・detail の見え方が変わる。よって Song 側は 043 が既に
--   参照している track、Setlist 側は 041 の setlist item
--   （`e2e00000-0000-4000-8000-000000000003`）をそのまま使う。
--
-- 規模（1段・3人固定の理由）:
-- - `FormationRows` は「1行 = 同じ列に並ぶメンバー」を横並びで描画する。
--   センター表示（★付き太字）と非センター表示を**同じ行で比較**できれば
--   contrast 検証の目的は満たせるため、行数は1段で十分。
-- - メンバーはセンター1人・非センター2人の計3人にする。非センターを
--   2人にしたのは、centerの★を除いた「同じ行内で複数の非センター名が
--   並ぶ」構成を最小コストで作るため（1人だと「行内に非センターが
--   1件だけ」という特殊ケースになり、実際の楽曲フォーメーションの
--   典型的な見た目からやや離れる）。4人以上に増やす理由はない。
--
-- 影響範囲:
-- - 043 が参照する track の Song detail に「フォーメーション」カードが
--   新たに表示される（従来は rows が0件で非表示）。
-- - 041 の setlist item の Setlist detail に同カードが新たに表示される
--   （同上）。
-- - 新規 live / release / track / member は作らない。既存の一覧件数・
--   他 spec の前提は変えない。
--
-- Notes:
-- - UUID は `e2e00000-0000-4000-8000-...` 予約名前空間の決定的な値を
--   明示指定する。041 が `...0000000001〜0003` と NN 付き範囲
--   （`...0000000001NN` / `...0000000002NN` / `...0000000003NN`、
--   NN=01..18）を、042 が `...0000000401〜0404` を使用済みのため、
--   本 fixture は未使用の `...0000000501〜0509` を使う。
--     ...-000000000501 : orbit_track_formations.id
--     ...-000000000502 : orbit_track_formation_rows.id（1行目）
--     ...-000000000503 : orbit_track_formation_members.id（センター=メンバー01）
--     ...-000000000504 : orbit_track_formation_members.id（非センター=メンバー02）
--     ...-000000000505 : orbit_track_formation_members.id（非センター=メンバー03）
--     ...-000000000506 : orbit_setlist_item_formation_rows.id（1行目）
--     ...-000000000507 : orbit_setlist_item_formation_members.id（センター=メンバー01）
--     ...-000000000508 : orbit_setlist_item_formation_members.id（非センター=メンバー02）
--     ...-000000000509 : orbit_setlist_item_formation_members.id（非センター=メンバー03）
-- - seeds/ は config.toml の [db.seed] により **ローカル db reset のみ**
--   で適用される。本番は migration（db push）経由なので影響しない。
-- - curated data が入っている環境（`orbit_track_formations` または
--   `orbit_setlist_item_formation_rows` が既に1件でもある）へは投入しない。
--   人手で調べた正典へ合成 fixture を混ぜないための 040〜043 と同じ考え方。
-- - 041/043 の前提データ（合成メンバー・センター設定済み track・
--   setlist item の披露メンバー）が無い環境ではこの fixture をスキップする。
-- - 投入後に件数を検証し、不一致なら RAISE EXCEPTION で seed 自体を
--   失敗させる（041/043 と同じ方針）。
-- ============================================================

DO $seed$
DECLARE
  -- 041 が投入する合成メンバー（センター=01、非センター=02/03）
  c_center_member_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000101';
  c_other_member_id1 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000102';
  c_other_member_id2 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000103';

  -- 041 が投入する setlist item（披露メンバー18人、うちセンター1人）
  c_setlist_item_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000003';

  -- 本 fixture が新規に割り当てる UUID（予約名前空間、連番は上記コメント参照）
  c_track_formation_id                 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000501';
  c_track_formation_row_id             CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000502';
  c_track_formation_member_center_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000503';
  c_track_formation_member_other1_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000504';
  c_track_formation_member_other2_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000505';

  c_setlist_formation_row_id           CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000506';
  c_setlist_formation_member_center_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000507';
  c_setlist_formation_member_other1_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000508';
  c_setlist_formation_member_other2_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000509';

  c_row_member_count CONSTANT INT := 3;

  v_track_id UUID;

  v_track_formation_row_count INT;
  v_track_formation_member_count INT;
  v_setlist_formation_row_count INT;
  v_setlist_formation_member_count INT;
BEGIN
  -- curated data 運用中とみなし、合成 fixture を混ぜない（040〜043 と同じ考え方）。
  IF EXISTS (SELECT 1 FROM public.orbit_track_formations) THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.orbit_setlist_item_formation_rows) THEN
    RETURN;
  END IF;

  -- 041 未適用の環境（合成メンバーがいない）ではこの fixture をスキップする
  IF NOT EXISTS (SELECT 1 FROM public.orbit_members WHERE id = c_center_member_id)
     OR NOT EXISTS (SELECT 1 FROM public.orbit_members WHERE id = c_other_member_id1)
     OR NOT EXISTS (SELECT 1 FROM public.orbit_members WHERE id = c_other_member_id2)
  THEN
    RETURN;
  END IF;

  -- 041 の setlist item（披露メンバー・うちセンター1人）が無い環境ではスキップする
  IF NOT EXISTS (
    SELECT 1 FROM public.orbit_setlist_item_members
     WHERE setlist_item_id = c_setlist_item_id
       AND member_id = c_center_member_id
       AND is_center
  ) THEN
    RETURN;
  END IF;

  -- 043（本コミットで is_center = TRUE を追加）がセンターに設定した track を取得。
  -- 無ければ（043 未適用、またはセンター設定前）この fixture をスキップする。
  SELECT track_id INTO v_track_id
    FROM public.orbit_track_members
   WHERE member_id = c_center_member_id
     AND is_center = TRUE
   LIMIT 1;

  IF v_track_id IS NULL THEN
    RETURN;
  END IF;

  -- ------------------------------------------------------------
  -- Song formation（FormationDisplay 経由）
  -- ------------------------------------------------------------
  INSERT INTO public.orbit_track_formations (id, track_id, column_count)
  VALUES (c_track_formation_id, v_track_id, 1);

  INSERT INTO public.orbit_track_formation_rows (id, formation_id, row_number, member_count)
  VALUES (c_track_formation_row_id, c_track_formation_id, 1, c_row_member_count);

  INSERT INTO public.orbit_track_formation_members (id, formation_row_id, member_id, slot_order)
  VALUES
    (c_track_formation_member_center_id, c_track_formation_row_id, c_center_member_id, 0),
    (c_track_formation_member_other1_id, c_track_formation_row_id, c_other_member_id1, 1),
    (c_track_formation_member_other2_id, c_track_formation_row_id, c_other_member_id2, 2);

  -- ------------------------------------------------------------
  -- Setlist formation（SetlistFormationDisplay 経由）
  -- ------------------------------------------------------------
  INSERT INTO public.orbit_setlist_item_formation_rows (id, setlist_item_id, row_number, member_count)
  VALUES (c_setlist_formation_row_id, c_setlist_item_id, 1, c_row_member_count);

  INSERT INTO public.orbit_setlist_item_formation_members (id, formation_row_id, member_id, slot_order)
  VALUES
    (c_setlist_formation_member_center_id, c_setlist_formation_row_id, c_center_member_id, 0),
    (c_setlist_formation_member_other1_id, c_setlist_formation_row_id, c_other_member_id1, 1),
    (c_setlist_formation_member_other2_id, c_setlist_formation_row_id, c_other_member_id2, 2);

  -- ------------------------------------------------------------
  -- 投入後の検証（041/043 と同じ方針）
  -- 一部だけ入った fixture は E2E を分かりにくく落とすので、
  -- ここで件数が合わなければ seed 自体を失敗させる。
  -- ------------------------------------------------------------
  SELECT COUNT(*) INTO v_track_formation_row_count
    FROM public.orbit_track_formation_rows
   WHERE formation_id = c_track_formation_id;

  SELECT COUNT(*) INTO v_track_formation_member_count
    FROM public.orbit_track_formation_members
   WHERE formation_row_id = c_track_formation_row_id;

  SELECT COUNT(*) INTO v_setlist_formation_row_count
    FROM public.orbit_setlist_item_formation_rows
   WHERE setlist_item_id = c_setlist_item_id;

  SELECT COUNT(*) INTO v_setlist_formation_member_count
    FROM public.orbit_setlist_item_formation_members
   WHERE formation_row_id = c_setlist_formation_row_id;

  IF v_track_formation_row_count <> 1
     OR v_track_formation_member_count <> c_row_member_count
     OR v_setlist_formation_row_count <> 1
     OR v_setlist_formation_member_count <> c_row_member_count
  THEN
    RAISE EXCEPTION
      'E2E formation fixture の投入に失敗しました'
      '（track formation行=%件 期待=1件, track formationメンバー=%件 期待=%件,'
      ' setlist formation行=%件 期待=1件, setlist formationメンバー=%件 期待=%件）',
      v_track_formation_row_count,
      v_track_formation_member_count, c_row_member_count,
      v_setlist_formation_row_count,
      v_setlist_formation_member_count, c_row_member_count;
  END IF;
END
$seed$;
