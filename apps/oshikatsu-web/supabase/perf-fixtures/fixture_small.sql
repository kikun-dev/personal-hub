-- ============================================================
-- perf-fixtures: Top Page bounded read 実行計画検証用フィクスチャ（small）
-- ------------------------------------------------------------
-- Issue #383。ローカル Supabase 専用（本番へは絶対に適用しない）。
-- 適用は必ず `npx supabase db reset` 直後に行うこと（既存データとの重複/
-- 一意制約違反を避けるため）。詳細は README.md 参照。
--
-- 規模: small（アーカイブ約1年分の日付分布 + 少量の archive bulk）
-- 確定件数は README.md の表を参照。以下の DECLARE ブロックの定数が
-- 唯一の真実source（README はここから書き起こした確定値）。
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

-- 全体で1回だけ呼ぶ。以降の random() 呼び出し回数・順序をスクリプト内で
-- 固定している限り、re-run しても同じ件数・同じ日付分布になる
-- （生成される UUID 自体は gen_random_uuid() のため毎回変わるが、
-- 「決定論的」が要求しているのは件数・日付分布であり個々の UUID ではない）。
SELECT setseed(0.4242);

-- ============================================================
-- 0. 固定ユーザー（heavy / light / zero）
-- ------------------------------------------------------------
-- driver（scripts/perf/topPageDriver.perf.ts）と共有する固定 UUID / email。
-- orbit_live_attendances.user_id は auth.users への NOT DEFERRABLE な FK のため、
-- 「db reset → 本ファイル適用」のワンショットで attendance 行を作るには
-- auth.users 自体もこのファイルで作る必要がある（driver の admin API 経由の
-- 作成を先に挟む二段階運用を避けるための判断。README の「判断・妥協した点」参照）。
-- driver 側は idempotent に「無ければ作る」admin API 呼び出しを行うが、
-- 通常は本フィクスチャが先に作成済みのため no-op になる。
-- ============================================================
DO $$
DECLARE
  v_password text := 'perf-fixture-P@ssw0rd';
  v_users jsonb := '[
    {"id":"11111111-1111-4111-8111-111111111111","email":"perf-heavy@example.test"},
    {"id":"22222222-2222-4222-8222-222222222222","email":"perf-light@example.test"},
    {"id":"33333333-3333-4333-8333-333333333333","email":"perf-zero@example.test"}
  ]'::jsonb;
  v_row jsonb;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      (v_row ->> 'id')::uuid,
      'authenticated',
      'authenticated',
      v_row ->> 'email',
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"viewer"}'::jsonb,
      '{}'::jsonb,
      now(), now(), '', '', '', '', false, false
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(),
      v_row ->> 'id',
      (v_row ->> 'id')::uuid,
      jsonb_build_object('sub', v_row ->> 'id', 'email', v_row ->> 'email'),
      'email', now(), now(), now()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- 1. members（誕生日分布 + グループ所属）
-- ------------------------------------------------------------
DO $$
DECLARE
  c_member_count int := 30;
  c_graduation_every_n int := 0; -- 0 = 卒業者を作らない（small/medium）
  v_group_ids uuid[];
  i int;
  v_id uuid;
  v_month int;
  v_day int;
  v_year int;
  v_joined date;
  v_graduated date;
BEGIN
  SELECT array_agg(id ORDER BY sort_order) INTO v_group_ids
  FROM orbit_groups WHERE NOT is_catchall;

  FOR i IN 1..c_member_count LOOP
    v_id := gen_random_uuid();

    -- 7/19生まれを複数（先頭3人）に強制し、残りは月を round-robin して全月に分布させる。
    IF i <= 3 THEN
      v_month := 7;
      v_day := 19;
      v_year := 1998 + (i % 10);
    ELSE
      v_month := ((i - 1) % 12) + 1;
      v_day := 1 + ((i * 7 + 3) % 27); -- 27まで: 2月でも安全
      v_year := 1998 + (i % 12);
    END IF;

    v_joined := DATE '2026-07-19' - ((5 + (i % 10)) * INTERVAL '1 year');
    IF c_graduation_every_n > 0 AND i % c_graduation_every_n = 0 THEN
      v_graduated := DATE '2026-07-19' - ((1 + (i % 5)) * INTERVAL '1 year');
    ELSE
      v_graduated := NULL;
    END IF;

    INSERT INTO orbit_members (id, name_ja, name_kana, date_of_birth)
    VALUES (
      v_id,
      'perf-fixture会員' || i,
      'ぱふぉーまんすかいいん' || i,
      make_date(v_year, v_month, v_day)
    );

    INSERT INTO orbit_member_groups (member_id, group_id, generation, joined_at, graduated_at)
    VALUES (
      v_id,
      v_group_ids[1 + ((i - 1) % array_length(v_group_ids, 1))],
      NULL,
      v_joined,
      v_graduated
    );
  END LOOP;

  RAISE NOTICE 'perf-fixture: members inserted = %', c_member_count;
