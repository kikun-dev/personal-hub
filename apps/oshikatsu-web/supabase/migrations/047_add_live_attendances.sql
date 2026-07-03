-- ============================================================
-- 047: ライブ参加記録（orbit_live_attendances）を追加する
-- ------------------------------------------------------------
-- Orbit 初のユーザー別データ。公演ごとに本人の参加記録
-- （参加種別・座席メモ・メモ）を保持する。
-- admin / viewer とも自分の記録のみ読み書きできる
-- （viewer に書き込みを許可する初のテーブル）。
-- Issue #246（アンブレラ #103）
-- ============================================================

CREATE TABLE orbit_live_attendances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  -- RESTRICT: 参加記録が紐づく公演の削除を DB レベルで拒否する。
  -- upsert_orbit_live は 048 で公演IDを維持する方式に変更しており、
  -- 通常のライブ編集ではこの制約に当たらない。公演を明示的に削除する場合のみ
  -- エラーになり、アプリ側で「参加記録がある公演は削除できない」旨を案内する
  -- （ユーザー別データのサイレント消失を防ぐ。Issue #246 レビュー指摘）。
  performance_id UUID NOT NULL REFERENCES orbit_live_performances (id) ON DELETE RESTRICT,
  -- 参加種別: 現地 / ライブビューイング / 配信
  attended_type  TEXT NOT NULL CHECK (attended_type IN ('onsite', 'live_viewing', 'streaming')),
  -- 座席の自由記述メモ（構造化・会場図マッピングは Issue #251 で検討）
  seat_note      TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, performance_id)
);

-- FK 列のインデックス（009 / 024 の教訓）
-- user_id 側は UNIQUE (user_id, performance_id) の複合インデックスが先頭一致で兼ねる
CREATE INDEX idx_orbit_live_attendances_performance_id
  ON orbit_live_attendances (performance_id);

-- ============================================================
-- RLS: 本人のみ・admin / viewer とも可
-- ------------------------------------------------------------
-- 注意: このテーブルは「グローバルデータ + 書き込みは admin のみ」という
-- 他の orbit_* テーブルの標準パターン（045/046）の例外。
-- 045 のような pg_tables からの動的一括置換を将来行う場合、
-- このテーブルを対象から除外すること。
-- ロール判定関数は 045/046 と同じものを使い、user_id は auth.uid() で本人に限定する。
-- ============================================================
ALTER TABLE orbit_live_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orbit_live_attendances_select" ON orbit_live_attendances FOR SELECT
  USING (
    (select public.has_orbit_read_role())
    AND user_id = (select auth.uid())
  );

CREATE POLICY "orbit_live_attendances_insert" ON orbit_live_attendances FOR INSERT
  WITH CHECK (
    (select public.has_orbit_read_role())
    AND user_id = (select auth.uid())
  );

CREATE POLICY "orbit_live_attendances_update" ON orbit_live_attendances FOR UPDATE
  USING (
    (select public.has_orbit_read_role())
    AND user_id = (select auth.uid())
  )
  WITH CHECK (
    (select public.has_orbit_read_role())
    AND user_id = (select auth.uid())
  );

CREATE POLICY "orbit_live_attendances_delete" ON orbit_live_attendances FOR DELETE
  USING (
    (select public.has_orbit_read_role())
    AND user_id = (select auth.uid())
  );

-- updated_at トリガ（既存の関数を再利用）
CREATE TRIGGER orbit_live_attendances_updated_at
  BEFORE UPDATE ON orbit_live_attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ロールバック方針
-- ------------------------------------------------------------
-- DROP TABLE orbit_live_attendances;（ポリシー・トリガ・インデックスは
-- テーブル削除で同時に消える。他テーブルへの影響なし）
-- ============================================================
