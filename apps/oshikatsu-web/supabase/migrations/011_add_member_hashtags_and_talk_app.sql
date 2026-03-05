-- ============================================================
-- メンバー: ブログ/トークアプリ + ハッシュタグ
-- ============================================================
ALTER TABLE orbit_members
  ADD COLUMN blog_hashtag TEXT,
  ADD COLUMN talk_app_name TEXT,
  ADD COLUMN talk_app_url TEXT,
  ADD COLUMN talk_app_hashtag TEXT;

ALTER TABLE orbit_members
  ADD CONSTRAINT orbit_members_blog_hashtag_check
  CHECK (blog_hashtag IS NULL OR left(blog_hashtag, 1) = '#');

ALTER TABLE orbit_members
  ADD CONSTRAINT orbit_members_talk_app_hashtag_check
  CHECK (talk_app_hashtag IS NULL OR left(talk_app_hashtag, 1) = '#');

-- ============================================================
-- SNS: ハッシュタグ
-- ============================================================
ALTER TABLE orbit_member_sns
  ADD COLUMN hashtag TEXT;

ALTER TABLE orbit_member_sns
  ADD CONSTRAINT orbit_member_sns_hashtag_check
  CHECK (hashtag IS NULL OR left(hashtag, 1) = '#');
