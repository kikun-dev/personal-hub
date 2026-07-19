# Top Page DB Execution Plan Validation — 実行計画 Appendix（large fixture）

[本文](./2026-07-19-sakalog-top-page-db-execution-plan-validation.md)の §6 から参照される代表 plan。
large fixture・today シナリオ（attendance は heavy #1 / light #2）の auto_explain 出力から、
JWT・request header・Query Parameters を除去したもの。全 plan の再現は scripts/perf/README.md を参照。

### events_range  (duration: 1.931 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_events"."id", "public"."orbit_events"."event_type_id", "public"."orbit_events"."is_member_history", "public"."orbit_events"."title", "public"."orbit_events"."date", "public"."orbit_events"."end_date", "public"."orbit_events"."start_time", "public"."orbit_events"."venue", row_to_json("orbit_events_orbit_event_types_1".*)::jsonb AS "orbit_event_types", COALESCE( "orbit_events_orbit_event_groups_1"."orbit_events_orbit_event_groups_1", '[]') AS "orbit_event_groups" FROM "public"."orbit_events" LEFT JOIN LATERAL ( SELECT "orbit_event_types_1"."name", "orbit_event_types_1"."color" FROM "public"."orbit_event_types" AS "orbit_event_types_1" WHERE "orbit_event_types_1"."id" = "public"."orbit_events"."event_type_id"   LIMIT $1 OFFSET $2 ) AS "orbit_events_orbit_event_types_1" ON TRUE  LEFT JOIN LATERAL ( SELECT json_agg("orbit_events_orbit_event_groups_1")::jsonb AS "orbit_events_orbit_event_groups_1" FROM (SELECT "orbit_event_groups_1"."group_id", row_to_json("orbit_event_groups_orbit_groups_2".*)::jsonb AS "orbit_groups" FROM "public"."orbit_event_groups" AS "orbit_event_groups_1" LEFT JOIN LATERAL ( SELECT "orbit_groups_2"."name_ja" FROM "public"."orbit_groups" AS "orbit_groups_2" WHERE "orbit_groups_2"."id" = "orbit_event_groups_1"."group_id"   LIMIT $3 OFFSET $4 ) AS "orbit_event_groups_orbit_groups_2" ON TRUE WHERE "orbit_event_groups_1"."event_id" = "public"."orbit_events"."id"   LIMIT $5 OFFSET $6 ) AS "orbit_events_orbit_event_groups_1" ) AS "orbit_events_orbit_event_groups_1" ON TRUE WHERE  ( ( "public"."orbit_events"."date" >= $7 AND  "public"."orbit_events"."date" < $8))  ORDER BY "public"."orbit_events"."date" ASC , "public"."orbit_events"."start_time" ASC NULLS LAST LIMIT $9 OFFSET $10 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=35.87..35.89 rows=1 width=144) (actual time=1.913..1.919 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, ((row_to_json(orbit_events_orbit_event_types_1.*))::jsonb), (COALESCE(((json_agg(orbit_events_orbit_event_groups_1.*))::jsonb), '[]'::jsonb)))), COALESCE(json_agg(ROW(orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, ((row_to_json(orbit_events_orbit_event_types_1.*))::jsonb), (COALESCE(((json_agg(orbit_events_orbit_event_groups_1.*))::jsonb), '[]'::jsonb)))), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=104
	  ->  Limit  (cost=35.86..35.86 rows=1 width=177) (actual time=1.843..1.851 rows=7 loops=1)
	        Output: orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, ((row_to_json(orbit_events_orbit_event_types_1.*))::jsonb), (COALESCE(((json_agg(orbit_events_orbit_event_groups_1.*))::jsonb), '[]'::jsonb))
	        Buffers: shared hit=104
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.668..0.668 rows=1 loops=1)
	                Output: has_orbit_read_role()
	                Buffers: shared hit=51
	        ->  Sort  (cost=35.60..35.60 rows=1 width=177) (actual time=1.840..1.846 rows=7 loops=1)
	              Output: orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, ((row_to_json(orbit_events_orbit_event_types_1.*))::jsonb), (COALESCE(((json_agg(orbit_events_orbit_event_groups_1.*))::jsonb), '[]'::jsonb))
	              Sort Key: orbit_events.date, orbit_events.start_time
	              Sort Method: quicksort  Memory: 28kB
	              Buffers: shared hit=104
	              ->  Nested Loop Left Join  (cost=21.84..35.59 rows=1 width=177) (actual time=1.597..1.794 rows=7 loops=1)
	                    Output: orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, (row_to_json(orbit_events_orbit_event_types_1.*))::jsonb, COALESCE(((json_agg(orbit_events_orbit_event_groups_1.*))::jsonb), '[]'::jsonb)
	                    Buffers: shared hit=96
	                    ->  Nested Loop Left Join  (cost=4.70..18.42 rows=1 width=201) (actual time=1.041..1.086 rows=7 loops=1)
	                          Output: orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue, orbit_events_orbit_event_types_1.*
	                          Buffers: shared hit=68
	                          ->  Bitmap Heap Scan on public.orbit_events  (cost=4.29..9.97 rows=1 width=113) (actual time=0.729..0.737 rows=7 loops=1)
	                                Output: orbit_events.id, orbit_events.event_type_id, orbit_events.is_member_history, orbit_events.title, orbit_events.date, orbit_events.end_date, orbit_events.start_time, orbit_events.venue
	                                Recheck Cond: ((orbit_events.date >= '2026-07-01'::date) AND (orbit_events.date < '2027-07-01'::date))
	                                Filter: (InitPlan 1).col1
	                                Heap Blocks: exact=1
	                                Buffers: shared hit=54
	                                ->  Bitmap Index Scan on idx_orbit_events_date_range  (cost=0.00..4.29 rows=2 width=0) (actual time=0.019..0.019 rows=7 loops=1)
	                                      Index Cond: ((orbit_events.date >= '2026-07-01'::date) AND (orbit_events.date < '2027-07-01'::date))
	                                      Buffers: shared hit=2
	                          ->  Subquery Scan on orbit_events_orbit_event_types_1  (cost=0.41..8.44 rows=1 width=88) (actual time=0.047..0.049 rows=1 loops=7)
	                                Output: orbit_events_orbit_event_types_1.*
	                                Buffers: shared hit=14
	                                ->  Limit  (cost=0.41..8.43 rows=1 width=64) (actual time=0.044..0.045 rows=1 loops=7)
	                                      Output: orbit_event_types_1.name, orbit_event_types_1.color
	                                      Buffers: shared hit=14
	                                      InitPlan 2
	                                        ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.241..0.242 rows=1 loops=1)
	                                              Output: has_orbit_read_role()
	                                      ->  Index Scan using orbit_event_types_pkey on public.orbit_event_types orbit_event_types_1  (cost=0.15..8.17 rows=1 width=64) (actual time=0.043..0.044 rows=1 loops=7)
	                                            Output: orbit_event_types_1.name, orbit_event_types_1.color
	                                            Index Cond: (orbit_event_types_1.id = orbit_events.event_type_id)
	                                            Filter: (InitPlan 2).col1
	                                            Buffers: shared hit=14
	                    ->  Aggregate  (cost=17.14..17.15 rows=1 width=32) (actual time=0.097..0.098 rows=1 loops=7)
	                          Output: (json_agg(orbit_events_orbit_event_groups_1.*))::jsonb
	                          Buffers: shared hit=28
	                          ->  Subquery Scan on orbit_events_orbit_event_groups_1  (cost=4.84..17.13 rows=3 width=40) (actual time=0.088..0.090 rows=1 loops=7)
	                                Output: orbit_events_orbit_event_groups_1.*
	                                Buffers: shared hit=28
	                                ->  Limit  (cost=4.84..17.10 rows=3 width=48) (actual time=0.087..0.089 rows=1 loops=7)
	                                      Output: orbit_event_groups_1.group_id, ((row_to_json(orbit_event_groups_orbit_groups_2.*))::jsonb)
	                                      Buffers: shared hit=28
	                                      InitPlan 3
	                                        ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.216..0.216 rows=1 loops=1)
	                                              Output: has_orbit_read_role()
	                                      ->  Nested Loop Left Join  (cost=4.58..16.84 rows=3 width=48) (actual time=0.086..0.088 rows=1 loops=7)
	                                            Output: orbit_event_groups_1.group_id, (row_to_json(orbit_event_groups_orbit_groups_2.*))::jsonb
	                                            Buffers: shared hit=28
	                                            ->  Bitmap Heap Scan on public.orbit_event_groups orbit_event_groups_1  (cost=4.32..12.79 rows=3 width=16) (actual time=0.042..0.043 rows=1 loops=7)
	                                                  Output: orbit_event_groups_1.id, orbit_event_groups_1.event_id, orbit_event_groups_1.group_id
	                                                  Recheck Cond: (orbit_event_groups_1.event_id = orbit_events.id)
	                                                  Filter: (InitPlan 3).col1
	                                                  Heap Blocks: exact=7
	                                                  Buffers: shared hit=21
	                                                  ->  Bitmap Index Scan on idx_orbit_event_groups_unique  (cost=0.00..4.31 rows=5 width=0) (actual time=0.008..0.008 rows=1 loops=7)
	                                                        Index Cond: (orbit_event_groups_1.event_id = orbit_events.id)
	                                                        Buffers: shared hit=14
	                                            ->  Subquery Scan on orbit_event_groups_orbit_groups_2  (cost=0.26..1.33 rows=1 width=56) (actual time=0.038..0.039 rows=1 loops=7)
	                                                  Output: orbit_event_groups_orbit_groups_2.*
	                                                  Buffers: shared hit=7
	                                                  ->  Limit  (cost=0.26..1.32 rows=1 width=32) (actual time=0.036..0.037 rows=1 loops=7)
	                                                        Output: orbit_groups_2.name_ja
	                                                        Buffers: shared hit=7
	                                                        InitPlan 4
	                                                          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.217..0.218 rows=1 loops=1)
	                                                                Output: has_orbit_read_role()
	                                                        ->  Seq Scan on public.orbit_groups orbit_groups_2  (cost=0.00..1.06 rows=1 width=32) (actual time=0.035..0.036 rows=1 loops=7)
	                                                              Output: orbit_groups_2.name_ja
	                                                              Filter: ((InitPlan 4).col1 AND (orbit_groups_2.id = orbit_event_groups_1.group_id))
	                                                              Rows Removed by Filter: 5
	                                                              Buffers: shared hit=7
	Query Identifier: 960137621227491867
