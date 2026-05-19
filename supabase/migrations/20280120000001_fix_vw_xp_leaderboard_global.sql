-- Fix vw_xp_leaderboard_global to rank lensers globally across all apps.
-- Previously the view partitioned by app_id, producing per-app rank lists.
-- The client was filtering to a single app_id that had no data, yielding empty results.
-- The global leaderboard should rank all lensers by their best (max) XP across any app,
-- with a single rank per lenser.

DROP VIEW IF EXISTS "public"."vw_xp_leaderboard_global";
CREATE OR REPLACE VIEW "public"."vw_xp_leaderboard_global" AS
WITH "aggregated" AS (
    SELECT
        "t"."lenser_id",
        SUM("t"."total_xp") AS "total_xp",
        MAX("t"."current_level") AS "current_level"
    FROM "xp"."totals" "t"
    GROUP BY "t"."lenser_id"
),
"ranked" AS (
    SELECT
        "a"."lenser_id",
        "a"."total_xp",
        "a"."current_level",
        "rank"() OVER (ORDER BY "a"."total_xp" DESC, "a"."lenser_id") AS "rank"
    FROM "aggregated" "a"
)
SELECT
    "r"."rank",
    "r"."lenser_id",
    "r"."total_xp",
    "r"."current_level",
    "jsonb_build_object"(
        'display_name', "l"."display_name",
        'handle', "l"."handle",
        'avatar_url', "l"."avatar_url"
    ) AS "user"
FROM "ranked" "r"
JOIN "lensers"."profiles" "l" ON ("l"."id" = "r"."lenser_id")
WHERE "r"."rank" <= 100;