END $$;

-- ============================================================
-- 2. events（orbit_events + orbit_event_groups）
-- ------------------------------------------------------------
-- 日付バケット構成（events/performances/releases/videosの4ドメイン共通）:
--   K: on-this-day（過去各年の7/19、年数はスケールごとに変える）
--   M(3): 当月特異日 [2026-07-19(today/selectedA), 2026-07-05(selectedB), 2026-07-28(next-events候補)]
--   F(4): next-events窓（today+12ヶ月以内）の未来特異日
--   S(2): 選択月が12ヶ月窓の外になるシナリオ（2026-07-19 today / 選択2024-03-10）用の特異日
--   R: 残りは archive 全期間にランダム分散（bulk、realistic selectivity 用）
DO $$
DECLARE
  c_event_count int := 60;
  c_onthisday_years int[] := ARRAY[2025];
  v_event_type_ids uuid[];
  v_group_ids uuid[];
  v_dates date[];
  v_bulk_count int;
  v_reserved_count int;
BEGIN
  SELECT array_agg(id ORDER BY sort_order) INTO v_event_type_ids FROM orbit_event_types;
  SELECT array_agg(id ORDER BY sort_order) INTO v_group_ids FROM orbit_groups WHERE NOT is_catchall;

  SELECT array_agg(make_date(y, 7, 19)) INTO v_dates FROM unnest(c_onthisday_years) AS y;
  v_dates := v_dates
    || ARRAY[DATE '2026-07-19', DATE '2026-07-05', DATE '2026-07-28']
    || ARRAY[DATE '2026-09-10', DATE '2026-12-24', DATE '2027-03-01', DATE '2027-06-30']
    || ARRAY[DATE '2024-03-10', DATE '2024-03-22'];

  v_reserved_count := array_length(v_dates, 1);
  v_bulk_count := c_event_count - v_reserved_count;
  IF v_bulk_count < 0 THEN
    RAISE EXCEPTION 'c_event_count(%) は予約バケット件数(%)以上にすること', c_event_count, v_reserved_count;
  END IF;

  v_dates := v_dates || (
    SELECT array_agg(DATE '2014-01-01' + trunc(random() * (DATE '2026-06-30' - DATE '2014-01-01'))::int)
    FROM generate_series(1, v_bulk_count)
  );

  WITH d AS (
    SELECT gen_random_uuid() AS event_id, d AS event_date, idx
    FROM unnest(v_dates) WITH ORDINALITY AS t(d, idx)
  ),
  ins_events AS (
    INSERT INTO orbit_events (id, event_type_id, title, description, date, venue, is_member_history)
    SELECT
      event_id,
      v_event_type_ids[1 + ((idx - 1) % array_length(v_event_type_ids, 1))],
      'perf-fixtureイベント ' || idx,
      '',
      event_date,
      'perf-fixture会場',
      false
    FROM d
  )
  INSERT INTO orbit_event_groups (event_id, group_id)
  SELECT event_id, v_group_ids[1 + ((idx - 1) % array_length(v_group_ids, 1))]
  FROM d;

  RAISE NOTICE 'perf-fixture: events inserted = % (reserved=%, bulk=%)', c_event_count, v_reserved_count, v_bulk_count;
END $$;

-- ============================================================
-- 3. lives + performances + performer_groups
-- ------------------------------------------------------------
DO $$
DECLARE
  c_perf_count int := 30;
  c_onthisday_years int[] := ARRAY[2025];
  v_group_ids uuid[];
  v_venue_ids uuid[];
  v_dates date[];
  v_bulk_count int;
  v_reserved_count int;
  v_live_types text[] := ARRAY['single', 'tour', 'festival', 'online', 'other'];