```

### birthdays  (duration: 2.253 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_members"."id", "public"."orbit_members"."name_ja", "public"."orbit_members"."name_kana", "public"."orbit_members"."date_of_birth", COALESCE( "orbit_members_orbit_member_groups_1"."orbit_members_orbit_member_groups_1", '[]') AS "orbit_member_groups" FROM "public"."orbit_members" LEFT JOIN LATERAL ( SELECT json_agg("orbit_members_orbit_member_groups_1")::jsonb AS "orbit_members_orbit_member_groups_1" FROM (SELECT "orbit_member_groups_1"."id", "orbit_member_groups_1"."joined_at", row_to_json("orbit_member_groups_orbit_groups_2".*)::jsonb AS "orbit_groups" FROM "public"."orbit_member_groups" AS "orbit_member_groups_1" LEFT JOIN LATERAL ( SELECT "orbit_groups_2"."name_ja", "orbit_groups_2"."sort_order" FROM "public"."orbit_groups" AS "orbit_groups_2" WHERE "orbit_groups_2"."id" = "orbit_member_groups_1"."group_id"   LIMIT $1 OFFSET $2 ) AS "orbit_member_groups_orbit_groups_2" ON TRUE WHERE "orbit_member_groups_1"."member_id" = "public"."orbit_members"."id"   LIMIT $3 OFFSET $4 ) AS "orbit_members_orbit_member_groups_1" ) AS "orbit_members_orbit_member_groups_1" ON TRUE WHERE NOT "public"."orbit_members"."date_of_birth" IS NULL   LIMIT $5 OFFSET $6 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=940.96..940.98 rows=1 width=144) (actual time=2.113..2.116 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_members.id, orbit_members.name_ja, orbit_members.name_kana, orbit_members.date_of_birth, (COALESCE(((json_agg(orbit_members_orbit_member_groups_1.*))::jsonb), '[]'::jsonb)))), COALESCE(json_agg(ROW(orbit_members.id, orbit_members.name_ja, orbit_members.name_kana, orbit_members.date_of_birth, (COALESCE(((json_agg(orbit_members_orbit_member_groups_1.*))::jsonb), '[]'::jsonb)))), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=272
	  ->  Limit  (cost=14.53..940.64 rows=65 width=116) (actual time=0.569..1.832 rows=90 loops=1)
	        Output: orbit_members.id, orbit_members.name_ja, orbit_members.name_kana, orbit_members.date_of_birth, (COALESCE(((json_agg(orbit_members_orbit_member_groups_1.*))::jsonb), '[]'::jsonb))
	        Buffers: shared hit=272
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.205..0.205 rows=1 loops=1)
	                Output: has_orbit_read_role()
	        ->  Nested Loop Left Join  (cost=14.27..940.38 rows=65 width=116) (actual time=0.568..1.805 rows=90 loops=1)
	              Output: orbit_members.id, orbit_members.name_ja, orbit_members.name_kana, orbit_members.date_of_birth, COALESCE(((json_agg(orbit_members_orbit_member_groups_1.*))::jsonb), '[]'::jsonb)
	              Buffers: shared hit=272
	              ->  Seq Scan on public.orbit_members  (cost=0.00..11.30 rows=65 width=84) (actual time=0.220..0.249 rows=90 loops=1)
	                    Output: orbit_members.id, orbit_members.name_ja, orbit_members.name_kana, orbit_members.name_en, orbit_members.date_of_birth, orbit_members.blood_type, orbit_members.height_cm, orbit_members.hometown, orbit_members.image_url, orbit_members.blog_url, orbit_members.created_at, orbit_members.updated_at, orbit_members.zodiac, orbit_members.call_name, orbit_members.penlight_color_1, orbit_members.penlight_color_2, orbit_members.blog_hashtag, orbit_members.talk_app_name, orbit_members.talk_app_url, orbit_members.talk_app_hashtag, orbit_members.memo
	                    Filter: ((InitPlan 1).col1 AND (orbit_members.date_of_birth IS NOT NULL))
	                    Buffers: shared hit=2
	              ->  Aggregate  (cost=14.27..14.28 rows=1 width=32) (actual time=0.016..0.017 rows=1 loops=90)
	                    Output: (json_agg(orbit_members_orbit_member_groups_1.*))::jsonb
	                    Buffers: shared hit=270
	                    ->  Subquery Scan on orbit_members_orbit_member_groups_1  (cost=4.69..14.26 rows=2 width=44) (actual time=0.011..0.013 rows=1 loops=90)
	                          Output: orbit_members_orbit_member_groups_1.*
	                          Buffers: shared hit=270
	                          ->  Limit  (cost=4.69..14.24 rows=2 width=52) (actual time=0.011..0.012 rows=1 loops=90)
	                                Output: orbit_member_groups_1.id, orbit_member_groups_1.joined_at, ((row_to_json(orbit_member_groups_orbit_groups_2.*))::jsonb)
	                                Buffers: shared hit=270
	                                InitPlan 2
	                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.164..0.164 rows=1 loops=1)
	                                        Output: has_orbit_read_role()
	                                ->  Nested Loop Left Join  (cost=4.43..13.98 rows=2 width=52) (actual time=0.011..0.012 rows=1 loops=90)
	                                      Output: orbit_member_groups_1.id, orbit_member_groups_1.joined_at, (row_to_json(orbit_member_groups_orbit_groups_2.*))::jsonb
	                                      Buffers: shared hit=270
	                                      ->  Bitmap Heap Scan on public.orbit_member_groups orbit_member_groups_1  (cost=4.17..11.28 rows=2 width=36) (actual time=0.004..0.004 rows=1 loops=90)
	                                            Output: orbit_member_groups_1.id, orbit_member_groups_1.member_id, orbit_member_groups_1.group_id, orbit_member_groups_1.generation, orbit_member_groups_1.joined_at, orbit_member_groups_1.graduated_at, orbit_member_groups_1.created_at
	                                            Recheck Cond: (orbit_member_groups_1.member_id = orbit_members.id)
	                                            Filter: (InitPlan 2).col1
	                                            Heap Blocks: exact=90
	                                            Buffers: shared hit=180
	                                            ->  Bitmap Index Scan on idx_orbit_member_groups_unique  (cost=0.00..4.17 rows=3 width=0) (actual time=0.001..0.001 rows=1 loops=90)
	                                                  Index Cond: (orbit_member_groups_1.member_id = orbit_members.id)
	                                                  Buffers: shared hit=90
	                                      ->  Subquery Scan on orbit_member_groups_orbit_groups_2  (cost=0.26..1.33 rows=1 width=60) (actual time=0.004..0.004 rows=1 loops=90)
	                                            Output: orbit_member_groups_orbit_groups_2.*
	                                            Buffers: shared hit=90
	                                            ->  Limit  (cost=0.26..1.32 rows=1 width=36) (actual time=0.003..0.004 rows=1 loops=90)
	                                                  Output: orbit_groups_2.name_ja, orbit_groups_2.sort_order
	                                                  Buffers: shared hit=90
	                                                  InitPlan 3
	                                                    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.123..0.123 rows=1 loops=1)
	                                                          Output: has_orbit_read_role()
	                                                  ->  Seq Scan on public.orbit_groups orbit_groups_2  (cost=0.00..1.06 rows=1 width=36) (actual time=0.002..0.003 rows=1 loops=90)
	                                                        Output: orbit_groups_2.name_ja, orbit_groups_2.sort_order
	                                                        Filter: ((InitPlan 3).col1 AND (orbit_groups_2.id = orbit_member_groups_1.group_id))
	                                                        Rows Removed by Filter: 5
	                                                        Buffers: shared hit=90
	Query Identifier: 7312404024566313001
```

### rpc_events_otd:inner  (duration: 2.641 ms)
```
	Query Text: 
	  SELECT
	    events.id,
	    events.event_type_id,
	    event_types.name AS event_type_name,
	    event_types.color AS event_type_color,
	    events.is_member_history,
	    events.title,
	    events.date,
	    events.end_date,
	    events.start_time,
	    events.venue,
	    COALESCE(
	      ARRAY(
	        SELECT event_groups.group_id
	        FROM public.orbit_event_groups event_groups
	        LEFT JOIN public.orbit_groups groups
	          ON groups.id = event_groups.group_id
	        WHERE event_groups.event_id = events.id
	        ORDER BY groups.sort_order, event_groups.group_id
	      ),
	      ARRAY[]::UUID[]
	    ) AS group_ids,
	    COALESCE(
	      ARRAY(
	        SELECT groups.name_ja
	        FROM public.orbit_event_groups event_groups
	        JOIN public.orbit_groups groups
	          ON groups.id = event_groups.group_id
	        WHERE event_groups.event_id = events.id
	        ORDER BY groups.sort_order, groups.name_ja
	      ),
	      ARRAY[]::TEXT[]
	    ) AS group_names
	  FROM public.orbit_events events
	  JOIN public.orbit_event_types event_types
	    ON event_types.id = events.event_type_id
	  WHERE EXTRACT(MONTH FROM events.date) = target_month
	    AND EXTRACT(DAY FROM events.date) = target_day
	  ORDER BY events.date, events.start_time NULLS LAST, events.created_at;
	
	Sort  (cost=62.40..62.40 rows=1 width=249) (actual time=2.620..2.625 rows=19 loops=1)
	  Output: events.id, events.event_type_id, event_types.name, event_types.color, events.is_member_history, events.title, events.date, events.end_date, events.start_time, events.venue, (COALESCE(ARRAY(SubPlan 3), '{}'::uuid[])), (COALESCE(ARRAY(SubPlan 6), '{}'::text[])), events.created_at
	  Sort Key: events.date, events.start_time, events.created_at
	  Sort Method: quicksort  Memory: 28kB
	  Buffers: shared hit=236
	  InitPlan 7
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.500..0.500 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	          Buffers: shared hit=49
	  InitPlan 8
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.216..0.216 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	  ->  Nested Loop  (cost=0.15..61.87 rows=1 width=249) (actual time=1.802..2.548 rows=19 loops=1)
	        Output: events.id, events.event_type_id, event_types.name, event_types.color, events.is_member_history, events.title, events.date, events.end_date, events.start_time, events.venue, COALESCE(ARRAY(SubPlan 3), '{}'::uuid[]), COALESCE(ARRAY(SubPlan 6), '{}'::text[]), events.created_at
	        Inner Unique: true
	        Buffers: shared hit=225
	        ->  Seq Scan on public.orbit_events events  (cost=0.00..24.70 rows=1 width=121) (actual time=0.527..0.828 rows=19 loops=1)
	              Output: events.id, events.event_type_id, events.is_member_history, events.title, events.date, events.end_date, events.start_time, events.venue, events.created_at
	              Filter: ((InitPlan 7).col1 AND (EXTRACT(month FROM events.date) = ($1)::numeric) AND (EXTRACT(day FROM events.date) = ($2)::numeric))
	              Rows Removed by Filter: 681
	              Buffers: shared hit=62
	        ->  Index Scan using orbit_event_types_pkey on public.orbit_event_types event_types  (cost=0.15..8.17 rows=1 width=80) (actual time=0.014..0.014 rows=1 loops=19)
	              Output: event_types.id, event_types.name, event_types.color, event_types.sort_order, event_types.created_at
	              Index Cond: (event_types.id = events.event_type_id)
	              Filter: (InitPlan 8).col1
	              Buffers: shared hit=38
	        SubPlan 3
	          ->  Sort  (cost=14.48..14.49 rows=3 width=20) (actual time=0.041..0.041 rows=1 loops=19)
	                Output: event_groups.group_id, groups.sort_order
	                Sort Key: groups.sort_order, event_groups.group_id
	                Sort Method: quicksort  Memory: 25kB
	                Buffers: shared hit=64
	                InitPlan 1
	                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.209..0.209 rows=1 loops=1)
	                        Output: public.has_orbit_read_role()
	                InitPlan 2
	                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.324..0.324 rows=1 loops=1)
	                        Output: public.has_orbit_read_role()
	                ->  Nested Loop Left Join  (cost=4.32..13.93 rows=3 width=20) (actual time=0.038..0.039 rows=1 loops=19)
	                      Output: event_groups.group_id, groups.sort_order
	                      Inner Unique: true
	                      Join Filter: (groups.id = event_groups.group_id)
	                      Rows Removed by Join Filter: 2
	                      Buffers: shared hit=58
	                      ->  Bitmap Heap Scan on public.orbit_event_groups event_groups  (cost=4.32..12.79 rows=3 width=16) (actual time=0.018..0.018 rows=1 loops=19)
	                            Output: event_groups.id, event_groups.event_id, event_groups.group_id
	                            Recheck Cond: (event_groups.event_id = events.id)
	                            Filter: (InitPlan 1).col1
	                            Heap Blocks: exact=19
	                            Buffers: shared hit=57
	                            ->  Bitmap Index Scan on idx_orbit_event_groups_unique  (cost=0.00..4.31 rows=5 width=0) (actual time=0.003..0.003 rows=1 loops=19)
	                                  Index Cond: (event_groups.event_id = events.id)
	                                  Buffers: shared hit=38
	                      ->  Materialize  (cost=0.00..1.06 rows=2 width=20) (actual time=0.018..0.018 rows=3 loops=19)
	                            Output: groups.sort_order, groups.id
	                            Buffers: shared hit=1
	                            ->  Seq Scan on public.orbit_groups groups  (cost=0.00..1.05 rows=2 width=20) (actual time=0.333..0.335 rows=5 loops=1)
	                                  Output: groups.sort_order, groups.id
	                                  Filter: (InitPlan 2).col1
	                                  Buffers: shared hit=1
	        SubPlan 6
	          ->  Sort  (cost=14.46..14.47 rows=1 width=36) (actual time=0.031..0.031 rows=1 loops=19)
	                Output: groups_1.name_ja, groups_1.sort_order
	                Sort Key: groups_1.sort_order, groups_1.name_ja
	                Sort Method: quicksort  Memory: 25kB
	                Buffers: shared hit=61
	                InitPlan 4
	                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.205..0.206 rows=1 loops=1)
	                        Output: public.has_orbit_read_role()
	                InitPlan 5
	                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.141..0.141 rows=1 loops=1)
	                        Output: public.has_orbit_read_role()
	                ->  Nested Loop  (cost=4.32..13.93 rows=1 width=36) (actual time=0.026..0.027 rows=1 loops=19)
	                      Output: groups_1.name_ja, groups_1.sort_order
	                      Inner Unique: true
	                      Join Filter: (event_groups_1.group_id = groups_1.id)
	                      Rows Removed by Join Filter: 2
	                      Buffers: shared hit=58
	                      ->  Bitmap Heap Scan on public.orbit_event_groups event_groups_1  (cost=4.32..12.79 rows=3 width=16) (actual time=0.016..0.017 rows=1 loops=19)
	                            Output: event_groups_1.id, event_groups_1.event_id, event_groups_1.group_id
	                            Recheck Cond: (event_groups_1.event_id = events.id)
	                            Filter: (InitPlan 4).col1
	                            Heap Blocks: exact=19
	                            Buffers: shared hit=57
	                            ->  Bitmap Index Scan on idx_orbit_event_groups_unique  (cost=0.00..4.31 rows=5 width=0) (actual time=0.002..0.002 rows=1 loops=19)
	                                  Index Cond: (event_groups_1.event_id = events.id)
	                                  Buffers: shared hit=38
	                      ->  Materialize  (cost=0.00..1.06 rows=2 width=52) (actual time=0.008..0.008 rows=3 loops=19)
	                            Output: groups_1.name_ja, groups_1.sort_order, groups_1.id
	                            Buffers: shared hit=1
	                            ->  Seq Scan on public.orbit_groups groups_1  (cost=0.00..1.05 rows=2 width=52) (actual time=0.148..0.149 rows=5 loops=1)
	                                  Output: groups_1.name_ja, groups_1.sort_order, groups_1.id
	                                  Filter: (InitPlan 5).col1
	                                  Buffers: shared hit=1
	Query Identifier: -7945021306188922302
```

