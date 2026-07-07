-- ============================================================
-- 061: Wiki的静的ページ集の閲覧基盤（#313 / #312 Decision）
-- ------------------------------------------------------------
-- 目的:
--   オーディション関係・遠征持ち物リスト・外部リンク集など「参照」がメインの
--   静的ページ集を保持するテーブルを追加する。#312 の Decision により、
--   コンテンツ源はリポジトリ内 Markdown ファイルではなく DB テーブル
--   （本テーブル）とし、レンダリングは react-markdown を使う。
--
-- 変更内容:
--   orbit_wiki_pages テーブルを新設する。
--   - slug は URL（/wiki/[slug]）に使う一意キー
--   - body_markdown は Markdown 本文（デフォルト空文字。作成直後の
--     空ページを許容する）
--   - sort_order は一覧（/wiki）の表示順（既定は同値のため title 昇順で補完）
--   - updated_at は 029/055 と同じ update_updated_at() トリガーで自動更新
--
--   RLS は 045/046 の標準パターン（グローバルテーブル）に合わせる。
--   SELECT = has_orbit_read_role()（admin/viewer 共通）、
--   INSERT/UPDATE/DELETE = is_orbit_admin()。
--   本 Issue（#313）は閲覧のみが対象だが、書き込みポリシーも他テーブルと
--   同様に先行して定義しておく（#314 で書き込み導線を追加する際に
--   migration 不要にするため）。
--
-- ロールバック方針:
--   DROP TABLE orbit_wiki_pages;
--   （トリガー・ポリシー・インデックスはテーブル削除で同時に消える）
-- ============================================================

CREATE TABLE orbit_wiki_pages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  body_markdown  TEXT NOT NULL DEFAULT '',
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS: グローバルテーブルの標準パターン（045/046）。
-- select = has_orbit_read_role() / insert・update・delete = is_orbit_admin()
-- ============================================================
ALTER TABLE orbit_wiki_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_wiki_pages_select" ON orbit_wiki_pages FOR SELECT
  USING ((select public.has_orbit_read_role()));
CREATE POLICY "orbit_wiki_pages_insert" ON orbit_wiki_pages FOR INSERT
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_wiki_pages_update" ON orbit_wiki_pages FOR UPDATE
  USING ((select public.is_orbit_admin()))
  WITH CHECK ((select public.is_orbit_admin()));
CREATE POLICY "orbit_wiki_pages_delete" ON orbit_wiki_pages FOR DELETE
  USING ((select public.is_orbit_admin()));

CREATE TRIGGER orbit_wiki_pages_updated_at
  BEFORE UPDATE ON orbit_wiki_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
