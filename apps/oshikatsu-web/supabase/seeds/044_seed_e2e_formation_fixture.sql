-- ============================================================
-- 044: E2E formation fixture（#484 / PR #485 レビュー対応 #486）
-- ============================================================
-- Scope:
-- - `playwright/center-text-contrast.spec.ts` の Song detail /
--   Setlist detail 側検証（`FormationRows` のセンター表示 `★`）を
--   ローカル Supabase だけで完結させる。
-- - 投入するのは以下のデータ。
--   - Song formation: `orbit_track_formations` 1件 /
--     `orbit_track_formation_rows` 1件 /
--     `orbit_track_formation_members` 3件（センター1・非センター2）。
--     加えて `orbit_track_members`（043 が入れたセンター1件）へ
--     非センター2件を追加し、参加メンバー集合をフォーメーションと
--     完全一致させる（ADR 0007、詳細は後述）。
--     さらに、追加した非センター2件それぞれの `orbit_release_members`
--     を初出リリースへ追加する（ADR 0007 §1、PR #485 レビュー #P1 対応。
--     詳細は「なぜ orbit_release_members も入れるか」参照）。
--   - Setlist formation: `orbit_setlist_item_formation_rows` 3件 /
--     `orbit_setlist_item_formation_members` 18件（センター1・非センター17）。
--     041 の披露メンバー18人全員を配置する（同上）。
--
-- なぜ orbit_release_members も入れるか（PR #485 レビュー #P1 対応）:
-- - ADR 0007 追記（2026-07-26, #427）§1 は「楽曲参加メンバー ⊆ 初出リリース
--   参加メンバー」を不変条件とし、初出リリース参加メンバー外の楽曲参加メンバー
--   登録を許容しない。本ファイルが `orbit_track_members` へ追加する
--   member02 / member03（下記）は、追加時点では対応する `orbit_release_members`
--   が無く、production の楽曲保存境界（初出リリース参加メンバー検証）では
--   拒否されるはずの状態を fixture 自身が作っていた（レビューで実データにより
--   確認済み）。
-- - よって、追加する2人それぞれについて対象 track の初出リリースへ
--   `orbit_release_members` を追加し、fixture 自体が不変条件を満たす状態にする。
-- - 初出リリースの決定規則（043 と共通。変更する場合は両方直すこと）:
--   その楽曲に紐づくリリースのうち release_date が非NULLで最も古いもの。
--   同日が複数ある場合は release_id の昇順でタイブレークする。
-- - 043 が既に member01 の release_members を同じリリースへ入れていることが
--   あるが、対象 member_id が異なるため (release_id, member_id) の UNIQUE
--   制約には触れない。
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
--   新規メンバーを足すとその前提を崩す。よって 041 のメンバー01〜18
--   （センター=01）を再利用する。
-- - 新規に楽曲/セットリスト項目を作ると 040/041 が既に検証している
--   一覧件数・detail の見え方が変わる。よって Song 側は 043 が既に
--   参照している track、Setlist 側は 041 の setlist item
--   （`e2e00000-0000-4000-8000-000000000003`）をそのまま使う。
--
-- 規模（人数・段数は ADR 0007 の完全一致要件から決まる。「最小限」より優先する）:
-- - ADR 0007「追記（2026-07-24, #425）」#2（楽曲）・#5（ライブ）は、
--   フォーメーションが存在する場合、全列のメンバー集合を
--   `orbit_track_members` / `orbit_setlist_item_members` と**完全一致**
--   させることを不変条件としている。部分集合のフォーメーションは
--   RPC を通した production の保存境界では作れない。
-- - 当初（PR #485 時点）はコストの都合で「行内に非センターが複数並ぶ
--   見た目を最小コストで作る」という理由から3人固定にしていたが、
--   これは上記の完全一致要件に反していた（PR #485 レビュー #P1）。
--   Song 側は `orbit_track_members` が043投入時点で1人（センターのみ）
--   しか無く、フォーメーション3人と不一致だった。Setlist 側は
--   披露メンバー18人に対し、フォーメーションが3人という部分集合に
--   なっていた。
-- - 本 fixture では「最小コストにしたい」という当初の意図よりも
--   ADR 0007 の不変条件を優先し、次のとおり実データと完全一致させる。
--   - Song: `orbit_track_members` を3人（センター1・非センター2）へ揃える。
--     フォーメーション（3人・1段）はそのまま変更しない。
--   - Setlist: フォーメーションを18人（センター1・非センター17）へ拡張する。
--     段構成は実際の坂道フォーメーションらしく複数段に分けるため、
--     18人を「1列目5人 / 2列目6人 / 3列目7人」に割る（前方の列を
--     やや少なくする典型的な見た目に寄せた例。他の割り方でも
--     完全一致要件は満たせるが、本fixtureではこの構成を採用した）。
--     ADR 0007 の必須要件どおり、センター（メンバー01）は1列目に含める。
--
-- センターが1列目（row_number = 1）に含まれることについて:
-- - Song 側: `orbit_track_formation_members` は元から1段構成
--   （`orbit_track_formation_rows` 1件・row_number = 1）で、センター
--   （メンバー01）はその唯一の行に属する。よって変更なしで
--   「フォーメーションが存在する場合、センターは1列目に含まれる」
--   （ADR 0007 §2）を満たす。
-- - Setlist 側: 3段構成へ拡張した後も、センター（メンバー01）は
--   1列目（row_number = 1、5人の行）に残す。既存の
--   `c_setlist_formation_member_center_id`（1列目）は変更せず、
--   2列目・3列目には非センターのみを追加する。
--
-- 影響範囲:
-- - 043 が参照する track の Song detail に「フォーメーション」カードが
--   新たに表示される（従来は rows が0件で非表示）。参加メンバーは
--   1人→3人になる。
-- - 041 の setlist item の Setlist detail に同カードが新たに表示される
--   （同上）。フォーメーションは3人・1段→18人・3段になる。
-- - 043 が参照する track の初出リリースの詳細ページで「参加メンバー」に
--   member02 / member03 が追加される（PR #485 レビュー #P1 対応で追加）。
--   043 が同じリリースへ member01 を追加している場合はそれと合わせて
--   3人になる。全 spec 実行で回帰が無いことを確認済み（本ファイルの
--   変更に紐づく PR コメント参照）。
-- - 新規 live / release / track / member は作らない。既存の一覧件数・
--   他 spec の前提は変えない。
-- - Setlist formation の1段が最大7人になり `FormationRows` の描画幅が
--   伸びるが、`FormationRows`（components/ui/FormationRows.tsx）は
--   各段を `overflow-x-auto` の内側で描画するため、
--   `document.documentElement.scrollWidth` を見る
--   `center-text-contrast.spec.ts` の overflow 検証（390px）には
--   影響しない設計になっている（実行して確認済み。検証結果は
--   本ファイルの変更に紐づく PR コメント参照）。
--
-- Notes:
-- - UUID は `e2e00000-0000-4000-8000-...` 予約名前空間の決定的な値を
--   明示指定する。041 が `...0000000001〜0003` と NN 付き範囲
--   （`...0000000001NN` / `...0000000002NN` / `...0000000003NN`、
--   NN=01..18）を、042 が `...0000000401〜0404` を使用済みのため、
--   本 fixture は未使用の `...0000000501〜0528` を使う。
--     ...-000000000501 : orbit_track_formations.id
--     ...-000000000502 : orbit_track_formation_rows.id（1行目）
--     ...-000000000503 : orbit_track_formation_members.id（センター=メンバー01）
--     ...-000000000504 : orbit_track_formation_members.id（非センター=メンバー02）
--     ...-000000000505 : orbit_track_formation_members.id（非センター=メンバー03）
--     ...-000000000506 : orbit_setlist_item_formation_rows.id（1行目、row_number=1、5人）
--     ...-000000000507 : orbit_setlist_item_formation_members.id（1行目・センター=メンバー01）
--     ...-000000000508 : orbit_setlist_item_formation_members.id（1行目・メンバー02）
--     ...-000000000509 : orbit_setlist_item_formation_members.id（1行目・メンバー03）
--     ...-000000000510 : orbit_setlist_item_formation_members.id（1行目・メンバー04）
--     ...-000000000511 : orbit_setlist_item_formation_members.id（1行目・メンバー05）
--     ...-000000000512 : orbit_setlist_item_formation_rows.id（2行目、row_number=2、6人）
--     ...-000000000513 : orbit_setlist_item_formation_rows.id（3行目、row_number=3、7人）
--     ...-000000000514〜519 : orbit_setlist_item_formation_members.id
--                             （2行目・メンバー06〜11、generate_series で機械的に算出）
--     ...-000000000520〜526 : orbit_setlist_item_formation_members.id
--                             （3行目・メンバー12〜18、generate_series で機械的に算出）
--     ...-000000000527 : orbit_track_members.id（メンバー02、is_center=FALSE）
--     ...-000000000528 : orbit_track_members.id（メンバー03、is_center=FALSE）
--     ...-000000000529 : orbit_release_members.id（メンバー02、PR #485 レビュー #P1 対応）
--     ...-000000000530 : orbit_release_members.id（メンバー03、同上）
-- - orbit_release_members.id も上記529〜530のとおり決定的 UUID を明示する
--   （041/042/044 の既存方針）。対象 track（v_track_id）は 043 が
--   is_center=TRUE にした行を `LIMIT 1` で一意に取得するため常に1件に
--   定まり、追加するメンバー（member02/member03）も固定2名。よって
--   527/528 と同様に個数・対象があらかじめ決定的であり、id を明示できる。
--   （043 側は対象 track が「先頭2曲」という動的な件数選択のため、対応する
--   release_members の行数も投入時まで確定しない。043 が id を明示しない
--   理由は 043 のヘッダーコメント参照）。
-- - seeds/ は config.toml の [db.seed] により **ローカル db reset のみ**
--   で適用される。本番は migration（db push）経由なので影響しない。
-- - curated data が入っている環境（`orbit_track_formations` または
--   `orbit_setlist_item_formation_rows` が既に1件でもある）へは投入しない。
--   人手で調べた正典へ合成 fixture を混ぜないための 040〜043 と同じ考え方。
-- - 041/043 の前提データ（合成メンバー・センター設定済み track・
--   setlist item の披露メンバー）が無い環境ではこの fixture をスキップする。
-- - 投入後に件数だけでなく、集合の完全一致（`orbit_track_members` ⇔
--   `orbit_track_formation_members`、`orbit_setlist_item_members` ⇔
--   `orbit_setlist_item_formation_members`）とセンターの1列目所属を検証し、
--   不一致なら RAISE EXCEPTION で seed 自体を失敗させる（041/043 と同じ方針）。
--   加えて `orbit_track_members` ⊆ 初出リリースの `orbit_release_members`
--   （ADR 0007 §1、PR #485 レビュー #P1 対応）も検証する。
-- ============================================================

