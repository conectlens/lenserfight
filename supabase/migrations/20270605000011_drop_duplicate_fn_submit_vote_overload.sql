-- fn_submit_vote existed as two overloads differing only in p_vote_value's
-- type (battles.vote_value_enum vs text). PostgREST/Postgres can't pick
-- between them for a plain JSON string argument, so every RPC call
-- (`lf battle vote`, and any web caller using the same signature) failed
-- with "Could not choose the best candidate function."
--
-- The two overloads were not equivalent: the enum version is the complete,
-- guarded implementation (checks battle is in voting phase, checks the
-- contender belongs to the battle, upserts battles.vote_aggregates,
-- increments battles.total_vote_count). The text version only inserted a
-- raw battles.votes row — no guards, no aggregate update, no total count —
-- so even if it had been reachable, votes cast through it would never have
-- shown up in results. Dropping it; the enum version is canonical.

DROP FUNCTION IF EXISTS "public"."fn_submit_vote"(
  "p_battle_id" "uuid",
  "p_voted_contender_id" "uuid",
  "p_vote_value" "text",
  "p_is_draw" boolean,
  "p_rationale" "text"
);
