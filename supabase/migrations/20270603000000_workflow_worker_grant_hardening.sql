-- =============================================================================
-- Workflow worker function grant hardening
--
-- Worker-only SECURITY DEFINER functions in the `public` schema were provisioned
-- with EXECUTE granted to `anon` and `authenticated` (the baseline dump
-- re-granted them to every API role immediately after REVOKE ... FROM PUBLIC).
-- Because these functions run with definer privileges and bypass RLS, exposing
-- them to the public API roles let any client holding the anon key:
--   * decrypt stored BYOK provider keys      (fn_worker_decrypt_api_key)
--   * read any lens template body regardless of visibility
--                                            (fn_worker_get_lens_template_body)
--   * claim / complete / fail runs and battle jobs, draining or forging the
--     execution queue                        (fn_worker_claim_*, _complete_*, _fail_*)
--
-- None of these functions are invoked by any client (web / cli / mcp / gateway);
-- they are called exclusively by the worker, which authenticates as
-- `service_role`. This migration revokes EXECUTE from `anon` and `authenticated`
-- and re-affirms `service_role` access, restoring the worker-only boundary.
-- REVOKE of an absent grant is a no-op, so this is safe regardless of the
-- current live grant state.
--
-- Verified by: supabase/tests/100_worker_fn_grant_hardening.sql
-- =============================================================================

