export const DEFAULT_CONSTRAINT_MESSAGE =
  'Your input violates a data rule. Please check your values and try again.'

// Maps Postgres constraint names → user-friendly messages.
// Add one entry here whenever a new named constraint is introduced in a migration.
export const CONSTRAINT_MESSAGES: Record<string, string> = {
  // ── Text-length checks (migration 20270510300000) ───────────────────────────

  // lensers.profiles
  ck_lensers_profiles_display_name_len: 'Display name cannot exceed 60 characters.',
  ck_lensers_profiles_bio_len: 'Bio cannot exceed 500 characters.',
  ck_lensers_profiles_headline_len: 'Headline cannot exceed 120 characters.',

  // battles.battles
  ck_battles_battles_title_len: 'Battle title cannot exceed 200 characters.',
  ck_battles_battles_task_prompt_len: 'Task prompt cannot exceed 32,000 characters.',
  ck_battles_battles_ai_judge_prompt_len: 'Judge prompt cannot exceed 8,000 characters.',
  ck_battles_battles_invite_code_len: 'Invite code cannot exceed 32 characters.',

  // battles.submissions
  ck_battles_submissions_content_text_len: 'Submission content cannot exceed 20,000 characters.',

  // battles.templates
  ck_battles_templates_title_len: 'Template title cannot exceed 200 characters.',
  ck_battles_templates_description_len: 'Template description cannot exceed 2,000 characters.',
  ck_battles_templates_task_prompt_len: 'Template task prompt cannot exceed 32,000 characters.',

  // content.threads
  ck_content_threads_title_len: 'Thread title cannot exceed 200 characters.',

  // content.thread_replies
  ck_content_thread_replies_content_len: 'Reply content cannot exceed 5,000 characters.',

  // content.entity_translations
  ck_content_entity_translations_title_len: 'Translation title cannot exceed 200 characters.',
  ck_content_entity_translations_description_len:
    'Translation description cannot exceed 2,000 characters.',
  ck_content_entity_translations_content_len:
    'Translation content cannot exceed 32,000 characters.',

  // agents.memories
  ck_agents_memories_content_len: 'Memory content cannot exceed 20,000 characters.',

  // ── Unique constraints (migration 20270510100000) ────────────────────────────
  votes_unique_voter_per_contender: "You've already voted for this contender.",
  reactions_unique_per_user: "You've already reacted to this.",
  tag_follows_unique: "You're already following this tag.",

  // ── Slug format checks (migration 20270510300000) ────────────────────────────
  // Constraint names follow pattern ck_<table>_<col>_format — handled via suffix
  // match in normalize.ts; no explicit entries needed here unless a custom message
  // is required for a specific slug column.
}
