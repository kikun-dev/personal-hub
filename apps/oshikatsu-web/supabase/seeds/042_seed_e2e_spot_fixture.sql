-- ============================================================
-- 042: E2E spot fixture（#470）
-- ============================================================
-- Scope:
-- - 公開スポット画面（/spots、/spots/[id]）を E2E で描画できるようにする
--   ための最小 fixture。
-- - 内訳: スポット1 / 出来事1（source_type='live'）/ 出来事の関係メンバー1。
--
-- なぜ必要か:
-- - ローカル seed は `orbit_spots = 0` で、/spots は絞り込みと空状態しか
--   描画されず、/spots/[id] は開けなかった。そのため SpotDetail 全体と
--   SpotsMapView の一覧テーブル・マーカーが一度も検証されていない。
-- - #468（#461 の PR3）では semantic token 移行42箇所のうち23箇所が
--   「描画されないため rendered contrast を実測できない」状態になった。
--   内訳は SpotDetail 全13行、SpotsMapView の一覧テーブル9行、APIキー未設定時の
--   注意書き1行。加えて InfoWindow の3箇所は #468 で対象外へ戻し #469 へ切り出したが、
--   その #469 も前提（.gm-style-iw の背景）の実測ができず止まっていた。
-- - playwright/README.md の skip 一覧にも、`orbit_spots = 0` を理由に
--   skip している管理フォーム編集2件が記録されており、同ファイルに
--   「スポットの編集hydrationをローカルでも常時検証したい場合は専用
--   fixture を追加する」と本 seed に相当する作業が想定として書かれていた。
--
-- なぜ Option A（最小構成）か:
-- - 未検証だった主要経路（一覧テーブル / 詳細 / マーカー / InfoWindow）は
--   スポット1件で一度に開通する。出来事の種別分岐（mv / video / event）の
--   網羅は、楽曲・イベントの既存 fixture へ FK 依存を増やす割に、本 Issue の
--   目的（rendered contrast を実測できるようにする）への寄与が小さい。
--   必要になった時点で広げる。
--
-- なぜ写真を含めないか:
-- - resolveStorageImageSrc は Storage 上の実体を必要としないため、写真行だけでも
--   セクションは描画される。しかし実体が無いと画像リクエストが 400 になり、
--   admin-form-hydration.spec.ts の「リソース取得失敗ゼロ」assert が落ちる
--   （#470 で実際に踏んだ）。fixture が既存 spec を壊すのは本末転倒なので写真は
--   含めない。写真セクションの検証には Storage への実体投入が要るため別途とする。
--
-- Notes:
-- - UUID は `e2e00000-0000-4000-8000-...` 予約名前空間の決定的な値を明示指定
--   する（041 と同じ方針）。連番は 04NN 帯をスポット用に使う。
--     ...-000000000401 : スポット
--     ...-000000000402 : 出来事
--     ...-000000000403 : 出来事の関係メンバー
-- - ライブ / グループ / メンバーは決定的な順序で解決する。seed はファイル名順に
--   適用され、042 は既存のライブ seed（035〜038）とメンバー fixture（041）より
--   後に走るため参照先は必ず存在する。無い場合は RAISE EXCEPTION で失敗させる。
-- - 緯度経度は実在の座標ではなく、地図が日本国内に収まる範囲の固定値を使う。
-- - 投入後に件数を検証し、不一致なら RAISE EXCEPTION で seed 自体を失敗させる
--   （041 と同じ方針）。中途半端に入った fixture は E2E を分かりにくく落とす。
--
-- 適用後の注意（#470 で実際に踏んだ）:
-- - スポット一覧は Next のデータキャッシュに載る。DB へ直接 seed を流した場合、
--   `.next/cache` に残った旧結果（スポット0件）がそのまま使われ、`next build` を
--   やり直しても一覧が空のままになる。
-- - 詳細ページ（/spots/[id]）は表示されるのに一覧だけ空、という紛らわしい状態に
--   なるため、seed 適用後は `.next` を削除してからビルドすること。
-- ============================================================

