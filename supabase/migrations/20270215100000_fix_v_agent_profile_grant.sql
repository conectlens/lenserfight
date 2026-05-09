-- Fix: Phase 26 migration dropped and recreated agents.v_agent_profile without
-- re-applying grants, stripping SELECT access from authenticated users.
GRANT SELECT ON agents.v_agent_profile TO authenticated, service_role;
