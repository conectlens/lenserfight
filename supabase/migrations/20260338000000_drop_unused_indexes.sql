-- Drop unused indexes identified by Supabase Performance Linter
-- These indexes have never been used and increase write overhead and storage cost.

-- content.reports
DROP INDEX IF EXISTS content.idx_reports_reporter_id;
DROP INDEX IF EXISTS content.idx_reports_target;
DROP INDEX IF EXISTS content.idx_reports_target_type_id;

-- lensers.follows
DROP INDEX IF EXISTS lensers.idx_follows_follower_following;
DROP INDEX IF EXISTS lensers.idx_follows_follower_id;
DROP INDEX IF EXISTS lensers.idx_follows_following_id;

-- lensers.tag_follows
DROP INDEX IF EXISTS lensers.idx_tag_follows_lenser_id;
DROP INDEX IF EXISTS lensers.idx_tag_follows_tag_id;

-- analytics.lenser_join_log
DROP INDEX IF EXISTS analytics.lenser_join_log_join_order_idx;

-- content.thread_replies
DROP INDEX IF EXISTS content.idx_thread_replies_lenser_id;
DROP INDEX IF EXISTS content.idx_thread_replies_parent;
DROP INDEX IF EXISTS content.idx_thread_replies_thread_created;

-- analytics.shared_links
DROP INDEX IF EXISTS analytics.shared_links_campaign_idx;
DROP INDEX IF EXISTS analytics.shared_links_creator_lenser_id_idx;
DROP INDEX IF EXISTS analytics.shared_links_resource_idx;
DROP INDEX IF EXISTS analytics.shared_links_short_id_idx;

-- ai.generations
DROP INDEX IF EXISTS ai.ai_generations_lenser_idx;
DROP INDEX IF EXISTS ai.ai_generations_media_idx;
DROP INDEX IF EXISTS ai.ai_generations_model_idx;
DROP INDEX IF EXISTS ai.ai_generations_prompt_tpl_idx;
DROP INDEX IF EXISTS ai.ai_generations_visibility_idx;

-- ai.models
DROP INDEX IF EXISTS ai.ai_models_slug_idx;

-- analytics.lenser_activity
DROP INDEX IF EXISTS analytics.idx_lenser_activity_lenser_id;

-- analytics.lenser_country_join_log
DROP INDEX IF EXISTS analytics.idx_country_join_order;

-- analytics.page_views
DROP INDEX IF EXISTS analytics.idx_page_views_lenser_id;
DROP INDEX IF EXISTS analytics.idx_page_views_user_id;
DROP INDEX IF EXISTS analytics.page_views_created_at_idx;
DROP INDEX IF EXISTS analytics.page_views_target_idx;

-- analytics.tag_activity_events
DROP INDEX IF EXISTS analytics.tag_activity_events_actor_idx;
DROP INDEX IF EXISTS analytics.tag_activity_events_occurred_at_idx;
DROP INDEX IF EXISTS analytics.tag_activity_events_tag_idx;

-- analytics.product_feedback
DROP INDEX IF EXISTS analytics.feedback_user_id_idx;

-- analytics.share_events
DROP INDEX IF EXISTS analytics.share_events_event_type_idx;
DROP INDEX IF EXISTS analytics.share_events_ip_hash_idx;
DROP INDEX IF EXISTS analytics.share_events_link_idx;
DROP INDEX IF EXISTS analytics.share_events_viewer_lenser_idx;

-- analytics.tag_activity_daily
DROP INDEX IF EXISTS analytics.idx_tag_activity_daily_date_tag;
DROP INDEX IF EXISTS analytics.idx_tag_activity_daily_tag_id;
DROP INDEX IF EXISTS analytics.tag_activity_daily_entity_date_idx;
DROP INDEX IF EXISTS analytics.tag_activity_daily_tag_date_idx;

-- battles.agent_adapters
DROP INDEX IF EXISTS battles.idx_agent_adapters_owner;

-- battles.battles
DROP INDEX IF EXISTS battles.idx_battles_creator;
DROP INDEX IF EXISTS battles.idx_battles_forum_thread_id;
DROP INDEX IF EXISTS battles.idx_battles_rubric_id;
DROP INDEX IF EXISTS battles.idx_battles_slug;
DROP INDEX IF EXISTS battles.idx_battles_status;
DROP INDEX IF EXISTS battles.idx_battles_status_created;
DROP INDEX IF EXISTS battles.idx_battles_winner_contender_id;

-- battles.contenders
DROP INDEX IF EXISTS battles.idx_contenders_adapter;
DROP INDEX IF EXISTS battles.idx_contenders_battle;

-- battles.events
DROP INDEX IF EXISTS battles.idx_events_actor_id;
DROP INDEX IF EXISTS battles.idx_events_battle_id;
DROP INDEX IF EXISTS battles.idx_events_created_at;

-- battles.invitations
DROP INDEX IF EXISTS battles.idx_invitations_battle_id;
DROP INDEX IF EXISTS battles.idx_invitations_invited_lenser;
DROP INDEX IF EXISTS battles.idx_invitations_inviter_id;

