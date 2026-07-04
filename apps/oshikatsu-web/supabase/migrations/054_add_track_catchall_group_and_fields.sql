-- ============================================================
-- 054: 楽曲「グループその他」対応（#264）
-- ------------------------------------------------------------
-- 目的:
--   坂道グループ以外の楽曲（カバー・共演者の曲など）をセットリスト・
--   セトリログで扱えるようにする。現状 orbit_tracks.group_id は NOT NULL で
--   必ず既存グループに属するため、「その他」を表す受け皿グループを1行用意し、
--   その他楽曲用の項目（誰の歌か・メモ）を orbit_tracks に追加する。
--
-- 方針（#264 Design notes 論点1/2 の Recommendation A を採用）:
--   - group_id は NOT NULL のまま。「その他」= orbit_groups の受け皿1行で表す。
--   - 受け皿の識別はフラグ列 is_catchall で行う（名前判定は脆いため）。
--     アプリ側のグループ read model は既定でこの行を除外し、楽曲一覧・楽曲
--     フォーム等の限定的な文脈でのみ含める。
--   - 「誰の歌か」= artist_name / 「メモ」= note を orbit_tracks に追加
--     （その他楽曲以外では未使用・非表示。別テーブルにするほどの構造は不要）。
--
-- 変更内容:
--   (1) orbit_groups.is_catchall（BOOLEAN NOT NULL DEFAULT false）を追加。
--       受け皿は全体で1行のみを許す部分ユニークインデックスを張る。
--   (2) 「その他」グループ行を1件INSERTする（is_catchall = true）。
--       max_generation は既定値 20（010）を使う（受け皿では未使用）。
--   (3) orbit_tracks に artist_name TEXT / note TEXT を追加（NULL許容）。
--
-- RLS/Policy:
--   既存の orbit_groups / orbit_tracks のポリシー（045/046）をそのまま使う。
--   新規テーブルは無いため追加なし。列追加・行追加のみ。
--
-- artist_name / note の書き込みについて:
--   create/update_track_with_relations_v2（043）の再定義は行わない。
--   set_track_centers と同様、リポジトリが RPC 実行後に orbit_tracks へ
--   直接 UPDATE して artist_name / note を書き込む（その他楽曲はリレーションを
--   持たないため、後続の単一 UPDATE で十分。RPC のシグネチャは不変に保つ）。
--
-- ロールバック方針:
--   ALTER TABLE public.orbit_tracks DROP COLUMN artist_name, DROP COLUMN note;
--   DELETE FROM public.orbit_groups WHERE is_catchall;   -- 受け皿行を削除
--     （その他楽曲が紐づいている場合は group_id FK により削除は失敗する。
--      先に該当楽曲を移動/削除すること）
--   DROP INDEX IF EXISTS public.idx_orbit_groups_single_catchall;
--   ALTER TABLE public.orbit_groups DROP COLUMN is_catchall;
-- ============================================================

-- ============================================================
-- (1) orbit_groups.is_catchall
-- ============================================================
ALTER TABLE orbit_groups
  ADD COLUMN is_catchall BOOLEAN NOT NULL DEFAULT false;

-- 受け皿グループは全体で1行のみ（部分ユニークインデックス）。
CREATE UNIQUE INDEX idx_orbit_groups_single_catchall
  ON orbit_groups (is_catchall)
  WHERE is_catchall;

-- ============================================================
-- (2) 「その他」グループ行
-- ------------------------------------------------------------
-- name_ja は UNIQUE。色は中立的なグレー。is_active は true のまま
-- （表示可否はアプリ側の read model が is_catchall で制御する。
-- is_active には依存しない）。sort_order は末尾寄り。
-- ============================================================
INSERT INTO orbit_groups (name_ja, color, is_active, is_catchall, sort_order)
VALUES ('その他', '#9CA3AF', true, true, 9999);

-- ============================================================
-- (3) orbit_tracks: 誰の歌か / メモ
-- ============================================================
ALTER TABLE orbit_tracks
  ADD COLUMN artist_name TEXT,
  ADD COLUMN note TEXT;