BEGIN
  SELECT array_agg(id ORDER BY sort_order) INTO v_group_ids FROM orbit_groups WHERE NOT is_catchall;
  SELECT array_agg(id) INTO v_venue_ids FROM orbit_venues;

  SELECT array_agg(make_date(y, 7, 19)) INTO v_dates FROM unnest(c_onthisday_years) AS y;
  v_dates := v_dates
    || ARRAY[DATE '2026-07-19', DATE '2026-07-05', DATE '2026-07-28']
    || ARRAY[DATE '2026-09-10', DATE '2026-12-24', DATE '2027-03-01', DATE '2027-06-30']
    || ARRAY[DATE '2024-03-10', DATE '2024-03-22'];

  v_reserved_count := array_length(v_dates, 1);
  v_bulk_count := c_perf_count - v_reserved_count;
  IF v_bulk_count < 0 THEN
    RAISE EXCEPTION 'c_perf_count(%) は予約バケット件数(%)以上にすること', c_perf_count, v_reserved_count;
  END IF;

  v_dates := v_dates || (
    SELECT array_agg(DATE '2014-01-01' + trunc(random() * (DATE '2026-06-30' - DATE '2014-01-01'))::int)
    FROM generate_series(1, v_bulk_count)
  );

  WITH d AS (
    SELECT
      gen_random_uuid() AS live_id,
      gen_random_uuid() AS perf_id,
      d AS perf_date,
      idx
    FROM unnest(v_dates) WITH ORDINALITY AS t(d, idx)
  ),
  ins_lives AS (
    INSERT INTO orbit_lives (id, name, live_type, description)
    SELECT
      live_id,
      'perf-fixtureライブ ' || idx,
      v_live_types[1 + ((idx - 1) % array_length(v_live_types, 1))],
      ''
    FROM d
  ),
  ins_perf AS (
    INSERT INTO orbit_live_performances (
      id, live_id, venue_id, performance_date, doors_open_at, starts_at,
      has_streaming, has_live_viewing, sort_order
    )
    SELECT
      perf_id,
      live_id,
      v_venue_ids[1 + ((idx - 1) % array_length(v_venue_ids, 1))],
      perf_date,
      '17:30',
      '18:30',
      false,
      false,
      0
    FROM d
  )
  INSERT INTO orbit_live_performer_groups (live_id, group_id)
  SELECT live_id, v_group_ids[1 + ((idx - 1) % array_length(v_group_ids, 1))]
  FROM d;

  RAISE NOTICE 'perf-fixture: performances inserted = % (reserved=%, bulk=%)', c_perf_count, v_reserved_count, v_bulk_count;
END $$;

-- ============================================================
-- 4. releases
-- ------------------------------------------------------------
DO $$
DECLARE
  c_release_count int := 10;
  c_onthisday_years int[] := ARRAY[2025];
  v_group_ids uuid[];
  v_dates date[];
  v_bulk_count int;
  v_reserved_count int;
BEGIN
  SELECT array_agg(id ORDER BY sort_order) INTO v_group_ids FROM orbit_groups WHERE NOT is_catchall;

  SELECT array_agg(make_date(y, 7, 19)) INTO v_dates FROM unnest(c_onthisday_years) AS y;
  v_dates := v_dates
    || ARRAY[DATE '2026-07-19', DATE '2026-07-05', DATE '2026-07-28']
    || ARRAY[DATE '2026-09-10', DATE '2026-12-24', DATE '2027-03-01', DATE '2027-06-30']
    || ARRAY[DATE '2024-03-10', DATE '2024-03-22'];

  v_reserved_count := array_length(v_dates, 1);
  v_bulk_count := c_release_count - v_reserved_count;
  IF v_bulk_count < 0 THEN
    RAISE EXCEPTION 'c_release_count(%) は予約バケット件数(%)以上にすること', c_release_count, v_reserved_count;
  END IF;

  IF v_bulk_count > 0 THEN
    v_dates := v_dates || (
      SELECT array_agg(DATE '2014-01-01' + trunc(random() * (DATE '2026-06-30' - DATE '2014-01-01'))::int)
      FROM generate_series(1, v_bulk_count)
    );
  END IF;

  INSERT INTO orbit_releases (id, title, group_id, release_type, numbering, release_date)
  SELECT
    gen_random_uuid(),
    'perf-fixtureリリース ' || idx,
    v_group_ids[1 + ((idx - 1) % array_length(v_group_ids, 1))],
    'digital_single',
    NULL,
    d
  FROM unnest(v_dates) WITH ORDINALITY AS t(d, idx);

  RAISE NOTICE 'perf-fixture: releases inserted = % (reserved=%, bulk=%)', c_release_count, v_reserved_count, v_bulk_count;