### rpc_events_otd:call  (duration: 7.324 ms)
```
	Query Text: WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "target_month", "target_day" FROM json_to_record(pgrst_payload.json_data) AS _("target_month" integer, "target_day" integer) LIMIT 1) pgrst_body , LATERAL "public"."find_orbit_events_on_this_day"("target_month" := pgrst_body."target_month", "target_day" := pgrst_body."target_day") pgrst_call) SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM (SELECT "record".* FROM "pgrst_source" AS "record"   LIMIT $2 OFFSET $3) _postgrest_t
	Aggregate  (cost=35.27..35.28 rows=1 width=144) (actual time=7.297..7.298 rows=1 loops=1)
	  Output: NULL::bigint, count(_postgrest_t.*), COALESCE(json_agg(_postgrest_t.*), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=1574
	  ->  Subquery Scan on _postgrest_t  (cost=0.25..30.26 rows=1000 width=265) (actual time=7.172..7.190 rows=19 loops=1)
	        Output: _postgrest_t.*
	        Buffers: shared hit=1574
	        ->  Limit  (cost=0.25..20.26 rows=1000 width=241) (actual time=7.148..7.158 rows=19 loops=1)
	              Output: pgrst_call.id, pgrst_call.event_type_id, pgrst_call.event_type_name, pgrst_call.event_type_color, pgrst_call.is_member_history, pgrst_call.title, pgrst_call.date, pgrst_call.end_date, pgrst_call.start_time, pgrst_call.venue, pgrst_call.group_ids, pgrst_call.group_names
	              Buffers: shared hit=1574
	              ->  Nested Loop  (cost=0.25..20.26 rows=1000 width=241) (actual time=7.147..7.155 rows=19 loops=1)
	                    Output: pgrst_call.id, pgrst_call.event_type_id, pgrst_call.event_type_name, pgrst_call.event_type_color, pgrst_call.is_member_history, pgrst_call.title, pgrst_call.date, pgrst_call.end_date, pgrst_call.start_time, pgrst_call.venue, pgrst_call.group_ids, pgrst_call.group_names
	                    Buffers: shared hit=1574
	                    ->  Limit  (cost=0.00..0.01 rows=1 width=8) (actual time=0.017..0.018 rows=1 loops=1)
	                          Output: _.target_month, _.target_day
	                          ->  Function Scan on pg_catalog.json_to_record _  (cost=0.00..0.01 rows=1 width=8) (actual time=0.016..0.017 rows=1 loops=1)
	                                Output: _.target_month, _.target_day
	                                Function Call: json_to_record('{"target_month":7,"target_day":19}'::json)
	                    ->  Function Scan on public.find_orbit_events_on_this_day pgrst_call  (cost=0.25..10.25 rows=1000 width=241) (actual time=7.126..7.128 rows=19 loops=1)
	                          Output: pgrst_call.id, pgrst_call.event_type_id, pgrst_call.event_type_name, pgrst_call.event_type_color, pgrst_call.is_member_history, pgrst_call.title, pgrst_call.date, pgrst_call.end_date, pgrst_call.start_time, pgrst_call.venue, pgrst_call.group_ids, pgrst_call.group_names
	                          Function Call: find_orbit_events_on_this_day(_.target_month, _.target_day)
	                          Buffers: shared hit=1574
	Query Identifier: 4566129074803665125
```

### rpc_perf_otd:inner  (duration: 1.509 ms)
```
	Query Text: 
	  SELECT
	    performances.id,
	    performances.live_id,
	    lives.name AS live_name,
	    performances.performance_date AS date,
	    performances.starts_at,
	    venues.name AS venue_name
	  FROM public.orbit_live_performances performances
	  JOIN public.orbit_lives lives
	    ON lives.id = performances.live_id
	  LEFT JOIN public.orbit_venues venues
	    ON venues.id = performances.venue_id
	  WHERE performances.performance_date IS NOT NULL
	    AND EXTRACT(MONTH FROM performances.performance_date) = target_month
	    AND EXTRACT(DAY FROM performances.performance_date) = target_day
	  ORDER BY performances.performance_date, performances.starts_at NULLS FIRST,
	    performances.sort_order, performances.id;
	
	Sort  (cost=68.56..68.57 rows=1 width=136) (actual time=1.487..1.490 rows=24 loops=1)
	  Output: performances.id, performances.live_id, lives.name, performances.performance_date, performances.starts_at, venues.name, performances.sort_order
	  Sort Key: performances.performance_date, performances.starts_at NULLS FIRST, performances.sort_order, performances.id
	  Sort Method: quicksort  Memory: 27kB
	  Buffers: shared hit=207
	  InitPlan 1
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.322..0.322 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	          Buffers: shared hit=52
	  InitPlan 2
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.176..0.176 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	  InitPlan 3
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.173..0.173 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	  ->  Nested Loop Left Join  (cost=0.42..67.77 rows=1 width=136) (actual time=0.794..1.426 rows=24 loops=1)
	        Output: performances.id, performances.live_id, lives.name, performances.performance_date, performances.starts_at, venues.name, performances.sort_order
	        Inner Unique: true
	        Buffers: shared hit=195
	        ->  Nested Loop  (cost=0.28..59.50 rows=1 width=120) (actual time=0.608..1.186 rows=24 loops=1)
	              Output: performances.id, performances.live_id, performances.performance_date, performances.starts_at, performances.sort_order, performances.venue_id, lives.name
	              Inner Unique: true
	              Buffers: shared hit=147
	              ->  Seq Scan on public.orbit_live_performances performances  (cost=0.00..51.17 rows=1 width=88) (actual time=0.396..0.869 rows=24 loops=1)
	                    Output: performances.id, performances.live_id, performances.performance_date, performances.starts_at, performances.sort_order, performances.venue_id
	                    Filter: ((InitPlan 1).col1 AND (performances.performance_date IS NOT NULL) AND (EXTRACT(month FROM performances.performance_date) = ($1)::numeric) AND (EXTRACT(day FROM performances.performance_date) = ($2)::numeric))
	                    Rows Removed by Filter: 1476
	                    Buffers: shared hit=75
	              ->  Index Scan using orbit_lives_pkey on public.orbit_lives lives  (cost=0.28..8.29 rows=1 width=48) (actual time=0.012..0.012 rows=1 loops=24)
	                    Output: lives.id, lives.name, lives.live_type, lives.description, lives.created_at, lives.updated_at
	                    Index Cond: (lives.id = performances.live_id)
	                    Filter: (InitPlan 2).col1
	                    Buffers: shared hit=72
	        ->  Index Scan using orbit_venues_pkey on public.orbit_venues venues  (cost=0.15..8.17 rows=1 width=48) (actual time=0.009..0.009 rows=1 loops=24)
	              Output: venues.name, venues.id
	              Index Cond: (venues.id = performances.venue_id)
	              Filter: (InitPlan 3).col1
	              Buffers: shared hit=48
	Query Identifier: 4772102701282328315
```

### rpc_perf_otd:call  (duration: 3.875 ms)
```
	Query Text: WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "target_month", "target_day" FROM json_to_record(pgrst_payload.json_data) AS _("target_month" integer, "target_day" integer) LIMIT 1) pgrst_body , LATERAL "public"."find_orbit_live_performances_on_this_day"("target_month" := pgrst_body."target_month", "target_day" := pgrst_body."target_day") pgrst_call) SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM (SELECT "record".* FROM "pgrst_source" AS "record"   LIMIT $2 OFFSET $3) _postgrest_t
	Aggregate  (cost=35.27..35.28 rows=1 width=144) (actual time=3.862..3.863 rows=1 loops=1)
	  Output: NULL::bigint, count(_postgrest_t.*), COALESCE(json_agg(_postgrest_t.*), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=1245
	  ->  Subquery Scan on _postgrest_t  (cost=0.25..30.26 rows=1000 width=156) (actual time=3.798..3.812 rows=24 loops=1)
	        Output: _postgrest_t.*
	        Buffers: shared hit=1245
	        ->  Limit  (cost=0.25..20.26 rows=1000 width=132) (actual time=3.778..3.786 rows=24 loops=1)
	              Output: pgrst_call.id, pgrst_call.live_id, pgrst_call.live_name, pgrst_call.date, pgrst_call.starts_at, pgrst_call.venue_name
	              Buffers: shared hit=1245
	              ->  Nested Loop  (cost=0.25..20.26 rows=1000 width=132) (actual time=3.777..3.783 rows=24 loops=1)
	                    Output: pgrst_call.id, pgrst_call.live_id, pgrst_call.live_name, pgrst_call.date, pgrst_call.starts_at, pgrst_call.venue_name
	                    Buffers: shared hit=1245
	                    ->  Limit  (cost=0.00..0.01 rows=1 width=8) (actual time=0.015..0.016 rows=1 loops=1)
	                          Output: _.target_month, _.target_day
	                          ->  Function Scan on pg_catalog.json_to_record _  (cost=0.00..0.01 rows=1 width=8) (actual time=0.015..0.015 rows=1 loops=1)
	                                Output: _.target_month, _.target_day
	                                Function Call: json_to_record('{"target_month":7,"target_day":19}'::json)
	                    ->  Function Scan on public.find_orbit_live_performances_on_this_day pgrst_call  (cost=0.25..10.25 rows=1000 width=132) (actual time=3.759..3.761 rows=24 loops=1)
	                          Output: pgrst_call.id, pgrst_call.live_id, pgrst_call.live_name, pgrst_call.date, pgrst_call.starts_at, pgrst_call.venue_name
	                          Function Call: find_orbit_live_performances_on_this_day(_.target_month, _.target_day)
	                          Buffers: shared hit=1245
	Query Identifier: 8771026364396067883
```

### release_range  (duration: 0.473 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_releases"."id", "public"."orbit_releases"."title", "public"."orbit_releases"."release_date" FROM "public"."orbit_releases" WHERE  ( ( "public"."orbit_releases"."release_date" >= $1 AND  "public"."orbit_releases"."release_date" < $2)) AND NOT "public"."orbit_releases"."release_date" IS NULL   LIMIT $3 OFFSET $4 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=9.79..9.81 rows=1 width=144) (actual time=0.470..0.470 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_releases.id, orbit_releases.title, orbit_releases.release_date)), COALESCE(json_agg(ROW(orbit_releases.id, orbit_releases.title, orbit_releases.release_date)), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=74
	  ->  Limit  (cost=4.43..9.78 rows=1 width=52) (actual time=0.443..0.446 rows=7 loops=1)
	        Output: orbit_releases.id, orbit_releases.title, orbit_releases.release_date
	        Buffers: shared hit=71
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.410..0.410 rows=1 loops=1)
	                Output: has_orbit_read_role()
	                Buffers: shared hit=69
	        ->  Bitmap Heap Scan on public.orbit_releases  (cost=4.17..9.52 rows=1 width=52) (actual time=0.442..0.444 rows=7 loops=1)
	              Output: orbit_releases.id, orbit_releases.title, orbit_releases.release_date
	              Recheck Cond: ((orbit_releases.release_date >= '2026-07-01'::date) AND (orbit_releases.release_date < '2027-07-01'::date) AND (orbit_releases.release_date IS NOT NULL))
	              Filter: (InitPlan 1).col1
	              Heap Blocks: exact=1
	              Buffers: shared hit=71
	              ->  Bitmap Index Scan on idx_orbit_releases_release_date  (cost=0.00..4.17 rows=2 width=0) (actual time=0.017..0.017 rows=7 loops=1)
	                    Index Cond: ((orbit_releases.release_date >= '2026-07-01'::date) AND (orbit_releases.release_date < '2027-07-01'::date) AND (orbit_releases.release_date IS NOT NULL))
	                    Buffers: shared hit=1
	Query Identifier: 5138078013107073525
