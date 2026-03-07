-- ============================================================
-- orbit_members.blood_type: 「不明」を許可
-- ============================================================
ALTER TABLE orbit_members
  DROP CONSTRAINT IF EXISTS orbit_members_blood_type_check;

ALTER TABLE orbit_members
  ADD CONSTRAINT orbit_members_blood_type_check
  CHECK (blood_type IN ('A', 'B', 'O', 'AB', '不明'));