END $$;

-- ============================================================
-- 5. track_mvs（既存 orbit_tracks を再利用。track_id は UNIQUE のため
--    fixture 内で重複しない distinct track を使う）
-- ------------------------------------------------------------
DO $$
DECLARE
  c_mv_count int := 15;
  c_onthisday_years int[] := ARRAY[2025];
  v_dates date[];
  v_bulk_count int;
  v_reserved_count int;
  v_track_pool_size int;
BEGIN
  SELECT count(*) INTO v_track_pool_size FROM orbit_tracks;

  SELECT array_agg(make_date(y, 7, 19)) INTO v_dates FROM unnest(c_onthisday_years) AS y;
  v_dates := v_dates
    || ARRAY[DATE '2026-07-19', DATE '2026-07-05', DATE '2026-07-28']
    || ARRAY[DATE '2026-09-10', DATE '2026-12-24', DATE '2027-03-01', DATE '2027-06-30']
    || ARRAY[DATE '2024-03-10', DATE '2024-03-22'];

  v_reserved_count := array_length(v_dates, 1);
  v_bulk_count := c_mv_count - v_reserved_count;
  IF v_bulk_count < 0 THEN
    RAISE EXCEPTION 'c_mv_count(%) は予約バケット件数(%)以上にすること', c_mv_count, v_reserved_count;
  END IF;
  IF c_mv_count > v_track_pool_size THEN
    RAISE EXCEPTION 'c_mv_count(%) が既存 orbit_tracks 件数(%) を超えている（track_id は UNIQUE）', c_mv_count, v_track_pool_size;
  END IF;

  IF v_bulk_count > 0 THEN
    v_dates := v_dates || (
      SELECT array_agg(DATE '2014-01-01' + trunc(random() * (DATE '2026-06-30' - DATE '2014-01-01'))::int)
      FROM generate_series(1, v_bulk_count)
    );
  END IF;

  WITH pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn FROM orbit_tracks
  ),
  d AS (
    SELECT p.id AS track_id, u.d AS pub_date
    FROM unnest(v_dates) WITH ORDINALITY AS u(d, idx)
    JOIN pool p ON p.rn = u.idx
  )
  INSERT INTO orbit_track_mvs (id, track_id, mv_url, published_on)
  SELECT gen_random_uuid(), track_id, 'https://example.test/perf-fixture/mv/' || track_id, pub_date
  FROM d;

  RAISE NOTICE 'perf-fixture: track_mvs inserted = % (reserved=%, bulk=%)', c_mv_count, v_reserved_count, v_bulk_count;
END $$;

-- ============================================================
-- 6. track_videos（既存 orbit_tracks を再利用。(track_id, video_type) が
--    UNIQUE のため、track 2件につき dance_practice/call を1件ずつ使う）
-- ------------------------------------------------------------
DO $$
DECLARE
  c_video_count int := 30;
  c_onthisday_years int[] := ARRAY[2025];
  v_dates date[];
  v_bulk_count int;
  v_reserved_count int;
  v_track_pool_size int;
  v_needed_tracks int;