```

### rpc_release_otd:inner  (duration: 0.822 ms)
```
	Query Text: 
	  SELECT
	    releases.id AS release_id,
	    releases.title,
	    releases.release_date AS date
	  FROM public.orbit_releases releases
	  WHERE releases.release_date IS NOT NULL
	    AND EXTRACT(MONTH FROM releases.release_date) = target_month
	    AND EXTRACT(DAY FROM releases.release_date) = target_day
	  ORDER BY releases.release_date, releases.title, releases.id;
	
	Sort  (cost=20.52..20.53 rows=1 width=52) (actual time=0.814..0.816 rows=15 loops=1)
	  Output: releases.id, releases.title, releases.release_date
	  Sort Key: releases.release_date, releases.title, releases.id
	  Sort Method: quicksort  Memory: 25kB
	  Buffers: shared hit=65
	  InitPlan 1
	    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.490..0.491 rows=1 loops=1)
	          Output: public.has_orbit_read_role()
	          Buffers: shared hit=52
	  ->  Seq Scan on public.orbit_releases releases  (cost=0.00..20.25 rows=1 width=52) (actual time=0.615..0.730 rows=15 loops=1)
	        Output: releases.id, releases.title, releases.release_date
	        Filter: ((InitPlan 1).col1 AND (releases.release_date IS NOT NULL) AND (EXTRACT(month FROM releases.release_date) = ($1)::numeric) AND (EXTRACT(day FROM releases.release_date) = ($2)::numeric))
	        Rows Removed by Filter: 235
	        Buffers: shared hit=56
	Query Identifier: -5919549694870751357