DO $seed$
DECLARE
  -- fixture 行の決定的 UUID（予約名前空間）
  c_spot_id       CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000401';
  c_appearance_id CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000402';
  c_member_id     CONSTANT UUID := 'e2e00000-0000-4000-8000-000000000403';
  c_spot_name     CONSTANT TEXT := '【E2E】聖地スポット検証';

  v_live_id UUID;
  v_group_id UUID;
  v_appearance_member_id UUID;

  v_appearance_count INT;
  v_member_count INT;
BEGIN
  -- 冪等性: 同じ fixture スポットが既にあれば二重投入しない
  IF EXISTS (
    SELECT 1 FROM public.orbit_spots WHERE name = c_spot_name
  ) THEN
    RETURN;
  END IF;

  -- スポットが1件でもある環境は curated data 運用中とみなす。
  -- 実在の聖地スポットは人手で調べた正典なので、そこへ合成 fixture を混ぜない
  -- （041 の披露メンバーガードと同じ考え方）。
  IF EXISTS (SELECT 1 FROM public.orbit_spots) THEN
    RETURN;
  END IF;

  -- ------------------------------------------------------------
  -- 参照の解決（決定的な順序で1件選ぶ）
  -- ------------------------------------------------------------
  SELECT id INTO v_live_id
    FROM public.orbit_lives
   ORDER BY name, id
   LIMIT 1;

  SELECT id INTO v_group_id
    FROM public.orbit_groups
   ORDER BY name_ja, id
   LIMIT 1;

  SELECT id INTO v_appearance_member_id
    FROM public.orbit_members
   ORDER BY name_ja, id
   LIMIT 1;

  IF v_live_id IS NULL OR v_group_id IS NULL OR v_appearance_member_id IS NULL THEN
    RAISE EXCEPTION
      'E2E spot fixture の参照先が見つかりません（live=%, group=%, member=%）。'
      'ライブ seed（035〜038）とメンバー fixture（041）より後に適用されているか確認してください。',
      v_live_id, v_group_id, v_appearance_member_id;
  END IF;

  -- ------------------------------------------------------------
  -- スポット本体
  -- 場所情報（都道府県 / 住所）と説明を埋め、SpotDetail の dt/dd と
  -- 本文、SpotsMapView の一覧テーブル（名前 / 種別 / 都道府県）を描画させる。
  -- ------------------------------------------------------------
  INSERT INTO public.orbit_spots (
    id, name, description, latitude, longitude, address, prefecture, google_maps_url
  ) VALUES (
    c_spot_id,
    c_spot_name,
    E'E2E 検証用の合成スポットです。\n複数行の説明が折り返して表示されることも確認します。',
    35.681236,
    139.767125,
    '東京都千代田区丸の内1-9-1',
    '東京都',
    'https://maps.google.com/?q=35.681236,139.767125'
  );

  -- ------------------------------------------------------------
  -- 出来事（source_type='live'）
  -- getSpotAppearanceSourceInfo の link 分岐（/lives/{id}）を通す。
  -- ------------------------------------------------------------
  INSERT INTO public.orbit_spot_appearances (
    id, spot_id, source_type, live_id, group_id, note, link_url
  ) VALUES (
    c_appearance_id,
    c_spot_id,
    'live',
    v_live_id,
    v_group_id,
    'E2E 検証用の出来事メモです。',
    'https://example.com/e2e-spot-appearance'
  );

  INSERT INTO public.orbit_spot_appearance_members (id, appearance_id, member_id)
  VALUES (c_member_id, c_appearance_id, v_appearance_member_id);

  -- ------------------------------------------------------------
  -- 投入後の検証（041 と同じ方針）
  -- 一部だけ入った fixture は E2E を分かりにくく落とすので、
  -- ここで件数が合わなければ seed 自体を失敗させる。
  -- ------------------------------------------------------------
  SELECT COUNT(*) INTO v_appearance_count
    FROM public.orbit_spot_appearances
   WHERE spot_id = c_spot_id;

  SELECT COUNT(*) INTO v_member_count
    FROM public.orbit_spot_appearance_members
   WHERE appearance_id = c_appearance_id;

  IF v_appearance_count <> 1 OR v_member_count <> 1 THEN
    RAISE EXCEPTION
      'E2E spot fixture の投入に失敗しました（出来事=%件 期待=1件, 関係メンバー=%件 期待=1件）',
      v_appearance_count, v_member_count;
  END IF;
END
$seed$;