BEGIN
  SELECT count(*) INTO v_track_pool_size FROM orbit_tracks;

  SELECT array_agg(make_date(y, 7, 19)) INTO v_dates FROM unnest(c_onthisday_years) AS y;
  v_dates := v_dates
    || ARRAY[DATE '2026-07-19', DATE '2026-07-05', DATE '2026-07-28']
    || ARRAY[DATE '2026-09-10', DATE '2026-12-24', DATE '2027-03-01', DATE '2027-06-30']
    || ARRAY[DATE '2024-03-10', DATE '2024-03-22'];

  v_reserved_count := array_length(v_dates, 1);
  v_bulk_count := c_video_count - v_reserved_count;
  IF v_bulk_count < 0 THEN
    RAISE EXCEPTION 'c_video_count(%) は予約バケット件数(%)以上にすること', c_video_count, v_reserved_count;
  END IF;

  v_needed_tracks := ceil(c_video_count / 2.0)::int;
  IF v_needed_tracks > v_track_pool_size THEN
    RAISE EXCEPTION 'c_video_count(%) に必要な distinct track 数(%) が既存 orbit_tracks 件数(%) を超えている', c_video_count, v_needed_tracks, v_track_pool_size;
  END IF;

  IF v_bulk_count > 0 THEN
    v_dates := v_dates || (
      SELECT array_agg(DATE '2014-01-01' + trunc(random() * (DATE '2026-06-30' - DATE '2014-01-01'))::int)
      FROM generate_series(1, v_bulk_count)
    );
  END IF;

  WITH pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn FROM orbit_tracks
  ),
  d AS (
    SELECT
      p.id AS track_id,
      u.d AS pub_date,
      CASE WHEN u.idx % 2 = 1 THEN 'dance_practice' ELSE 'call' END AS video_type
    FROM unnest(v_dates) WITH ORDINALITY AS u(d, idx)
    JOIN pool p ON p.rn = ((u.idx - 1) / 2) + 1
  )
  INSERT INTO orbit_track_videos (id, track_id, video_type, video_url, published_on)
  SELECT gen_random_uuid(), track_id, video_type, 'https://example.test/perf-fixture/video/' || track_id || '/' || video_type, pub_date
  FROM d;

  RAISE NOTICE 'perf-fixture: track_videos inserted = % (reserved=%, bulk=%)', c_video_count, v_reserved_count, v_bulk_count;
END $$;

-- ============================================================
-- 7. attendance（heavy / light / zero）
-- ------------------------------------------------------------
-- heavy/light ユーザーは「performance_date が today 未満の直近 N 件」を対象にする
-- （findRecentForUser の対象条件と揃え、bounded read の selectivity を検証しやすくする）。
DO $$
DECLARE
  c_heavy_count int := 10;
  c_light_count int := 3;
  v_heavy_user uuid := '11111111-1111-4111-8111-111111111111';
  v_light_user uuid := '22222222-2222-4222-8222-222222222222';
  v_attended_types text[] := ARRAY['onsite', 'live_viewing', 'streaming'];
BEGIN
  INSERT INTO orbit_live_attendances (user_id, performance_id, attended_type)
  SELECT
    v_heavy_user,
    id,
    v_attended_types[1 + ((row_number() OVER (ORDER BY performance_date DESC, id) - 1) % 3)]
  FROM (
    SELECT id, performance_date
    FROM orbit_live_performances
    WHERE performance_date IS NOT NULL AND performance_date < DATE '2026-07-19'
    ORDER BY performance_date DESC, id
    LIMIT c_heavy_count
  ) sub;

  INSERT INTO orbit_live_attendances (user_id, performance_id, attended_type)
  SELECT
    v_light_user,
    id,
    v_attended_types[1 + ((row_number() OVER (ORDER BY performance_date DESC, id) - 1) % 3)]
  FROM (
    SELECT id, performance_date
    FROM orbit_live_performances
    WHERE performance_date IS NOT NULL AND performance_date < DATE '2026-07-19'
    ORDER BY performance_date DESC, id
    LIMIT c_light_count
  ) sub;

  -- zero user は attendance を作らない（selectivity比較の対照群）。

  RAISE NOTICE 'perf-fixture: attendance inserted heavy=% light=% zero=0', c_heavy_count, c_light_count;
END $$;

-- ============================================================
-- 検証用サマリ
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '--- perf-fixture summary (small) ---';
  RAISE NOTICE 'orbit_members(total)=%', (SELECT count(*) FROM orbit_members);
  RAISE NOTICE 'orbit_events(total)=%', (SELECT count(*) FROM orbit_events);
  RAISE NOTICE 'orbit_lives(total)=%, orbit_live_performances(total)=%',
    (SELECT count(*) FROM orbit_lives), (SELECT count(*) FROM orbit_live_performances);
  RAISE NOTICE 'orbit_releases(total)=%', (SELECT count(*) FROM orbit_releases);
  RAISE NOTICE 'orbit_track_mvs(total)=%, orbit_track_videos(total)=%',
    (SELECT count(*) FROM orbit_track_mvs), (SELECT count(*) FROM orbit_track_videos);
  RAISE NOTICE 'orbit_live_attendances(total)=%', (SELECT count(*) FROM orbit_live_attendances);
  RAISE NOTICE 'auth.users(total)=%', (SELECT count(*) FROM auth.users);
END $$;

COMMIT;