```

### rpc_release_otd:call  (duration: 3.184 ms)
```
	Query Text: WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "target_month", "target_day" FROM json_to_record(pgrst_payload.json_data) AS _("target_month" integer, "target_day" integer) LIMIT 1) pgrst_body , LATERAL "public"."find_orbit_releases_on_this_day"("target_month" := pgrst_body."target_month", "target_day" := pgrst_body."target_day") pgrst_call) SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM (SELECT "record".* FROM "pgrst_source" AS "record"   LIMIT $2 OFFSET $3) _postgrest_t
	Aggregate  (cost=35.27..35.28 rows=1 width=144) (actual time=3.173..3.174 rows=1 loops=1)
	  Output: NULL::bigint, count(_postgrest_t.*), COALESCE(json_agg(_postgrest_t.*), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=868
	  ->  Subquery Scan on _postgrest_t  (cost=0.25..30.26 rows=1000 width=76) (actual time=3.133..3.145 rows=15 loops=1)
	        Output: _postgrest_t.*
	        Buffers: shared hit=868
	        ->  Limit  (cost=0.25..20.26 rows=1000 width=52) (actual time=3.112..3.119 rows=15 loops=1)
	              Output: pgrst_call.release_id, pgrst_call.title, pgrst_call.date
	              Buffers: shared hit=868
	              ->  Nested Loop  (cost=0.25..20.26 rows=1000 width=52) (actual time=3.111..3.116 rows=15 loops=1)
	                    Output: pgrst_call.release_id, pgrst_call.title, pgrst_call.date
	                    Buffers: shared hit=868
	                    ->  Limit  (cost=0.00..0.01 rows=1 width=8) (actual time=0.018..0.019 rows=1 loops=1)
	                          Output: _.target_month, _.target_day
	                          ->  Function Scan on pg_catalog.json_to_record _  (cost=0.00..0.01 rows=1 width=8) (actual time=0.018..0.018 rows=1 loops=1)
	                                Output: _.target_month, _.target_day
	                                Function Call: json_to_record('{"target_month":7,"target_day":19}'::json)
	                    ->  Function Scan on public.find_orbit_releases_on_this_day pgrst_call  (cost=0.25..10.25 rows=1000 width=52) (actual time=3.090..3.092 rows=15 loops=1)
	                          Output: pgrst_call.release_id, pgrst_call.title, pgrst_call.date
	                          Function Call: find_orbit_releases_on_this_day(_.target_month, _.target_day)
	                          Buffers: shared hit=868
	Query Identifier: 2048154731985962072
```

### perf_range  (duration: 1.711 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_live_performances"."id", "public"."orbit_live_performances"."performance_date", "public"."orbit_live_performances"."starts_at", "public"."orbit_live_performances"."live_id", row_to_json("orbit_live_performances_orbit_lives_1".*)::jsonb AS "orbit_lives", row_to_json("orbit_live_performances_orbit_venues_1".*)::jsonb AS "orbit_venues" FROM "public"."orbit_live_performances" LEFT JOIN LATERAL ( SELECT "orbit_lives_1"."name" FROM "public"."orbit_lives" AS "orbit_lives_1" WHERE "orbit_lives_1"."id" = "public"."orbit_live_performances"."live_id"   LIMIT $1 OFFSET $2 ) AS "orbit_live_performances_orbit_lives_1" ON TRUE  LEFT JOIN LATERAL ( SELECT "orbit_venues_1"."name" FROM "public"."orbit_venues" AS "orbit_venues_1" WHERE "orbit_venues_1"."id" = "public"."orbit_live_performances"."venue_id"   LIMIT $3 OFFSET $4 ) AS "orbit_live_performances_orbit_venues_1" ON TRUE WHERE  ( ( "public"."orbit_live_performances"."performance_date" >= $5 AND  "public"."orbit_live_performances"."performance_date" < $6)) AND NOT "public"."orbit_live_performances"."performance_date" IS NULL   LIMIT $7 OFFSET $8 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=70.62..70.64 rows=1 width=144) (actual time=1.564..1.568 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, ((row_to_json(orbit_live_performances_orbit_lives_1.*))::jsonb), ((row_to_json(orbit_live_performances_orbit_venues_1.*))::jsonb))), COALESCE(json_agg(ROW(orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, ((row_to_json(orbit_live_performances_orbit_lives_1.*))::jsonb), ((row_to_json(orbit_live_performances_orbit_venues_1.*))::jsonb))), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=238
	  ->  Limit  (cost=5.56..70.61 rows=3 width=132) (actual time=0.970..1.343 rows=35 loops=1)
	        Output: orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, ((row_to_json(orbit_live_performances_orbit_lives_1.*))::jsonb), ((row_to_json(orbit_live_performances_orbit_venues_1.*))::jsonb)
	        Buffers: shared hit=238
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.431..0.431 rows=1 loops=1)
	                Output: has_orbit_read_role()
	                Buffers: shared hit=59
	        ->  Nested Loop Left Join  (cost=5.30..70.35 rows=3 width=132) (actual time=0.968..1.336 rows=35 loops=1)
	              Output: orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, (row_to_json(orbit_live_performances_orbit_lives_1.*))::jsonb, (row_to_json(orbit_live_performances_orbit_venues_1.*))::jsonb
	              Buffers: shared hit=238
	              ->  Nested Loop Left Join  (cost=4.89..44.97 rows=3 width=140) (actual time=0.716..0.898 rows=35 loops=1)
	                    Output: orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, orbit_live_performances.venue_id, orbit_live_performances_orbit_lives_1.*
	                    Buffers: shared hit=168
	                    ->  Bitmap Heap Scan on public.orbit_live_performances  (cost=4.35..19.25 rows=3 width=84) (actual time=0.478..0.507 rows=35 loops=1)
	                          Output: orbit_live_performances.id, orbit_live_performances.performance_date, orbit_live_performances.starts_at, orbit_live_performances.live_id, orbit_live_performances.venue_id
	                          Recheck Cond: ((orbit_live_performances.performance_date >= '2026-07-01'::date) AND (orbit_live_performances.performance_date < '2027-07-01'::date) AND (orbit_live_performances.performance_date IS NOT NULL))
	                          Filter: (InitPlan 1).col1
	                          Heap Blocks: exact=2
	                          Buffers: shared hit=63
	                          ->  Bitmap Index Scan on idx_orbit_live_performances_date  (cost=0.00..4.35 rows=6 width=0) (actual time=0.024..0.025 rows=35 loops=1)
	                                Index Cond: ((orbit_live_performances.performance_date >= '2026-07-01'::date) AND (orbit_live_performances.performance_date < '2027-07-01'::date) AND (orbit_live_performances.performance_date IS NOT NULL))
	                                Buffers: shared hit=2
	                    ->  Subquery Scan on orbit_live_performances_orbit_lives_1  (cost=0.54..8.56 rows=1 width=56) (actual time=0.010..0.011 rows=1 loops=35)
	                          Output: orbit_live_performances_orbit_lives_1.*
	                          Buffers: shared hit=105
	                          ->  Limit  (cost=0.54..8.55 rows=1 width=32) (actual time=0.009..0.010 rows=1 loops=35)
	                                Output: orbit_lives_1.name
	                                Buffers: shared hit=105
	                                InitPlan 2
	                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.176..0.176 rows=1 loops=1)
	                                        Output: has_orbit_read_role()
	                                ->  Index Scan using orbit_lives_pkey on public.orbit_lives orbit_lives_1  (cost=0.28..8.29 rows=1 width=32) (actual time=0.009..0.009 rows=1 loops=35)
	                                      Output: orbit_lives_1.name
	                                      Index Cond: (orbit_lives_1.id = orbit_live_performances.live_id)
	                                      Filter: (InitPlan 2).col1
	                                      Buffers: shared hit=105
	              ->  Subquery Scan on orbit_live_performances_orbit_venues_1  (cost=0.41..8.44 rows=1 width=56) (actual time=0.009..0.009 rows=1 loops=35)
	                    Output: orbit_live_performances_orbit_venues_1.*
	                    Buffers: shared hit=70
	                    ->  Limit  (cost=0.41..8.43 rows=1 width=32) (actual time=0.008..0.009 rows=1 loops=35)
	                          Output: orbit_venues_1.name
	                          Buffers: shared hit=70
	                          InitPlan 3
	                            ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.217..0.218 rows=1 loops=1)
	                                  Output: has_orbit_read_role()
	                          ->  Index Scan using orbit_venues_pkey on public.orbit_venues orbit_venues_1  (cost=0.15..8.17 rows=1 width=32) (actual time=0.008..0.008 rows=1 loops=35)
	                                Output: orbit_venues_1.name
	                                Index Cond: (orbit_venues_1.id = orbit_live_performances.venue_id)
	                                Filter: (InitPlan 3).col1
	                                Buffers: shared hit=70
	Query Identifier: 2955925646057690741
```

### rpc_videos_otd:inner  (duration: 2.369 ms)
```
	Query Text: 
	  SELECT
	    tracks.id AS track_id,
	    tracks.title AS track_title,
	    groups.name_ja AS group_name_ja,
	    'mv'::TEXT AS video_type,
	    mvs.mv_url AS url,
	    mvs.published_on AS date
	  FROM public.orbit_track_mvs mvs
	  JOIN public.orbit_tracks tracks
	    ON tracks.id = mvs.track_id
	  JOIN public.orbit_groups groups
	    ON groups.id = tracks.group_id
	  WHERE mvs.published_on IS NOT NULL
	    AND EXTRACT(MONTH FROM mvs.published_on) = target_month
	    AND EXTRACT(DAY FROM mvs.published_on) = target_day
	
	  UNION ALL
	
	  SELECT
	    tracks.id AS track_id,
	    tracks.title AS track_title,
	    groups.name_ja AS group_name_ja,
	    videos.video_type,
	    videos.video_url AS url,
	    videos.published_on AS date
	  FROM public.orbit_track_videos videos
	  JOIN public.orbit_tracks tracks
	    ON tracks.id = videos.track_id
	  JOIN public.orbit_groups groups
	    ON groups.id = tracks.group_id
	  WHERE videos.published_on IS NOT NULL
	    AND EXTRACT(MONTH FROM videos.published_on) = target_month
	    AND EXTRACT(DAY FROM videos.published_on) = target_day
	
	  ORDER BY date, track_title, track_id, video_type;
	
	Sort  (cost=60.91..60.91 rows=2 width=148) (actual time=2.350..2.354 rows=31 loops=1)
	  Output: tracks.id, tracks.title, groups.name_ja, ('mv'::text), mvs.mv_url, mvs.published_on
	  Sort Key: mvs.published_on, tracks.title, tracks.id, ('mv'::text)
	  Sort Method: quicksort  Memory: 29kB
	  Buffers: shared hit=229
	  ->  Append  (cost=1.19..60.90 rows=2 width=148) (actual time=1.220..2.164 rows=31 loops=1)
	        Buffers: shared hit=220
	        ->  Nested Loop  (cost=1.19..29.94 rows=1 width=148) (actual time=1.219..1.396 rows=14 loops=1)
	              Output: tracks.id, tracks.title, groups.name_ja, 'mv'::text, mvs.mv_url, mvs.published_on
	              Inner Unique: true
	              Buffers: shared hit=126
	              InitPlan 1
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.590..0.590 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	                      Buffers: shared hit=52
	              InitPlan 2
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.316..0.316 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 3
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.240..0.240 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              ->  Nested Loop  (cost=0.27..28.88 rows=1 width=100) (actual time=0.964..1.114 rows=14 loops=1)
	                    Output: mvs.mv_url, mvs.published_on, tracks.id, tracks.title, tracks.group_id
	                    Inner Unique: true
	                    Buffers: shared hit=98
	                    ->  Seq Scan on public.orbit_track_mvs mvs  (cost=0.00..20.50 rows=1 width=52) (actual time=0.620..0.696 rows=14 loops=1)
	                          Output: mvs.id, mvs.track_id, mvs.mv_url, mvs.director_person_id, mvs.location, mvs.published_on, mvs.memo, mvs.created_at, mvs.updated_at
	                          Filter: ((InitPlan 1).col1 AND (mvs.published_on IS NOT NULL) AND (EXTRACT(month FROM mvs.published_on) = ($1)::numeric) AND (EXTRACT(day FROM mvs.published_on) = ($2)::numeric))
	                          Rows Removed by Filter: 136
	                          Buffers: shared hit=56
	                    ->  Index Scan using orbit_tracks_pkey on public.orbit_tracks tracks  (cost=0.27..8.29 rows=1 width=64) (actual time=0.029..0.029 rows=1 loops=14)
	                          Output: tracks.id, tracks.title, tracks.group_id
	                          Index Cond: (tracks.id = mvs.track_id)
	                          Filter: (InitPlan 2).col1
	                          Buffers: shared hit=42
	              ->  Index Scan using orbit_groups_pkey on public.orbit_groups groups  (cost=0.13..0.22 rows=1 width=48) (actual time=0.019..0.019 rows=1 loops=14)
	                    Output: groups.name_ja, groups.id
	                    Index Cond: (groups.id = tracks.group_id)
	                    Filter: (InitPlan 3).col1
	                    Buffers: shared hit=28
	        ->  Nested Loop  (cost=1.19..30.94 rows=1 width=148) (actual time=0.591..0.763 rows=17 loops=1)
	              Output: tracks_1.id, tracks_1.title, groups_1.name_ja, videos.video_type, videos.video_url, videos.published_on
	              Inner Unique: true
	              Buffers: shared hit=94
	              InitPlan 4
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.216..0.217 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 5
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.213..0.213 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 6
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.117..0.118 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              ->  Nested Loop  (cost=0.27..29.88 rows=1 width=132) (actual time=0.460..0.616 rows=17 loops=1)
	                    Output: videos.video_type, videos.video_url, videos.published_on, tracks_1.id, tracks_1.title, tracks_1.group_id
	                    Inner Unique: true
	                    Buffers: shared hit=60
	                    ->  Seq Scan on public.orbit_track_videos videos  (cost=0.00..21.50 rows=1 width=84) (actual time=0.231..0.361 rows=17 loops=1)
	                          Output: videos.id, videos.track_id, videos.video_type, videos.video_url, videos.published_on, videos.memo, videos.created_at, videos.updated_at
	                          Filter: ((InitPlan 4).col1 AND (videos.published_on IS NOT NULL) AND (EXTRACT(month FROM videos.published_on) = ($1)::numeric) AND (EXTRACT(day FROM videos.published_on) = ($2)::numeric))
	                          Rows Removed by Filter: 383
	                          Buffers: shared hit=9
	                    ->  Index Scan using orbit_tracks_pkey on public.orbit_tracks tracks_1  (cost=0.27..8.29 rows=1 width=64) (actual time=0.015..0.015 rows=1 loops=17)
	                          Output: tracks_1.id, tracks_1.title, tracks_1.group_id
	                          Index Cond: (tracks_1.id = videos.track_id)
	                          Filter: (InitPlan 5).col1
	                          Buffers: shared hit=51
	              ->  Index Scan using orbit_groups_pkey on public.orbit_groups groups_1  (cost=0.13..0.22 rows=1 width=48) (actual time=0.008..0.008 rows=1 loops=17)
	                    Output: groups_1.name_ja, groups_1.id
	                    Index Cond: (groups_1.id = tracks_1.group_id)
	                    Filter: (InitPlan 6).col1
	                    Buffers: shared hit=34
	Query Identifier: 6504876395178306887
```

### rpc_videos_otd:call  (duration: 7.727 ms)
```
	Query Text: WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "target_month", "target_day" FROM json_to_record(pgrst_payload.json_data) AS _("target_month" integer, "target_day" integer) LIMIT 1) pgrst_body , LATERAL "public"."find_orbit_calendar_videos_on_this_day"("target_month" := pgrst_body."target_month", "target_day" := pgrst_body."target_day") pgrst_call) SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM (SELECT "record".* FROM "pgrst_source" AS "record"   LIMIT $2 OFFSET $3) _postgrest_t
	Aggregate  (cost=35.27..35.28 rows=1 width=144) (actual time=7.704..7.706 rows=1 loops=1)
	  Output: NULL::bigint, count(_postgrest_t.*), COALESCE(json_agg(_postgrest_t.*), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=1392
	  ->  Subquery Scan on _postgrest_t  (cost=0.25..30.26 rows=1000 width=172) (actual time=7.621..7.641 rows=31 loops=1)
	        Output: _postgrest_t.*
	        Buffers: shared hit=1392
	        ->  Limit  (cost=0.25..20.26 rows=1000 width=148) (actual time=7.606..7.616 rows=31 loops=1)
	              Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	              Buffers: shared hit=1392
	              ->  Nested Loop  (cost=0.25..20.26 rows=1000 width=148) (actual time=7.604..7.612 rows=31 loops=1)
	                    Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	                    Buffers: shared hit=1392
	                    ->  Limit  (cost=0.00..0.01 rows=1 width=8) (actual time=0.018..0.018 rows=1 loops=1)
	                          Output: _.target_month, _.target_day
	                          ->  Function Scan on pg_catalog.json_to_record _  (cost=0.00..0.01 rows=1 width=8) (actual time=0.017..0.017 rows=1 loops=1)
	                                Output: _.target_month, _.target_day
	                                Function Call: json_to_record('{"target_month":7,"target_day":19}'::json)
	                    ->  Function Scan on public.find_orbit_calendar_videos_on_this_day pgrst_call  (cost=0.25..10.25 rows=1000 width=148) (actual time=7.583..7.586 rows=31 loops=1)
	                          Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	                          Function Call: find_orbit_calendar_videos_on_this_day(_.target_month, _.target_day)
	                          Buffers: shared hit=1392
	Query Identifier: -419452193206441856
```

### rpc_videos_range:inner  (duration: 1.952 ms)
```
	Query Text: 
	  SELECT
	    tracks.id AS track_id,
	    tracks.title AS track_title,
	    groups.name_ja AS group_name_ja,
	    'mv'::TEXT AS video_type,
	    mvs.mv_url AS url,
	    mvs.published_on AS date
	  FROM public.orbit_track_mvs mvs
	  JOIN public.orbit_tracks tracks
	    ON tracks.id = mvs.track_id
	  JOIN public.orbit_groups groups
	    ON groups.id = tracks.group_id
	  WHERE mvs.published_on IS NOT NULL
	    AND (
	      (mvs.published_on >= range_1_start AND mvs.published_on < range_1_end)
	      OR (
	        range_2_start IS NOT NULL
	        AND range_2_end IS NOT NULL
	        AND mvs.published_on >= range_2_start
	        AND mvs.published_on < range_2_end
	      )
	    )
	
	  UNION ALL
	
	  SELECT
	    tracks.id AS track_id,
	    tracks.title AS track_title,
	    groups.name_ja AS group_name_ja,
	    videos.video_type,
	    videos.video_url AS url,
	    videos.published_on AS date
	  FROM public.orbit_track_videos videos
	  JOIN public.orbit_tracks tracks
	    ON tracks.id = videos.track_id
	  JOIN public.orbit_groups groups
	    ON groups.id = tracks.group_id
	  WHERE videos.published_on IS NOT NULL
	    AND (
	      (videos.published_on >= range_1_start AND videos.published_on < range_1_end)
	      OR (
	        range_2_start IS NOT NULL
	        AND range_2_end IS NOT NULL
	        AND videos.published_on >= range_2_start
	        AND videos.published_on < range_2_end
	      )
	    )
	
	  ORDER BY date, track_title, track_id, video_type;
	
	Sort  (cost=63.77..63.77 rows=2 width=148) (actual time=1.931..1.938 rows=14 loops=1)
	  Output: tracks.id, tracks.title, groups.name_ja, ('mv'::text), mvs.mv_url, mvs.published_on
	  Sort Key: mvs.published_on, tracks.title, tracks.id, ('mv'::text)
	  Sort Method: quicksort  Memory: 27kB
	  Buffers: shared hit=112
	  ->  Append  (cost=17.77..63.76 rows=2 width=148) (actual time=0.792..1.813 rows=14 loops=1)
	        Buffers: shared hit=103
	        ->  Nested Loop  (cost=17.77..31.76 rows=1 width=148) (actual time=0.792..0.906 rows=7 loops=1)
	              Output: tracks.id, tracks.title, groups.name_ja, 'mv'::text, mvs.mv_url, mvs.published_on
	              Inner Unique: true
	              Buffers: shared hit=79
	              InitPlan 1
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.169..0.169 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 2
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.395..0.395 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	                      Buffers: shared hit=55
	              InitPlan 3
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.157..0.157 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              ->  Hash Join  (cost=16.86..30.70 rows=1 width=100) (actual time=0.615..0.719 rows=7 loops=1)
	                    Output: mvs.mv_url, mvs.published_on, tracks.id, tracks.title, tracks.group_id
	                    Inner Unique: true
	                    Hash Cond: (tracks.id = mvs.track_id)
	                    Buffers: shared hit=65
	                    ->  Seq Scan on public.orbit_tracks tracks  (cost=0.00..13.40 rows=170 width=64) (actual time=0.406..0.477 rows=551 loops=1)
	                          Output: tracks.id, tracks.title, tracks.group_id
	                          Filter: (InitPlan 2).col1
	                          Buffers: shared hit=63
	                    ->  Hash  (cost=16.83..16.83 rows=2 width=52) (actual time=0.203..0.204 rows=7 loops=1)
	                          Output: mvs.mv_url, mvs.published_on, mvs.track_id
	                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
	                          Buffers: shared hit=2
	                          ->  Bitmap Heap Scan on public.orbit_track_mvs mvs  (cost=8.34..16.83 rows=2 width=52) (actual time=0.196..0.199 rows=7 loops=1)
	                                Output: mvs.mv_url, mvs.published_on, mvs.track_id
	                                Recheck Cond: (((mvs.published_on >= $1) AND (mvs.published_on < $2) AND (mvs.published_on IS NOT NULL)) OR ((mvs.published_on >= $3) AND (mvs.published_on < $4) AND (mvs.published_on IS NOT NULL)))
	                                Filter: (InitPlan 1).col1
	                                Heap Blocks: exact=1
	                                Buffers: shared hit=2
	                                ->  BitmapOr  (cost=8.34..8.34 rows=4 width=0) (actual time=0.015..0.016 rows=0 loops=1)
	                                      Buffers: shared hit=1
	                                      ->  Bitmap Index Scan on idx_orbit_track_mvs_published_on  (cost=0.00..4.17 rows=2 width=0) (actual time=0.014..0.014 rows=7 loops=1)
	                                            Index Cond: ((mvs.published_on >= $1) AND (mvs.published_on < $2) AND (mvs.published_on IS NOT NULL))
	                                            Buffers: shared hit=1
	                                      ->  Bitmap Index Scan on idx_orbit_track_mvs_published_on  (cost=0.00..4.17 rows=2 width=0) (actual time=0.001..0.001 rows=0 loops=1)
	                                            Index Cond: ((mvs.published_on >= $3) AND (mvs.published_on < $4) AND (mvs.published_on IS NOT NULL))
	              ->  Index Scan using orbit_groups_pkey on public.orbit_groups groups  (cost=0.13..0.22 rows=1 width=48) (actual time=0.026..0.026 rows=1 loops=7)
	                    Output: groups.name_ja, groups.id
	                    Index Cond: (groups.id = tracks.group_id)
	                    Filter: (InitPlan 3).col1
	                    Buffers: shared hit=14
	        ->  Nested Loop  (cost=17.79..31.98 rows=1 width=148) (actual time=0.788..0.904 rows=7 loops=1)
	              Output: tracks_1.id, tracks_1.title, groups_1.name_ja, videos.video_type, videos.video_url, videos.published_on
	              Inner Unique: true
	              Buffers: shared hit=24
	              InitPlan 4
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.240..0.240 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 5
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.159..0.159 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              InitPlan 6
	                ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.278..0.278 rows=1 loops=1)
	                      Output: public.has_orbit_read_role()
	              ->  Hash Join  (cost=16.88..30.92 rows=1 width=132) (actual time=0.483..0.580 rows=7 loops=1)
	                    Output: videos.video_type, videos.video_url, videos.published_on, tracks_1.id, tracks_1.title, tracks_1.group_id
	                    Hash Cond: (tracks_1.id = videos.track_id)
	                    Buffers: shared hit=10
	                    ->  Seq Scan on public.orbit_tracks tracks_1  (cost=0.00..13.40 rows=170 width=64) (actual time=0.164..0.247 rows=551 loops=1)
	                          Output: tracks_1.id, tracks_1.title, tracks_1.group_id
	                          Filter: (InitPlan 5).col1
	                          Buffers: shared hit=8
	                    ->  Hash  (cost=16.85..16.85 rows=2 width=84) (actual time=0.278..0.279 rows=7 loops=1)
	                          Output: videos.video_type, videos.video_url, videos.published_on, videos.track_id
	                          Buckets: 1024  Batches: 1  Memory Usage: 10kB
	                          Buffers: shared hit=2
	                          ->  Bitmap Heap Scan on public.orbit_track_videos videos  (cost=8.34..16.85 rows=2 width=84) (actual time=0.269..0.271 rows=7 loops=1)
	                                Output: videos.video_type, videos.video_url, videos.published_on, videos.track_id
	                                Recheck Cond: (((videos.published_on >= $1) AND (videos.published_on < $2) AND (videos.published_on IS NOT NULL)) OR ((videos.published_on >= $3) AND (videos.published_on < $4) AND (videos.published_on IS NOT NULL)))
	                                Filter: (InitPlan 4).col1
	                                Heap Blocks: exact=1
	                                Buffers: shared hit=2
	                                ->  BitmapOr  (cost=8.34..8.34 rows=5 width=0) (actual time=0.022..0.022 rows=0 loops=1)
	                                      Buffers: shared hit=1
	                                      ->  Bitmap Index Scan on idx_orbit_track_videos_published_on  (cost=0.00..4.17 rows=2 width=0) (actual time=0.018..0.018 rows=7 loops=1)
	                                            Index Cond: ((videos.published_on >= $1) AND (videos.published_on < $2) AND (videos.published_on IS NOT NULL))
	                                            Buffers: shared hit=1
	                                      ->  Bitmap Index Scan on idx_orbit_track_videos_published_on  (cost=0.00..4.17 rows=2 width=0) (actual time=0.001..0.001 rows=0 loops=1)
	                                            Index Cond: ((videos.published_on >= $3) AND (videos.published_on < $4) AND (videos.published_on IS NOT NULL))
	              ->  Index Scan using orbit_groups_pkey on public.orbit_groups groups_1  (cost=0.13..0.22 rows=1 width=48) (actual time=0.045..0.045 rows=1 loops=7)
	                    Output: groups_1.name_ja, groups_1.id
	                    Index Cond: (groups_1.id = tracks_1.group_id)
	                    Filter: (InitPlan 6).col1
	                    Buffers: shared hit=14
	Query Identifier: 516052618940172485
```

### rpc_videos_range:call  (duration: 7.162 ms)
```
	Query Text: WITH pgrst_source AS (SELECT "pgrst_call".* FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "range_1_start", "range_1_end", "range_2_start", "range_2_end" FROM json_to_record(pgrst_payload.json_data) AS _("range_1_start" date, "range_1_end" date, "range_2_start" date, "range_2_end" date) LIMIT 1) pgrst_body , LATERAL "public"."find_orbit_calendar_videos_in_ranges"("range_1_start" := pgrst_body."range_1_start", "range_1_end" := pgrst_body."range_1_end", "range_2_start" := pgrst_body."range_2_start", "range_2_end" := pgrst_body."range_2_end") pgrst_call) SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM (SELECT "record".* FROM "pgrst_source" AS "record"   LIMIT $2 OFFSET $3) _postgrest_t
	Aggregate  (cost=35.27..35.28 rows=1 width=144) (actual time=7.153..7.154 rows=1 loops=1)
	  Output: NULL::bigint, count(_postgrest_t.*), COALESCE(json_agg(_postgrest_t.*), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=1078
	  ->  Subquery Scan on _postgrest_t  (cost=0.25..30.26 rows=1000 width=172) (actual time=7.112..7.120 rows=14 loops=1)
	        Output: _postgrest_t.*
	        Buffers: shared hit=1078
	        ->  Limit  (cost=0.25..20.26 rows=1000 width=148) (actual time=7.093..7.098 rows=14 loops=1)
	              Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	              Buffers: shared hit=1078
	              ->  Nested Loop  (cost=0.25..20.26 rows=1000 width=148) (actual time=7.092..7.095 rows=14 loops=1)
	                    Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	                    Buffers: shared hit=1078
	                    ->  Limit  (cost=0.00..0.01 rows=1 width=16) (actual time=0.020..0.020 rows=1 loops=1)
	                          Output: _.range_1_start, _.range_1_end, _.range_2_start, _.range_2_end
	                          ->  Function Scan on pg_catalog.json_to_record _  (cost=0.00..0.01 rows=1 width=16) (actual time=0.019..0.019 rows=1 loops=1)
	                                Output: _.range_1_start, _.range_1_end, _.range_2_start, _.range_2_end
	                                Function Call: json_to_record('{"range_1_start":"2026-07-01","range_1_end":"2027-07-01","range_2_start":null,"range_2_end":null}'::json)
	                    ->  Function Scan on public.find_orbit_calendar_videos_in_ranges pgrst_call  (cost=0.25..10.25 rows=1000 width=148) (actual time=7.070..7.071 rows=14 loops=1)
	                          Output: pgrst_call.track_id, pgrst_call.track_title, pgrst_call.group_name_ja, pgrst_call.video_type, pgrst_call.url, pgrst_call.date
	                          Function Call: find_orbit_calendar_videos_in_ranges(_.range_1_start, _.range_1_end, _.range_2_start, _.range_2_end)
	                          Buffers: shared hit=1078
	Query Identifier: -878302827447361868
```

### attendance #1  (duration: 24.836 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_live_attendances"."id", "public"."orbit_live_attendances"."attended_type", "public"."orbit_live_attendances"."seat_note", "public"."orbit_live_attendances"."note", row_to_json("orbit_live_attendances_orbit_live_performances_1".*)::jsonb AS "orbit_live_performances" FROM "public"."orbit_live_attendances" INNER JOIN LATERAL ( SELECT "orbit_live_performances_1"."id", "orbit_live_performances_1"."performance_date", "orbit_live_performances_1"."starts_at", row_to_json("orbit_live_performances_orbit_lives_2".*)::jsonb AS "orbit_lives", row_to_json("orbit_live_performances_orbit_venues_2".*)::jsonb AS "orbit_venues" FROM "public"."orbit_live_performances" AS "orbit_live_performances_1" LEFT JOIN LATERAL ( SELECT "orbit_lives_2"."id", "orbit_lives_2"."name", "orbit_lives_2"."live_type", COALESCE( "orbit_lives_orbit_live_performer_groups_3"."orbit_lives_orbit_live_performer_groups_3", '[]') AS "orbit_live_performer_groups" FROM "public"."orbit_lives" AS "orbit_lives_2" LEFT JOIN LATERAL ( SELECT json_agg("orbit_lives_orbit_live_performer_groups_3")::jsonb AS "orbit_lives_orbit_live_performer_groups_3" FROM (SELECT row_to_json("orbit_live_performer_groups_orbit_groups_4".*)::jsonb AS "orbit_groups" FROM "public"."orbit_live_performer_groups" AS "orbit_live_performer_groups_3" LEFT JOIN LATERAL ( SELECT "orbit_groups_4"."id", "orbit_groups_4"."name_ja", "orbit_groups_4"."color" FROM "public"."orbit_groups" AS "orbit_groups_4" WHERE "orbit_groups_4"."id" = "orbit_live_performer_groups_3"."group_id"   LIMIT $1 OFFSET $2 ) AS "orbit_live_performer_groups_orbit_groups_4" ON TRUE WHERE "orbit_live_performer_groups_3"."live_id" = "orbit_lives_2"."id"   LIMIT $3 OFFSET $4 ) AS "orbit_lives_orbit_live_performer_groups_3" ) AS "orbit_lives_orbit_live_performer_groups_3" ON TRUE WHERE "orbit_lives_2"."id" = "orbit_live_performances_1"."live_id"   LIMIT $5 OFFSET $6 ) AS "orbit_live_performances_orbit_lives_2" ON TRUE  LEFT JOIN LATERAL ( SELECT "orbit_venues_2"."id", "orbit_venues_2"."name", "orbit_venues_2"."prefecture" FROM "public"."orbit_venues" AS "orbit_venues_2" WHERE "orbit_venues_2"."id" = "orbit_live_performances_1"."venue_id"   LIMIT $7 OFFSET $8 ) AS "orbit_live_performances_orbit_venues_2" ON TRUE WHERE NOT "orbit_live_performances_1"."performance_date" IS NULL AND  "orbit_live_performances_1"."performance_date" < $9 AND "orbit_live_performances_1"."id" = "public"."orbit_live_attendances"."performance_id"   LIMIT $10 OFFSET $11 ) AS "orbit_live_attendances_orbit_live_performances_1" ON TRUE  ORDER BY "orbit_live_attendances_orbit_live_performances_1"."performance_date" DESC  LIMIT $12 OFFSET $13 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=104.87..104.89 rows=1 width=144) (actual time=24.808..24.815 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb))), COALESCE(json_agg(ROW(orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb))), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=12024
	  ->  Limit  (cost=104.84..104.84 rows=2 width=148) (actual time=24.788..24.795 rows=3 loops=1)
	        Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb), orbit_live_attendances_orbit_live_performances_1.performance_date
	        Buffers: shared hit=12024
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.166..0.166 rows=1 loops=1)
	                Output: has_orbit_read_role()
	        InitPlan 2
	          ->  Result  (cost=0.00..0.03 rows=1 width=16) (actual time=0.018..0.019 rows=1 loops=1)
	        ->  Sort  (cost=104.54..104.55 rows=2 width=148) (actual time=24.787..24.792 rows=3 loops=1)
	              Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb), orbit_live_attendances_orbit_live_performances_1.performance_date
	              Sort Key: orbit_live_attendances_orbit_live_performances_1.performance_date DESC
	              Sort Method: top-N heapsort  Memory: 28kB
	              Buffers: shared hit=12024
	              ->  Nested Loop  (cost=26.32..104.53 rows=2 width=148) (actual time=1.042..24.552 rows=1000 loops=1)
	                    Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, (row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb, orbit_live_attendances_orbit_live_performances_1.performance_date
	                    Buffers: shared hit=12024
	                    ->  Bitmap Heap Scan on public.orbit_live_attendances  (cost=4.30..12.17 rows=2 width=128) (actual time=0.293..0.430 rows=1000 loops=1)
	                          Output: orbit_live_attendances.id, orbit_live_attendances.user_id, orbit_live_attendances.performance_id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, orbit_live_attendances.created_at, orbit_live_attendances.updated_at
	                          Recheck Cond: (orbit_live_attendances.user_id = (InitPlan 2).col1)
	                          Filter: (InitPlan 1).col1
	                          Heap Blocks: exact=13
	                          Buffers: shared hit=23
	                          ->  Bitmap Index Scan on orbit_live_attendances_user_id_performance_id_key  (cost=0.00..4.30 rows=3 width=0) (actual time=0.112..0.113 rows=1000 loops=1)
	                                Index Cond: (orbit_live_attendances.user_id = (InitPlan 2).col1)
	                                Buffers: shared hit=10
	                    ->  Subquery Scan on orbit_live_attendances_orbit_live_performances_1  (cost=22.02..46.16 rows=1 width=80) (actual time=0.018..0.019 rows=1 loops=1000)
	                          Output: orbit_live_attendances_orbit_live_performances_1.*, orbit_live_attendances_orbit_live_performances_1.performance_date
	                          Buffers: shared hit=12001
	                          ->  Limit  (cost=22.02..46.15 rows=1 width=116) (actual time=0.017..0.018 rows=1 loops=1000)
	                                Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, ((row_to_json(orbit_live_performances_orbit_lives_2.*))::jsonb), ((row_to_json(orbit_live_performances_orbit_venues_2.*))::jsonb)
	                                Buffers: shared hit=12001
	                                InitPlan 3
	                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.098..0.098 rows=1 loops=1)
	                                        Output: has_orbit_read_role()
	                                ->  Nested Loop Left Join  (cost=21.76..45.89 rows=1 width=116) (actual time=0.017..0.018 rows=1 loops=1000)
	                                      Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, (row_to_json(orbit_live_performances_orbit_lives_2.*))::jsonb, (row_to_json(orbit_live_performances_orbit_venues_2.*))::jsonb
	                                      Buffers: shared hit=12001
	                                      ->  Nested Loop Left Join  (cost=21.35..37.43 rows=1 width=172) (actual time=0.012..0.012 rows=1 loops=1000)
	                                            Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, orbit_live_performances_1.venue_id, orbit_live_performances_orbit_lives_2.*
	                                            Buffers: shared hit=10001
	                                            ->  Index Scan using orbit_live_performances_pkey on public.orbit_live_performances orbit_live_performances_1  (cost=0.28..8.30 rows=1 width=84) (actual time=0.001..0.001 rows=1 loops=1000)
	                                                  Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, orbit_live_performances_1.live_id, orbit_live_performances_1.venue_id
	                                                  Index Cond: (orbit_live_performances_1.id = orbit_live_attendances.performance_id)
	                                                  Filter: ((InitPlan 3).col1 AND (orbit_live_performances_1.performance_date IS NOT NULL) AND (orbit_live_performances_1.performance_date < '2026-07-19'::date))
	                                                  Buffers: shared hit=3000
	                                            ->  Subquery Scan on orbit_live_performances_orbit_lives_2  (cost=21.07..29.13 rows=1 width=104) (actual time=0.010..0.011 rows=1 loops=1000)
	                                                  Output: orbit_live_performances_orbit_lives_2.*
	                                                  Buffers: shared hit=7001
	                                                  ->  Limit  (cost=21.07..29.12 rows=1 width=112) (actual time=0.010..0.010 rows=1 loops=1000)
	                                                        Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, (COALESCE(((json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb), '[]'::jsonb))
	                                                        Buffers: shared hit=7001
	                                                        InitPlan 4
	                                                          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.093..0.093 rows=1 loops=1)
	                                                                Output: has_orbit_read_role()
	                                                        ->  Nested Loop Left Join  (cost=20.81..28.86 rows=1 width=112) (actual time=0.010..0.010 rows=1 loops=1000)
	                                                              Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, COALESCE(((json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb), '[]'::jsonb)
	                                                              Buffers: shared hit=7001
	                                                              ->  Index Scan using orbit_lives_pkey on public.orbit_lives orbit_lives_2  (cost=0.28..8.29 rows=1 width=80) (actual time=0.001..0.001 rows=1 loops=1000)
	                                                                    Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, orbit_lives_2.description, orbit_lives_2.created_at, orbit_lives_2.updated_at
	                                                                    Index Cond: (orbit_lives_2.id = orbit_live_performances_1.live_id)
	                                                                    Filter: (InitPlan 4).col1
	                                                                    Buffers: shared hit=3000
	                                                              ->  Aggregate  (cost=20.54..20.55 rows=1 width=32) (actual time=0.008..0.008 rows=1 loops=1000)
	                                                                    Output: (json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb
	                                                                    Buffers: shared hit=4001
	                                                                    ->  Subquery Scan on orbit_lives_orbit_live_performer_groups_3  (cost=4.85..20.53 rows=3 width=24) (actual time=0.006..0.006 rows=1 loops=1000)
	                                                                          Output: orbit_lives_orbit_live_performer_groups_3.*
	                                                                          Buffers: shared hit=4001
	                                                                          ->  Limit  (cost=4.85..20.50 rows=3 width=32) (actual time=0.005..0.006 rows=1 loops=1000)
	                                                                                Output: ((row_to_json(orbit_live_performer_groups_orbit_groups_4.*))::jsonb)
	                                                                                Buffers: shared hit=4001
	                                                                                InitPlan 5
	                                                                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.122..0.123 rows=1 loops=1)
	                                                                                        Output: has_orbit_read_role()
	                                                                                ->  Nested Loop Left Join  (cost=4.59..20.24 rows=3 width=32) (actual time=0.005..0.006 rows=1 loops=1000)
	                                                                                      Output: (row_to_json(orbit_live_performer_groups_orbit_groups_4.*))::jsonb
	                                                                                      Buffers: shared hit=4001
	                                                                                      ->  Bitmap Heap Scan on public.orbit_live_performer_groups orbit_live_performer_groups_3  (cost=4.33..16.19 rows=3 width=16) (actual time=0.001..0.002 rows=1 loops=1000)
	                                                                                            Output: orbit_live_performer_groups_3.id, orbit_live_performer_groups_3.live_id, orbit_live_performer_groups_3.group_id
	                                                                                            Recheck Cond: (orbit_live_performer_groups_3.live_id = orbit_lives_2.id)
	                                                                                            Filter: (InitPlan 5).col1
	                                                                                            Heap Blocks: exact=1000
	                                                                                            Buffers: shared hit=3000
	                                                                                            ->  Bitmap Index Scan on idx_orbit_live_performer_groups_live_id  (cost=0.00..4.33 rows=7 width=0) (actual time=0.001..0.001 rows=1 loops=1000)
	                                                                                                  Index Cond: (orbit_live_performer_groups_3.live_id = orbit_lives_2.id)
	                                                                                                  Buffers: shared hit=2000
	                                                                                      ->  Subquery Scan on orbit_live_performer_groups_orbit_groups_4  (cost=0.26..1.33 rows=1 width=104) (actual time=0.002..0.002 rows=1 loops=1001)
	                                                                                            Output: orbit_live_performer_groups_orbit_groups_4.*
	                                                                                            Buffers: shared hit=1001
	                                                                                            ->  Limit  (cost=0.26..1.32 rows=1 width=80) (actual time=0.001..0.002 rows=1 loops=1001)
	                                                                                                  Output: orbit_groups_4.id, orbit_groups_4.name_ja, orbit_groups_4.color
	                                                                                                  Buffers: shared hit=1001
	                                                                                                  InitPlan 6
	                                                                                                    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.129..0.130 rows=1 loops=1)
	                                                                                                          Output: has_orbit_read_role()
	                                                                                                  ->  Seq Scan on public.orbit_groups orbit_groups_4  (cost=0.00..1.06 rows=1 width=80) (actual time=0.001..0.001 rows=1 loops=1001)
	                                                                                                        Output: orbit_groups_4.id, orbit_groups_4.name_ja, orbit_groups_4.color
	                                                                                                        Filter: ((InitPlan 6).col1 AND (orbit_groups_4.id = orbit_live_performer_groups_3.group_id))
	                                                                                                        Rows Removed by Filter: 5
	                                                                                                        Buffers: shared hit=1001
	                                      ->  Subquery Scan on orbit_live_performances_orbit_venues_2  (cost=0.41..8.44 rows=1 width=104) (actual time=0.001..0.002 rows=1 loops=1000)
	                                            Output: orbit_live_performances_orbit_venues_2.*
	                                            Buffers: shared hit=2000
	                                            ->  Limit  (cost=0.41..8.43 rows=1 width=80) (actual time=0.001..0.001 rows=1 loops=1000)
	                                                  Output: orbit_venues_2.id, orbit_venues_2.name, orbit_venues_2.prefecture
	                                                  Buffers: shared hit=2000
	                                                  InitPlan 7
	                                                    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.133..0.133 rows=1 loops=1)
	                                                          Output: has_orbit_read_role()
	                                                  ->  Index Scan using orbit_venues_pkey on public.orbit_venues orbit_venues_2  (cost=0.15..8.17 rows=1 width=80) (actual time=0.001..0.001 rows=1 loops=1000)
	                                                        Output: orbit_venues_2.id, orbit_venues_2.name, orbit_venues_2.prefecture
	                                                        Index Cond: (orbit_venues_2.id = orbit_live_performances_1.venue_id)
	                                                        Filter: (InitPlan 7).col1
	                                                        Buffers: shared hit=2000
	Query Identifier: 3716019620363128206