-- battles.rubrics
DROP INDEX IF EXISTS battles.idx_rubrics_creator;

-- battles.scorecards
DROP INDEX IF EXISTS battles.idx_scorecards_battle_contender;
DROP INDEX IF EXISTS battles.idx_scorecards_contender_id;
DROP INDEX IF EXISTS battles.idx_scorecards_rubric_criterion_id;
DROP INDEX IF EXISTS battles.idx_scorecards_scorer_model_id;

-- battles.submissions
DROP INDEX IF EXISTS battles.idx_submissions_battle;
DROP INDEX IF EXISTS battles.idx_submissions_contender;

-- battles.templates
DROP INDEX IF EXISTS battles.idx_templates_creator;
DROP INDEX IF EXISTS battles.idx_templates_public;
DROP INDEX IF EXISTS battles.idx_templates_rubric_id;

-- battles.votes
DROP INDEX IF EXISTS battles.idx_votes_battle;
DROP INDEX IF EXISTS battles.idx_votes_voter;

-- content.media_library
DROP INDEX IF EXISTS content.media_library_created_at_idx;
DROP INDEX IF EXISTS content.media_library_lenser_idx;

-- content.prompt_reactions
DROP INDEX IF EXISTS content.idx_prompt_reactions_created_at;
DROP INDEX IF EXISTS content.idx_prompt_reactions_prompt_id;
DROP INDEX IF EXISTS content.idx_prompt_reactions_prompt_reaction;
DROP INDEX IF EXISTS content.idx_prompt_reactions_user_created;

-- content.prompt_templates
DROP INDEX IF EXISTS content.idx_prompt_templates_lenser_id_created;
DROP INDEX IF EXISTS content.idx_prompt_templates_public_created;
DROP INDEX IF EXISTS content.prompt_templates_visibility_idx;

-- content.prompt_translations
DROP INDEX IF EXISTS content.idx_prompt_translations_language_code;

-- content.tag_map
DROP INDEX IF EXISTS content.idx_tag_map_type_tag;
DROP INDEX IF EXISTS content.tag_map_language_idx;

-- content.tag_suggestions
DROP INDEX IF EXISTS content.idx_tag_suggestions_tag_id;

-- content.tag_translations
DROP INDEX IF EXISTS content.idx_tag_translations_language_code;

-- content.tags
DROP INDEX IF EXISTS content.tags_visibility_idx;

-- content.thread_reactions
DROP INDEX IF EXISTS content.idx_thread_reactions_created_at;
DROP INDEX IF EXISTS content.idx_thread_reactions_user_created;

-- content.thread_reply_reactions
DROP INDEX IF EXISTS content.idx_thread_reply_reactions_reply_reaction;

-- content.thread_translations
DROP INDEX IF EXISTS content.idx_thread_translations_language_code;

-- content.threads
DROP INDEX IF EXISTS content.idx_threads_public_created;
DROP INDEX IF EXISTS content.idx_threads_public_feed;
DROP INDEX IF EXISTS content.threads_visibility_idx;

-- lensers.profiles
DROP INDEX IF EXISTS lensers.idx_lensers_profiles_onboarding_completed;
DROP INDEX IF EXISTS lensers.idx_profiles_joined_at;
DROP INDEX IF EXISTS lensers.idx_profiles_last_active_at;
DROP INDEX IF EXISTS lensers.idx_profiles_preferred_language;

-- lensers.badges
DROP INDEX IF EXISTS lensers.lenser_badges_lenser_id_idx;

-- lensers.waiting_list_tokens
DROP INDEX IF EXISTS lensers.idx_waiting_list_tokens_email;

-- lensers.waiting_list_unsubscribe_tokens
DROP INDEX IF EXISTS lensers.idx_waiting_list_unsubscribe_tokens_email;

-- ops.contact
DROP INDEX IF EXISTS ops.contact_messages_created_idx;
DROP INDEX IF EXISTS ops.contact_messages_lenser_idx;

-- system.entity_translations
DROP INDEX IF EXISTS system.idx_translations_entity;
DROP INDEX IF EXISTS system.idx_translations_entity_lang;
DROP INDEX IF EXISTS system.idx_translations_field;
DROP INDEX IF EXISTS system.idx_translations_lang;

-- xp.event_verifications
DROP INDEX IF EXISTS xp.idx_xp_event_verifications_event_id;

-- xp.events
DROP INDEX IF EXISTS xp.xp_events_action_idx;
DROP INDEX IF EXISTS xp.xp_events_created_idx;
DROP INDEX IF EXISTS xp.xp_events_lenser_idx;
DROP INDEX IF EXISTS xp.xp_events_rule_idx;

-- xp.level_ups
DROP INDEX IF EXISTS xp.idx_xp_level_ups_lenser_id;

-- xp.monthly_rollup
DROP INDEX IF EXISTS xp.xp_monthly_rollup_idx;

-- xp.policy
DROP INDEX IF EXISTS xp.xp_policy_created_at_idx;

-- xp.season_totals
DROP INDEX IF EXISTS xp.idx_xp_season_totals_lenser_id;

-- xp.totals
DROP INDEX IF EXISTS xp.xp_totals_idx;