REVOKE ALL     ON FUNCTION "public"."fn_claim_stale_workflow_run"("p_worker_id" "text", "p_stale_after_ms" integer, "p_max_claims" integer) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_claim_stale_workflow_run"("p_worker_id" "text", "p_stale_after_ms" integer, "p_max_claims" integer) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_heartbeat_workflow_run"("p_run_id" "uuid", "p_worker_id" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_heartbeat_workflow_run"("p_run_id" "uuid", "p_worker_id" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_battle_job_to_dlq"("p_job_id" "uuid", "p_error_code" "text", "p_error_msg" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_battle_job_to_dlq"("p_job_id" "uuid", "p_error_code" "text", "p_error_msg" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_claim_battle_job"("p_worker_id" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_claim_queued_run"() FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_claim_queued_run"() TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("p_worker_id" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_claim_scheduled_workflow_run"("p_worker_id" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_claim_team_run"() FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_claim_team_run"() TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_complete_battle_job"("p_job_id" "uuid", "p_status" "text", "p_output_text" "text", "p_error" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_complete_battle_job"("p_job_id" "uuid", "p_status" "text", "p_output_text" "text", "p_error" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_complete_execution_run"("p_run_id" "uuid", "p_status" "text", "p_token_input" integer, "p_token_output" integer, "p_credit_cost" bigint, "p_billing_status" "text", "p_response_text" "text", "p_response_meta" "jsonb", "p_error_code" "text", "p_error_message" "text", "p_latency_ms" integer) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_decrypt_api_key"("p_key_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_decrypt_api_key"("p_key_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_fail_execution_run"("p_run_id" "uuid", "p_error_code" "text", "p_error_message" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_fail_execution_run"("p_run_id" "uuid", "p_error_code" "text", "p_error_message" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_battle_for_judge"("p_battle_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_battle_for_judge"("p_battle_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_battle_for_og"("p_battle_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_battle_for_og"("p_battle_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_delegation_context"("p_team_run_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_delegation_context"("p_team_run_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_lens_template_body"("p_lens_id" "uuid", "p_version_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_lens_template_body"("p_lens_id" "uuid", "p_version_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_team_run"("p_team_run_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_team_run"("p_team_run_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_vote_risk_data"("p_battle_id" "uuid", "p_lenser_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_vote_risk_data"("p_battle_id" "uuid", "p_lenser_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_voter_stats"("p_voter_lenser_id" "uuid", "p_since_ts" timestamp with time zone) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_voter_stats"("p_voter_lenser_id" "uuid", "p_since_ts" timestamp with time zone) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_workflow_context"("p_run_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_workflow_context"("p_run_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_get_workflow_graph"("p_workflow_id" "uuid") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_get_workflow_graph"("p_workflow_id" "uuid") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_insert_workflow_media_object"("p_workspace_id" "uuid", "p_owner_lenser_id" "uuid", "p_run_id" "uuid", "p_node_id" "uuid", "p_external_url" "text", "p_mime_type" "text", "p_media_type" "text", "p_name" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_insert_workflow_media_object"("p_workspace_id" "uuid", "p_owner_lenser_id" "uuid", "p_run_id" "uuid", "p_node_id" "uuid", "p_external_url" "text", "p_mime_type" "text", "p_media_type" "text", "p_name" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_persist_execution_artifacts"("p_run_id" "uuid", "p_lenser_id" "uuid", "p_workspace_id" "uuid", "p_ai_model_id" "uuid", "p_kind" "text", "p_content_text" "text", "p_content_json" "jsonb", "p_media_ids" "uuid"[]) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_render_template"("p_version_id" "uuid", "p_inputs" "jsonb") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_requeue_battle_job"("p_job_id" "uuid", "p_backoff_ms" integer, "p_error" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_requeue_battle_job"("p_job_id" "uuid", "p_backoff_ms" integer, "p_error" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_run_auto_promote_cycle"() FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_run_auto_promote_cycle"() TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_set_battle_og_image"("p_battle_id" "uuid", "p_og_image_url" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_set_battle_og_image"("p_battle_id" "uuid", "p_og_image_url" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_update_team_run"("p_team_run_id" "uuid", "p_status" "text", "p_completed_at" timestamp with time zone) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_update_team_run"("p_team_run_id" "uuid", "p_status" "text", "p_completed_at" timestamp with time zone) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_update_team_run_status"("p_team_run_id" "uuid", "p_status" "text", "p_completed_at" timestamp with time zone) FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_update_team_run_status"("p_team_run_id" "uuid", "p_status" "text", "p_completed_at" timestamp with time zone) TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_update_vote_risk_score"("p_vote_id" "uuid", "p_risk_score" numeric, "p_risk_factors" "text"[], "p_review_status" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_update_vote_risk_score"("p_vote_id" "uuid", "p_risk_score" numeric, "p_risk_factors" "text"[], "p_review_status" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_upsert_battle_submission"("p_battle_id" "uuid", "p_contender_id" "uuid", "p_content_text" "text", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_is_final" boolean, "p_media_url" "text", "p_mime_type" "text", "p_output_modality" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_upsert_battle_submission"("p_battle_id" "uuid", "p_contender_id" "uuid", "p_content_text" "text", "p_execution_run_id" "uuid", "p_artifact_id" "uuid", "p_is_final" boolean, "p_media_url" "text", "p_mime_type" "text", "p_output_modality" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_upsert_heartbeat"("p_worker_id" "text", "p_worker_type" "text", "p_metadata" "jsonb") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_upsert_heartbeat"("p_worker_id" "text", "p_worker_type" "text", "p_metadata" "jsonb") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_upsert_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_upsert_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_worker_upsert_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text", "p_resolved_input_snapshot" "jsonb", "p_provider_route" "jsonb") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_worker_upsert_node_result"("p_run_id" "uuid", "p_node_id" "uuid", "p_status" "text", "p_output_data" "jsonb", "p_error_message" "text", "p_resolved_input_snapshot" "jsonb", "p_provider_route" "jsonb") TO   "service_role";

REVOKE ALL     ON FUNCTION "public"."fn_workflows_dispatch_on_event"("p_event_type" "text", "p_event_payload" "jsonb") FROM "anon", "authenticated", PUBLIC;
GRANT  EXECUTE ON FUNCTION "public"."fn_workflows_dispatch_on_event"("p_event_type" "text", "p_event_payload" "jsonb") TO   "service_role";