```

### attendance #2  (duration: 1.49 ms)
```
	Query Text: WITH pgrst_source AS ( SELECT "public"."orbit_live_attendances"."id", "public"."orbit_live_attendances"."attended_type", "public"."orbit_live_attendances"."seat_note", "public"."orbit_live_attendances"."note", row_to_json("orbit_live_attendances_orbit_live_performances_1".*)::jsonb AS "orbit_live_performances" FROM "public"."orbit_live_attendances" INNER JOIN LATERAL ( SELECT "orbit_live_performances_1"."id", "orbit_live_performances_1"."performance_date", "orbit_live_performances_1"."starts_at", row_to_json("orbit_live_performances_orbit_lives_2".*)::jsonb AS "orbit_lives", row_to_json("orbit_live_performances_orbit_venues_2".*)::jsonb AS "orbit_venues" FROM "public"."orbit_live_performances" AS "orbit_live_performances_1" LEFT JOIN LATERAL ( SELECT "orbit_lives_2"."id", "orbit_lives_2"."name", "orbit_lives_2"."live_type", COALESCE( "orbit_lives_orbit_live_performer_groups_3"."orbit_lives_orbit_live_performer_groups_3", '[]') AS "orbit_live_performer_groups" FROM "public"."orbit_lives" AS "orbit_lives_2" LEFT JOIN LATERAL ( SELECT json_agg("orbit_lives_orbit_live_performer_groups_3")::jsonb AS "orbit_lives_orbit_live_performer_groups_3" FROM (SELECT row_to_json("orbit_live_performer_groups_orbit_groups_4".*)::jsonb AS "orbit_groups" FROM "public"."orbit_live_performer_groups" AS "orbit_live_performer_groups_3" LEFT JOIN LATERAL ( SELECT "orbit_groups_4"."id", "orbit_groups_4"."name_ja", "orbit_groups_4"."color" FROM "public"."orbit_groups" AS "orbit_groups_4" WHERE "orbit_groups_4"."id" = "orbit_live_performer_groups_3"."group_id"   LIMIT $1 OFFSET $2 ) AS "orbit_live_performer_groups_orbit_groups_4" ON TRUE WHERE "orbit_live_performer_groups_3"."live_id" = "orbit_lives_2"."id"   LIMIT $3 OFFSET $4 ) AS "orbit_lives_orbit_live_performer_groups_3" ) AS "orbit_lives_orbit_live_performer_groups_3" ON TRUE WHERE "orbit_lives_2"."id" = "orbit_live_performances_1"."live_id"   LIMIT $5 OFFSET $6 ) AS "orbit_live_performances_orbit_lives_2" ON TRUE  LEFT JOIN LATERAL ( SELECT "orbit_venues_2"."id", "orbit_venues_2"."name", "orbit_venues_2"."prefecture" FROM "public"."orbit_venues" AS "orbit_venues_2" WHERE "orbit_venues_2"."id" = "orbit_live_performances_1"."venue_id"   LIMIT $7 OFFSET $8 ) AS "orbit_live_performances_orbit_venues_2" ON TRUE WHERE NOT "orbit_live_performances_1"."performance_date" IS NULL AND  "orbit_live_performances_1"."performance_date" < $9 AND "orbit_live_performances_1"."id" = "public"."orbit_live_attendances"."performance_id"   LIMIT $10 OFFSET $11 ) AS "orbit_live_attendances_orbit_live_performances_1" ON TRUE  ORDER BY "orbit_live_attendances_orbit_live_performances_1"."performance_date" DESC  LIMIT $12 OFFSET $13 )  SELECT null::bigint AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, coalesce(json_agg(_postgrest_t), '[]') AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, '' AS response_inserted FROM ( SELECT * FROM pgrst_source ) _postgrest_t
	Aggregate  (cost=104.87..104.89 rows=1 width=144) (actual time=1.462..1.477 rows=1 loops=1)
	  Output: NULL::bigint, count(ROW(orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb))), COALESCE(json_agg(ROW(orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb))), '[]'::json), NULLIF(current_setting('response.headers'::text, true), ''::text), NULLIF(current_setting('response.status'::text, true), ''::text), ''::text
	  Buffers: shared hit=40
	  ->  Limit  (cost=104.84..104.84 rows=2 width=148) (actual time=1.435..1.450 rows=3 loops=1)
	        Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb), orbit_live_attendances_orbit_live_performances_1.performance_date
	        Buffers: shared hit=40
	        InitPlan 1
	          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.194..0.194 rows=1 loops=1)
	                Output: has_orbit_read_role()
	        InitPlan 2
	          ->  Result  (cost=0.00..0.03 rows=1 width=16) (actual time=0.018..0.018 rows=1 loops=1)
	        ->  Sort  (cost=104.54..104.55 rows=2 width=148) (actual time=1.434..1.448 rows=3 loops=1)
	              Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, ((row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb), orbit_live_attendances_orbit_live_performances_1.performance_date
	              Sort Key: orbit_live_attendances_orbit_live_performances_1.performance_date DESC
	              Sort Method: quicksort  Memory: 28kB
	              Buffers: shared hit=40
	              ->  Nested Loop  (cost=26.32..104.53 rows=2 width=148) (actual time=1.264..1.440 rows=3 loops=1)
	                    Output: orbit_live_attendances.id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, (row_to_json(orbit_live_attendances_orbit_live_performances_1.*))::jsonb, orbit_live_attendances_orbit_live_performances_1.performance_date
	                    Buffers: shared hit=40
	                    ->  Bitmap Heap Scan on public.orbit_live_attendances  (cost=4.30..12.17 rows=2 width=128) (actual time=0.247..0.253 rows=3 loops=1)
	                          Output: orbit_live_attendances.id, orbit_live_attendances.user_id, orbit_live_attendances.performance_id, orbit_live_attendances.attended_type, orbit_live_attendances.seat_note, orbit_live_attendances.note, orbit_live_attendances.created_at, orbit_live_attendances.updated_at
	                          Recheck Cond: (orbit_live_attendances.user_id = (InitPlan 2).col1)
	                          Filter: (InitPlan 1).col1
	                          Heap Blocks: exact=2
	                          Buffers: shared hit=4
	                          ->  Bitmap Index Scan on orbit_live_attendances_user_id_performance_id_key  (cost=0.00..4.30 rows=3 width=0) (actual time=0.036..0.037 rows=3 loops=1)
	                                Index Cond: (orbit_live_attendances.user_id = (InitPlan 2).col1)
	                                Buffers: shared hit=2
	                    ->  Subquery Scan on orbit_live_attendances_orbit_live_performances_1  (cost=22.02..46.16 rows=1 width=80) (actual time=0.371..0.380 rows=1 loops=3)
	                          Output: orbit_live_attendances_orbit_live_performances_1.*, orbit_live_attendances_orbit_live_performances_1.performance_date
	                          Buffers: shared hit=36
	                          ->  Limit  (cost=22.02..46.15 rows=1 width=116) (actual time=0.369..0.377 rows=1 loops=3)
	                                Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, ((row_to_json(orbit_live_performances_orbit_lives_2.*))::jsonb), ((row_to_json(orbit_live_performances_orbit_venues_2.*))::jsonb)
	                                Buffers: shared hit=36
	                                InitPlan 3
	                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.126..0.126 rows=1 loops=1)
	                                        Output: has_orbit_read_role()
	                                ->  Nested Loop Left Join  (cost=21.76..45.89 rows=1 width=116) (actual time=0.369..0.374 rows=1 loops=3)
	                                      Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, (row_to_json(orbit_live_performances_orbit_lives_2.*))::jsonb, (row_to_json(orbit_live_performances_orbit_venues_2.*))::jsonb
	                                      Buffers: shared hit=36
	                                      ->  Nested Loop Left Join  (cost=21.35..37.43 rows=1 width=172) (actual time=0.278..0.281 rows=1 loops=3)
	                                            Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, orbit_live_performances_1.venue_id, orbit_live_performances_orbit_lives_2.*
	                                            Buffers: shared hit=30
	                                            ->  Index Scan using orbit_live_performances_pkey on public.orbit_live_performances orbit_live_performances_1  (cost=0.28..8.30 rows=1 width=84) (actual time=0.050..0.050 rows=1 loops=3)
	                                                  Output: orbit_live_performances_1.id, orbit_live_performances_1.performance_date, orbit_live_performances_1.starts_at, orbit_live_performances_1.live_id, orbit_live_performances_1.venue_id
	                                                  Index Cond: (orbit_live_performances_1.id = orbit_live_attendances.performance_id)
	                                                  Filter: ((InitPlan 3).col1 AND (orbit_live_performances_1.performance_date IS NOT NULL) AND (orbit_live_performances_1.performance_date < '2026-07-19'::date))
	                                                  Buffers: shared hit=9
	                                            ->  Subquery Scan on orbit_live_performances_orbit_lives_2  (cost=21.07..29.13 rows=1 width=104) (actual time=0.227..0.229 rows=1 loops=3)
	                                                  Output: orbit_live_performances_orbit_lives_2.*
	                                                  Buffers: shared hit=21
	                                                  ->  Limit  (cost=21.07..29.12 rows=1 width=112) (actual time=0.225..0.227 rows=1 loops=3)
	                                                        Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, (COALESCE(((json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb), '[]'::jsonb))
	                                                        Buffers: shared hit=21
	                                                        InitPlan 4
	                                                          ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.136..0.136 rows=1 loops=1)
	                                                                Output: has_orbit_read_role()
	                                                        ->  Nested Loop Left Join  (cost=20.81..28.86 rows=1 width=112) (actual time=0.225..0.226 rows=1 loops=3)
	                                                              Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, COALESCE(((json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb), '[]'::jsonb)
	                                                              Buffers: shared hit=21
	                                                              ->  Index Scan using orbit_lives_pkey on public.orbit_lives orbit_lives_2  (cost=0.28..8.29 rows=1 width=80) (actual time=0.053..0.053 rows=1 loops=3)
	                                                                    Output: orbit_lives_2.id, orbit_lives_2.name, orbit_lives_2.live_type, orbit_lives_2.description, orbit_lives_2.created_at, orbit_lives_2.updated_at
	                                                                    Index Cond: (orbit_lives_2.id = orbit_live_performances_1.live_id)
	                                                                    Filter: (InitPlan 4).col1
	                                                                    Buffers: shared hit=9
	                                                              ->  Aggregate  (cost=20.54..20.55 rows=1 width=32) (actual time=0.170..0.170 rows=1 loops=3)
	                                                                    Output: (json_agg(orbit_lives_orbit_live_performer_groups_3.*))::jsonb
	                                                                    Buffers: shared hit=12
	                                                                    ->  Subquery Scan on orbit_lives_orbit_live_performer_groups_3  (cost=4.85..20.53 rows=3 width=24) (actual time=0.159..0.163 rows=1 loops=3)
	                                                                          Output: orbit_lives_orbit_live_performer_groups_3.*
	                                                                          Buffers: shared hit=12
	                                                                          ->  Limit  (cost=4.85..20.50 rows=3 width=32) (actual time=0.158..0.161 rows=1 loops=3)
	                                                                                Output: ((row_to_json(orbit_live_performer_groups_orbit_groups_4.*))::jsonb)
	                                                                                Buffers: shared hit=12
	                                                                                InitPlan 5
	                                                                                  ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.191..0.191 rows=1 loops=1)
	                                                                                        Output: has_orbit_read_role()
	                                                                                ->  Nested Loop Left Join  (cost=4.59..20.24 rows=3 width=32) (actual time=0.157..0.160 rows=1 loops=3)
	                                                                                      Output: (row_to_json(orbit_live_performer_groups_orbit_groups_4.*))::jsonb
	                                                                                      Buffers: shared hit=12
	                                                                                      ->  Bitmap Heap Scan on public.orbit_live_performer_groups orbit_live_performer_groups_3  (cost=4.33..16.19 rows=3 width=16) (actual time=0.077..0.078 rows=1 loops=3)
	                                                                                            Output: orbit_live_performer_groups_3.id, orbit_live_performer_groups_3.live_id, orbit_live_performer_groups_3.group_id
	                                                                                            Recheck Cond: (orbit_live_performer_groups_3.live_id = orbit_lives_2.id)
	                                                                                            Filter: (InitPlan 5).col1
	                                                                                            Heap Blocks: exact=3
	                                                                                            Buffers: shared hit=9
	                                                                                            ->  Bitmap Index Scan on idx_orbit_live_performer_groups_live_id  (cost=0.00..4.33 rows=7 width=0) (actual time=0.010..0.010 rows=1 loops=3)
	                                                                                                  Index Cond: (orbit_live_performer_groups_3.live_id = orbit_lives_2.id)
	                                                                                                  Buffers: shared hit=6
	                                                                                      ->  Subquery Scan on orbit_live_performer_groups_orbit_groups_4  (cost=0.26..1.33 rows=1 width=104) (actual time=0.072..0.073 rows=1 loops=3)
	                                                                                            Output: orbit_live_performer_groups_orbit_groups_4.*
	                                                                                            Buffers: shared hit=3
	                                                                                            ->  Limit  (cost=0.26..1.32 rows=1 width=80) (actual time=0.067..0.069 rows=1 loops=3)
	                                                                                                  Output: orbit_groups_4.id, orbit_groups_4.name_ja, orbit_groups_4.color
	                                                                                                  Buffers: shared hit=3
	                                                                                                  InitPlan 6
	                                                                                                    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.174..0.175 rows=1 loops=1)
	                                                                                                          Output: has_orbit_read_role()
	                                                                                                  ->  Seq Scan on public.orbit_groups orbit_groups_4  (cost=0.00..1.06 rows=1 width=80) (actual time=0.066..0.067 rows=1 loops=3)
	                                                                                                        Output: orbit_groups_4.id, orbit_groups_4.name_ja, orbit_groups_4.color
	                                                                                                        Filter: ((InitPlan 6).col1 AND (orbit_groups_4.id = orbit_live_performer_groups_3.group_id))
	                                                                                                        Rows Removed by Filter: 5
	                                                                                                        Buffers: shared hit=3
	                                      ->  Subquery Scan on orbit_live_performances_orbit_venues_2  (cost=0.41..8.44 rows=1 width=104) (actual time=0.078..0.080 rows=1 loops=3)
	                                            Output: orbit_live_performances_orbit_venues_2.*
	                                            Buffers: shared hit=6
	                                            ->  Limit  (cost=0.41..8.43 rows=1 width=80) (actual time=0.076..0.078 rows=1 loops=3)
	                                                  Output: orbit_venues_2.id, orbit_venues_2.name, orbit_venues_2.prefecture
	                                                  Buffers: shared hit=6
	                                                  InitPlan 7
	                                                    ->  Result  (cost=0.00..0.26 rows=1 width=1) (actual time=0.203..0.204 rows=1 loops=1)
	                                                          Output: has_orbit_read_role()
	                                                  ->  Index Scan using orbit_venues_pkey on public.orbit_venues orbit_venues_2  (cost=0.15..8.17 rows=1 width=80) (actual time=0.075..0.077 rows=1 loops=3)
	                                                        Output: orbit_venues_2.id, orbit_venues_2.name, orbit_venues_2.prefecture
	                                                        Index Cond: (orbit_venues_2.id = orbit_live_performances_1.venue_id)
	                                                        Filter: (InitPlan 7).col1
	                                                        Buffers: shared hit=6
	Query Identifier: 3716019620363128206
```

