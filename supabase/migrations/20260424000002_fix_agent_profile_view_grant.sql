-- =============================================================================
-- 20260424000002_fix_agent_profile_view_grant.sql
-- -----------------------------------------------------------------------------
-- Restores the SELECT grant on agents.v_agent_profile for the authenticated
-- role. The grant was lost when 20260424000000_agent_personality.sql used
-- DROP VIEW + CREATE VIEW to rebuild the view (DROP removes all GRANTs).
-- =============================================================================

GRANT SELECT ON TABLE agents.v_agent_profile TO authenticated, service_role;
