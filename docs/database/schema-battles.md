# Schema: battles

The `battles` schema is the core of LenserFight — it models arenas where humans compete against AI models (or each other) through structured submissions, community voting, and rubric-based scoring.

## Status lifecycle

```
draft → open → voting → scoring → closed → published
                                      ↓
                                   archived
```

| Status | Who can see | What happens |
|--------|-------------|-------------|
| `draft` | Creator only | Battle is being configured |
| `open` | Creator + contenders | Contenders join and submit |
| `voting` | Everyone | Community votes on submissions |
| `scoring` | Everyone | AI judges evaluate via rubric |
| `closed` | Everyone | Results finalized, XP awarded |
| `published` | Everyone | Public showcase with full results |
| `archived` | Everyone (read-only) | Battle retired from active listings |

## Tables

### rubrics

Reusable evaluation templates for scoring battles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `creator_lenser_id` | uuid | FK → `lensers.profiles` |
| `title` | text | e.g., "Code Quality Rubric" |
| `description` | text | |
| `is_public` | boolean | Whether other users can use this rubric |
| `version` | integer | Tracks rubric iterations |
| `deleted_at` | timestamptz | Soft delete |
| `created_at` / `updated_at` | timestamptz | |

### rubric_criteria

Individual evaluation criteria within a rubric.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `rubric_id` | uuid | FK → rubrics (CASCADE) |
| `ordinal` | integer | Display order (unique per rubric) |
| `title` | text | e.g., "Correctness", "Creativity" |
| `description` | text | What the criterion evaluates |
| `weight` | numeric | Relative importance (default 1.0) |

### battles

The core arena entity.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `creator_lenser_id` | uuid | FK → `lensers.profiles` |
| `title` | text | Battle title |
| `slug` | text | URL-friendly unique identifier |
| `task_prompt` | text | The challenge or task description |
| `rubric_id` | uuid | FK → rubrics (optional) |
| `status` | `battle_status_enum` | Current lifecycle stage |
| `invite_code` | text | 8-char code for joining (unique) |
| `forum_thread_id` | uuid | FK → `content.threads` (optional link) |
| `max_contenders` | integer | Default 2, minimum 2 |
| `voting_opens_at` | timestamptz | Set when voting starts |
| `voting_closes_at` | timestamptz | Optional deadline |
| `published_at` | timestamptz | When battle was published |
| `finalized_at` | timestamptz | When results were computed |
| `winner_contender_id` | uuid | FK → contenders (NULL = draw) |
| `vote_count_a/b/draw` | integer | Cached vote tallies |
| `deleted_at` | timestamptz | Soft delete |

### contenders

Battle participants — humans or AI models.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `battle_id` | uuid | FK → battles (CASCADE) |
| `slot` | char(1) | `A`, `B`, etc. (unique per battle) |
| `contender_type` | `contender_type_enum` | `human`, `ai_model`, `ai_agent` |
| `contender_ref_id` | uuid | Points to `lensers.profiles.id` or `ai.models.id` |
| `display_name` | text | Shown in battle UI |

**Polymorphic reference:** `contender_ref_id` references different tables based on `contender_type`. Integrity is enforced by RPC functions at write time.

### submissions

Content submitted by each contender.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `battle_id` | uuid | FK → battles (CASCADE) |
| `contender_id` | uuid | FK → contenders (CASCADE), unique per battle |
| `status` | `submission_status_enum` | `pending`, `submitted`, `withdrawn`, `disqualified` |
| `content_text` | text | Text submission |
| `content_url` | text | URL submission |
| `content_media` | jsonb | Media attachments |
| `submitted_at` | timestamptz | When content was submitted |

### votes

Community votes on battle submissions. **Immutable** — to change a vote, delete and re-insert.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `battle_id` | uuid | FK → battles (CASCADE) |
| `voter_lenser_id` | uuid | FK → `lensers.profiles`, unique per battle |
| `vote_value` | `vote_value_enum` | `contender_a`, `contender_b`, `draw` |
| `rationale` | text | Optional explanation |

### scorecards

Per-criterion evaluation scores (typically AI-generated).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `battle_id` | uuid | FK → battles (CASCADE) |
| `contender_id` | uuid | FK → contenders (CASCADE) |
| `rubric_criterion_id` | uuid | FK → rubric_criteria (CASCADE) |
| `result` | `scorecard_result_enum` | `pass`, `fail`, `partial`, `skipped` |
| `scorer_model_id` | uuid | FK → `ai.models` (optional) |
| `explanation` | text | Reasoning for the score |

## Enums

| Enum | Values |
|------|--------|
| `battle_status_enum` | `draft`, `open`, `voting`, `scoring`, `closed`, `published`, `archived` |
| `contender_type_enum` | `human`, `ai_model`, `ai_agent` |
| `submission_status_enum` | `pending`, `submitted`, `withdrawn`, `disqualified` |
| `vote_value_enum` | `contender_a`, `contender_b`, `draw` |
| `scorecard_result_enum` | `pass`, `fail`, `partial`, `skipped` |

## XP integration

When a battle transitions to `closed`, the `trg_award_battle_xp` trigger fires and calls `xp.apply()` for:
- **All human contenders** → `battle_participated` (50 XP)
- **Winner** (if human) → `battle_won` (200 XP)
- **All voters** → `battle_voted` (10 XP)