DO $seed$
DECLARE
  -- 041 が投入する合成メンバー（センター=01、非センター=02〜18）
  c_center_member_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000101';
  c_other_member_id1 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000102';
  c_other_member_id2 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000103';
  c_member_id_04     CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000104';
  c_member_id_05     CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000105';

  -- 041 が投入する setlist item（披露メンバー18人、うちセンター1人）
  c_setlist_item_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000003';

  -- 本 fixture が割り当てる UUID（予約名前空間、連番はヘッダーコメント参照）
  c_track_formation_id                 CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000501';
  c_track_formation_row_id             CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000502';
  c_track_formation_member_center_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000503';
  c_track_formation_member_other1_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000504';
  c_track_formation_member_other2_id   CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000505';

  c_setlist_formation_row1_id           CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000506';
  c_setlist_formation_member_center_id  CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000507';
  c_setlist_formation_member_other1_id  CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000508';
  c_setlist_formation_member_other2_id  CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000509';
  c_setlist_formation_member_m04_id     CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000510';
  c_setlist_formation_member_m05_id     CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000511';
  c_setlist_formation_row2_id           CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000512';
  c_setlist_formation_row3_id           CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000513';
  -- 2行目メンバー（514〜519 = メンバー06〜11）・3行目メンバー
  -- （520〜526 = メンバー12〜18）は generate_series で機械的に算出する
  -- （下記 INSERT 参照）。

  c_song_track_member_other1_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000527';
  c_song_track_member_other2_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000528';

  -- 初出リリースへ追加する orbit_release_members.id（PR #485 レビュー #P1 対応）
  c_song_release_member_other1_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000529';
  c_song_release_member_other2_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000530';

  -- 段構成: 18人 = 1列目5人（センター含む）/ 2列目6人 / 3列目7人
  c_track_formation_member_count       CONSTANT INT := 3;
  c_setlist_row1_member_count          CONSTANT INT := 5;
  c_setlist_row2_member_count          CONSTANT INT := 6;
  c_setlist_row3_member_count          CONSTANT INT := 7;
  c_setlist_formation_member_count     CONSTANT INT := 18; -- 5 + 6 + 7

  v_track_id UUID;

  v_track_formation_row_count INT;
  v_track_formation_member_count INT;
  v_setlist_formation_row_count INT;
  v_setlist_formation_member_count INT;

  v_track_member_ids UUID[];
  v_track_formation_member_ids UUID[];
  v_setlist_item_member_ids UUID[];
  v_setlist_formation_member_ids UUID[];

  v_track_center_in_row1 BOOLEAN;
  v_setlist_center_in_row1 BOOLEAN;

  v_track_first_release_id UUID;
  v_song_release_invariant_violation_count INT;
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

  -- 041 の setlist item（披露メンバー・うちセンター1人）が無い環境ではスキップする。
  -- 披露メンバー18人は041が単一のDOブロック内で全員一括投入するため、センターの
  -- 行が存在すれば残り17人も存在する（041 の生成方式に依存した安全な代理判定）。
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
  VALUES (c_track_formation_row_id, c_track_formation_id, 1, c_track_formation_member_count);

  INSERT INTO public.orbit_track_formation_members (id, formation_row_id, member_id, slot_order)
  VALUES
    (c_track_formation_member_center_id, c_track_formation_row_id, c_center_member_id, 0),
    (c_track_formation_member_other1_id, c_track_formation_row_id, c_other_member_id1, 1),
    (c_track_formation_member_other2_id, c_track_formation_row_id, c_other_member_id2, 2);

  -- Song 側の参加メンバー（orbit_track_members）をフォーメーションの3人へ揃える
  -- （ADR 0007 §2）。043 が入れたセンター（member01・is_center=TRUE）の行は
  -- 変更せず、非センターの member02 / member03 をここで追加する。
  INSERT INTO public.orbit_track_members (id, track_id, member_id, is_center)
  VALUES
    (c_song_track_member_other1_id, v_track_id, c_other_member_id1, FALSE),
    (c_song_track_member_other2_id, v_track_id, c_other_member_id2, FALSE);

  -- 初出リリース参加メンバー（orbit_release_members）
  -- PR #485 レビュー #P1 対応。ADR 0007 §1「楽曲参加メンバー ⊆ 初出リリース
  -- 参加メンバー」を、上で追加した member02/member03 について満たす
  -- （ヘッダーコメントの「なぜ orbit_release_members も入れるか」参照）。
  --
  -- 初出リリースの決定規則（043 と共通。変更する場合は両方直すこと）:
  --   その楽曲に紐づくリリースのうち release_date が非NULLで最も古いもの。
  --   同日が複数ある場合は release_id の昇順でタイブレークする。
  SELECT r.id INTO v_track_first_release_id
    FROM public.orbit_release_tracks rt
    JOIN public.orbit_releases r ON r.id = rt.release_id
   WHERE rt.track_id = v_track_id
     AND r.release_date IS NOT NULL
   ORDER BY r.release_date ASC, r.id ASC
   LIMIT 1;

  IF v_track_first_release_id IS NULL THEN
    RAISE EXCEPTION
      'E2E formation fixture: track_id=% の初出リリースが見つかりません'
      '（release_date が非NULLのリリースに紐づいていません）。',
      v_track_id;
  END IF;

  -- 043 が既に member01 の release_members を同じリリースへ入れていることが
  -- あるが、対象 member_id が異なるため (release_id, member_id) の UNIQUE
  -- 制約には触れない。id は上記のとおり決定的な値を明示する。
  INSERT INTO public.orbit_release_members (id, release_id, member_id)
  VALUES
    (c_song_release_member_other1_id, v_track_first_release_id, c_other_member_id1),
    (c_song_release_member_other2_id, v_track_first_release_id, c_other_member_id2);

  -- ------------------------------------------------------------
  -- Setlist formation（SetlistFormationDisplay 経由）
  -- 披露メンバー18人全員を、1列目5人（センター含む）/ 2列目6人 / 3列目7人へ配置する。
  -- ------------------------------------------------------------
  INSERT INTO public.orbit_setlist_item_formation_rows (id, setlist_item_id, row_number, member_count)
  VALUES
    (c_setlist_formation_row1_id, c_setlist_item_id, 1, c_setlist_row1_member_count),
    (c_setlist_formation_row2_id, c_setlist_item_id, 2, c_setlist_row2_member_count),
    (c_setlist_formation_row3_id, c_setlist_item_id, 3, c_setlist_row3_member_count);

  -- 1列目: センター（メンバー01）を含む5人。ADR 0007「センターは
  -- フォーメーションが存在する場合のみ1列目に含まれることを必須とする」を満たす。
  INSERT INTO public.orbit_setlist_item_formation_members (id, formation_row_id, member_id, slot_order)
  VALUES
    (c_setlist_formation_member_center_id, c_setlist_formation_row1_id, c_center_member_id, 0),
    (c_setlist_formation_member_other1_id, c_setlist_formation_row1_id, c_other_member_id1, 1),
    (c_setlist_formation_member_other2_id, c_setlist_formation_row1_id, c_other_member_id2, 2),
    (c_setlist_formation_member_m04_id, c_setlist_formation_row1_id, c_member_id_04, 3),
    (c_setlist_formation_member_m05_id, c_setlist_formation_row1_id, c_member_id_05, 4);

  -- 2列目: メンバー06〜11の6人。id/member_id/slot_order を generate_series で機械的に
  -- 算出する（PK は 514〜519、member は 041 の NN=06〜11、slot_order は 0始まり）。
  INSERT INTO public.orbit_setlist_item_formation_members (id, formation_row_id, member_id, slot_order)
  SELECT
    format('e2e00000-0000-4000-8000-00000000%s', lpad((514 + i)::TEXT, 4, '0'))::UUID,
    c_setlist_formation_row2_id,
    format('e2e00000-0000-4000-8000-0000000001%s', lpad((6 + i)::TEXT, 2, '0'))::UUID,
    i
  FROM generate_series(0, c_setlist_row2_member_count - 1) AS i;

  -- 3列目: メンバー12〜18の7人。PK は 520〜526、member は NN=12〜18。
  INSERT INTO public.orbit_setlist_item_formation_members (id, formation_row_id, member_id, slot_order)
  SELECT
    format('e2e00000-0000-4000-8000-00000000%s', lpad((520 + i)::TEXT, 4, '0'))::UUID,
    c_setlist_formation_row3_id,
    format('e2e00000-0000-4000-8000-0000000001%s', lpad((12 + i)::TEXT, 2, '0'))::UUID,
    i
  FROM generate_series(0, c_setlist_row3_member_count - 1) AS i;

  -- ------------------------------------------------------------
  -- 投入後の検証（041/043 と同じ方針）
  -- 件数だけでなく、ADR 0007 が要求する「フォーメーションが存在する場合、
  -- 参加メンバー集合と全列のメンバー集合を完全一致させる」という不変条件を
  -- 集合比較で検証する。一部だけ入った fixture や不一致な fixture は
  -- E2E を分かりにくく落とすので、ここで RAISE EXCEPTION で seed 自体を
  -- 失敗させる。
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
    FROM public.orbit_setlist_item_formation_members AS fm
    JOIN public.orbit_setlist_item_formation_rows AS fr ON fr.id = fm.formation_row_id
   WHERE fr.setlist_item_id = c_setlist_item_id;

  IF v_track_formation_row_count <> 1
     OR v_track_formation_member_count <> c_track_formation_member_count
     OR v_setlist_formation_row_count <> 3
     OR v_setlist_formation_member_count <> c_setlist_formation_member_count
  THEN
    RAISE EXCEPTION
      'E2E formation fixture の投入に失敗しました'
      '（track formation行=%件 期待=1件, track formationメンバー=%件 期待=%件,'
      ' setlist formation行=%件 期待=3件, setlist formationメンバー=%件 期待=%件）',
      v_track_formation_row_count,
      v_track_formation_member_count, c_track_formation_member_count,
      v_setlist_formation_row_count,
      v_setlist_formation_member_count, c_setlist_formation_member_count;
  END IF;

  -- Song 側: orbit_track_members と orbit_track_formation_members の集合が
  -- 完全一致すること（ADR 0007 §2）。
  SELECT array_agg(member_id ORDER BY member_id) INTO v_track_member_ids
    FROM public.orbit_track_members
   WHERE track_id = v_track_id;

  SELECT array_agg(fm.member_id ORDER BY fm.member_id) INTO v_track_formation_member_ids
    FROM public.orbit_track_formation_members AS fm
    JOIN public.orbit_track_formation_rows AS fr ON fr.id = fm.formation_row_id
   WHERE fr.formation_id = c_track_formation_id;

  IF v_track_member_ids IS DISTINCT FROM v_track_formation_member_ids THEN
    RAISE EXCEPTION
      'E2E formation fixture: Song側の参加メンバー集合とフォーメーションの'
      'メンバー集合が一致しません（ADR 0007 §2 違反）。track_members=%, formation_members=%',
      v_track_member_ids, v_track_formation_member_ids;
  END IF;

  -- 追加検証（PR #485 レビュー #P1 対応）: Song側の orbit_track_members ⊆
  -- 初出リリースの orbit_release_members（ADR 0007 §1）。初出リリースの
  -- 算出規則は上の INSERT と同じ（ヘッダーコメント・上記コメント参照。
  -- 変更する場合は 043 側のコメントも一緒に直すこと）。
  SELECT COUNT(*) INTO v_song_release_invariant_violation_count
    FROM public.orbit_track_members tm
   WHERE tm.track_id = v_track_id
     AND NOT EXISTS (
       SELECT 1
         FROM public.orbit_release_members rm
        WHERE rm.release_id = v_track_first_release_id
          AND rm.member_id = tm.member_id
     );

  IF v_song_release_invariant_violation_count <> 0 THEN
    RAISE EXCEPTION
      'E2E formation fixture: Song側の orbit_track_members が初出リリースの'
      ' orbit_release_members に含まれない行があります（ADR 0007 §1 違反）。違反件数=%件',
      v_song_release_invariant_violation_count;
  END IF;

  -- Setlist 側: orbit_setlist_item_members と
  -- orbit_setlist_item_formation_members の集合が完全一致すること（ADR 0007 §5）。
  SELECT array_agg(member_id ORDER BY member_id) INTO v_setlist_item_member_ids
    FROM public.orbit_setlist_item_members
   WHERE setlist_item_id = c_setlist_item_id;

  SELECT array_agg(fm.member_id ORDER BY fm.member_id) INTO v_setlist_formation_member_ids
    FROM public.orbit_setlist_item_formation_members AS fm
    JOIN public.orbit_setlist_item_formation_rows AS fr ON fr.id = fm.formation_row_id
   WHERE fr.setlist_item_id = c_setlist_item_id;

  IF v_setlist_item_member_ids IS DISTINCT FROM v_setlist_formation_member_ids THEN
    RAISE EXCEPTION
      'E2E formation fixture: Setlist側の披露メンバー集合とフォーメーションの'
      'メンバー集合が一致しません（ADR 0007 §5 違反）。item_members=%, formation_members=%',
      v_setlist_item_member_ids, v_setlist_formation_member_ids;
  END IF;

  -- センターが1列目（row_number = 1）に含まれること（ADR 0007 §2・§5）。
  SELECT EXISTS (
    SELECT 1
      FROM public.orbit_track_formation_members AS fm
      JOIN public.orbit_track_formation_rows AS fr ON fr.id = fm.formation_row_id
     WHERE fr.formation_id = c_track_formation_id
       AND fr.row_number = 1
       AND fm.member_id = c_center_member_id
  ) INTO v_track_center_in_row1;

  SELECT EXISTS (
    SELECT 1
      FROM public.orbit_setlist_item_formation_members AS fm
      JOIN public.orbit_setlist_item_formation_rows AS fr ON fr.id = fm.formation_row_id
     WHERE fr.setlist_item_id = c_setlist_item_id
       AND fr.row_number = 1
       AND fm.member_id = c_center_member_id
  ) INTO v_setlist_center_in_row1;

  IF NOT v_track_center_in_row1 OR NOT v_setlist_center_in_row1 THEN
    RAISE EXCEPTION
      'E2E formation fixture: センターが1列目（row_number = 1）に含まれていません'
      '（ADR 0007 §2・§5 違反）。track側=%, setlist側=%',
      v_track_center_in_row1, v_setlist_center_in_row1;
  END IF;
END
$seed$;
