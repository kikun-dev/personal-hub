-- ============================================================
-- 027: Issue #62 制作陣マスタ拡張
-- - orbit_people に生年月日・担当（複数）・略歴を追加
-- ============================================================

ALTER TABLE public.orbit_people
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

ALTER TABLE public.orbit_people
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE public.orbit_people
SET roles = ARRAY[]::TEXT[]
WHERE roles IS NULL;

ALTER TABLE public.orbit_people
ALTER COLUMN roles SET NOT NULL;

ALTER TABLE public.orbit_people
ADD COLUMN IF NOT EXISTS biography TEXT;

ALTER TABLE public.orbit_people
DROP CONSTRAINT IF EXISTS orbit_people_roles_valid;

ALTER TABLE public.orbit_people
ADD CONSTRAINT orbit_people_roles_valid CHECK (
  roles <@ ARRAY[
    'lyrics',
    'music',
    'mv_director',
    'pv_director',
    'choreography',
    'costume',
    'artwork',
    'staging'
  ]::TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_orbit_people_roles_gin
  ON public.orbit_people
  USING GIN (roles);

CREATE INDEX IF NOT EXISTS idx_orbit_people_date_of_birth
  ON public.orbit_people (date_of_birth);
