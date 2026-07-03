-- ============================================================
-- 049: orbit_live_attendances.performance_id の FK を RESTRICT → CASCADE に変更する
-- ------------------------------------------------------------
-- 経緯:
--   047 では「参加記録が紐づく公演の削除を DB レベルで拒否する」ため
--   ON DELETE RESTRICT を採用した（ユーザー別データのサイレント消失防止）。
--   しかし RLS により、admin であっても自分以外（viewer 等）の参加記録は
--   見えず・消せない。そのため「viewer の参加記録が付いた公演」は
--   admin が編集・削除しようとしても RESTRICT 違反で手詰まりになる
--   （Issue #246 / PR #253 レビュー議論）。
--
--   公演・ライブの削除は admin 限定の操作であり、アプリ側（LiveForm）で
--   「削除される公演に参加記録が登録されている場合、参加記録も一緒に
--   削除される」旨を明示確認した上で削除を実行する方針に変更する。
--   DB レベルでは ON DELETE CASCADE にして、確認済みの削除がブロック
--   されないようにする。
--
--   048 で導入した「upsert_orbit_live が公演IDを維持する」方式は
--   引き続き有効かつ重要: これが無いと通常のライブ編集のたびに
--   全公演が DELETE→再INSERTされ、CASCADE によって参加記録が
--   毎回サイレントに全消失してしまう。048 により「payload に id が
--   含まれる公演」は UPDATE 扱いになるため、公演自体を削除しない
--   通常編集では CASCADE は発火しない。
--
-- 制約名:
--   047 適用時の自動生成名 orbit_live_attendances_performance_id_fkey を想定。
--
-- ロールバック方針:
--   本SQLと同じ手順で ON DELETE RESTRICT に戻す
--   （DROP CONSTRAINT → ADD CONSTRAINT ... REFERENCES ... ON DELETE RESTRICT）。
-- ============================================================

ALTER TABLE orbit_live_attendances
  DROP CONSTRAINT IF EXISTS orbit_live_attendances_performance_id_fkey;

ALTER TABLE orbit_live_attendances
  ADD CONSTRAINT orbit_live_attendances_performance_id_fkey
  FOREIGN KEY (performance_id)
  REFERENCES orbit_live_performances (id)
  ON DELETE CASCADE;
