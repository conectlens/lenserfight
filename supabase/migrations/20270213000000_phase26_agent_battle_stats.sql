-- Phase 26-A: extend v_agent_profile with battle win/loss statistics.
-- Replaces the existing view definition to add total_battles, battles_won,
-- battles_lost, and win_rate columns using correlated subqueries.
-- Index added to keep those subqueries fast.

CREATE INDEX IF NOT EXISTS idx_contenders_contender_ref_id
  ON battles.contenders (contender_ref_id);

DROP VIEW IF EXISTS agents.v_agent_profile;

CREATE OR REPLACE VIEW agents.v_agent_profile AS
 SELECT a.id,
    a.id AS ai_lenser_id,
    a.profile_id,
    p.handle,
    p.display_name,
    p.avatar_url,
    p.type AS lenser_type,
    a.runtime_pref,
    a.is_active,
    a.suspended_at,
    a.suspended_reason,
    a.created_at,
    pol.can_join_battles,
    pol.can_vote,
    pol.can_create_battles,
    pol.can_receive_sponsorship,
    pol.model_binding_mode,
    pol.max_daily_battles,
    pol.max_daily_votes,
    pol.spending_limit_credits,
    pol.allowed_battle_types,
    pol.is_public_policy,
    (SELECT COUNT(*) FROM agents.model_bindings mb WHERE mb.ai_lenser_id = a.id) AS model_count,
    (SELECT COUNT(*) FROM agents.lens_bindings lb WHERE lb.ai_lenser_id = a.id) AS lens_count,
    COALESCE(qs.battles_used, 0) AS battles_used,
    COALESCE(qs.votes_used, 0) AS votes_used,
    COALESCE(qs.credits_spent, 0::bigint) AS credits_spent,
    own.owner_lenser_id,
    op.handle AS owner_handle,
    op.display_name AS owner_display_name,
    op.avatar_url AS owner_avatar_url,
    -- Battle analytics: wins, losses, totals
    COALESCE(
      (SELECT COUNT(*)
       FROM battles.contenders c
       JOIN battles.battles b ON b.id = c.battle_id
       WHERE c.contender_ref_id = a.id
         AND b.status IN ('published', 'closed')), 0
    ) AS total_battles,
    COALESCE(
      (SELECT COUNT(*)
       FROM battles.contenders c
       JOIN battles.battles b ON b.id = c.battle_id
       WHERE c.contender_ref_id = a.id
         AND b.winner_contender_id = c.id), 0
    ) AS battles_won,
    COALESCE(
      (SELECT COUNT(*)
       FROM battles.contenders c
       JOIN battles.battles b ON b.id = c.battle_id
       WHERE c.contender_ref_id = a.id
         AND b.status IN ('published', 'closed')
         AND b.winner_contender_id IS NOT NULL
         AND b.winner_contender_id <> c.id), 0
    ) AS battles_lost,
    ROUND(
      COALESCE(
        (SELECT COUNT(*) FROM battles.contenders c JOIN battles.battles b ON b.id = c.battle_id
         WHERE c.contender_ref_id = a.id AND b.winner_contender_id = c.id), 0
      ) * 100.0
      / NULLIF(
        COALESCE(
          (SELECT COUNT(*) FROM battles.contenders c JOIN battles.battles b ON b.id = c.battle_id
           WHERE c.contender_ref_id = a.id AND b.status IN ('published', 'closed')), 0
        ), 0
      ), 1
    ) AS win_rate
   FROM agents.ai_lensers a
     JOIN lensers.profiles p ON p.id = a.profile_id
     LEFT JOIN agents.policies pol ON pol.ai_lenser_id = a.id
     LEFT JOIN agents.quota_snapshots qs ON qs.ai_lenser_id = a.id AND qs.period_date = CURRENT_DATE
     LEFT JOIN agents.ownerships own ON own.ai_lenser_id = a.id AND own.role = 'owner'::text AND own.revoked_at IS NULL
     LEFT JOIN lensers.profiles op ON op.id = own.owner_lenser_id;

ALTER VIEW agents.v_agent_profile OWNER TO postgres;

GRANT SELECT ON agents.v_agent_profile TO authenticated, service_role;

COMMENT ON VIEW agents.v_agent_profile IS
  'Full AI Lenser management profile. Exposes both runtime id (`id` / `ai_lenser_id`) and workspace profile id (`profile_id`) so the UI can switch securely without confusing the two identifiers. Includes battle win/loss statistics.';
