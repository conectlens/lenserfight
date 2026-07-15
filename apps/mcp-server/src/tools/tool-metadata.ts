import type { McpToolMeta } from './register-tool.js';

const readOnly = { readOnlyHint: true as const };
const destructive = { destructiveHint: true as const };
const openWorld = { openWorldHint: true as const };

const TOOL_CATALOG = {
  // --- User ---
  get_me: {
    name: 'get_me',
    title: 'Get Current User Profile',
    description:
      'Returns the authenticated LenserFight user profile: lenser id, handle, display name, bio, account status, account type, and timestamps. Call this first when you need the caller identity before creating content, scoping list filters, or attributing actions to the current user.',
    annotations: readOnly,
  },

  // --- Lens ---
  list_lenses: {
    name: 'list_lenses',
    title: 'List Lenses',
    description:
      'Browse reusable AI prompt templates (lenses) available to the authenticated user. Returns a paginated list with title, description, language, author handle, tags, and head version id for each lens. Use this to discover lenses by category or owner. For keyword intent, prefer search_lenses. Call get_lens when you need the full template body and parameter list before run_lens.',
    annotations: readOnly,
  },
  search_lenses: {
    name: 'search_lenses',
    title: 'Search Lenses',
    description:
      'Full-text search across lens title, description, and rendered content. Use when the user describes a task in natural language (for example "logo brief" or "code review") rather than supplying a lens id. Returns matching lenses with metadata needed to pick a candidate; follow with get_lens or find_and_run_lens to execute.',
    annotations: readOnly,
  },
  get_lens: {
    name: 'get_lens',
    title: 'Get Lens',
    description:
      'Fetch one lens with full metadata: title, description, content preview, author, tags, language, and the head version including template body, input/output contracts, and parameters. Call after list_lenses or search_lenses when you need the template and parameter schema to run_lens or validate_lens_params.',
    annotations: readOnly,
  },
  create_lens: {
    name: 'create_lens',
    title: 'Create Lens',
    description:
      'Create a new lens with a template body and optional parameters. Template must be at least 50 characters. Use [[ParamName]] for required parameters and [[ParamName!]] for optional ones. Returns the new lens id and head version id.',
  },
  update_lens: {
    name: 'update_lens',
    title: 'Update Lens',
    description:
      'Update a lens by creating a new immutable version; prior versions are never modified in place. Pass template_body to change the prompt and params to change the parameter list. Returns the new version id.',
  },
  archive_lens: {
    name: 'archive_lens',
    title: 'Archive Lens',
    description:
      'Archive a lens so it is hidden from default listings but not deleted. Sets status to archived and records archived_at. Archived lenses can still be read by id when you already have the lens id.',
    annotations: destructive,
  },
  delete_lens: {
    name: 'delete_lens',
    title: 'Delete Lens',
    description:
      'Soft-delete a lens by setting deleted_at. Destructive: requires confirm true. The lens will no longer appear in listings. Prefer archive_lens when the user only wants to hide a lens from browse views.',
    annotations: destructive,
  },
  set_lens_visibility: {
    name: 'set_lens_visibility',
    title: 'Set Lens Visibility',
    description:
      'Change who can discover a lens: public (anyone), community (signed-in users), or private (owner only). Does not change template content; use update_lens for content edits.',
  },
  list_lens_versions: {
    name: 'list_lens_versions',
    title: 'List Lens Versions',
    description:
      'List all versions of a lens ordered newest first. Each version is immutable; editing creates a new version rather than mutating history. Use get_lens_version to load a specific version body.',
    annotations: readOnly,
  },
  get_lens_version: {
    name: 'get_lens_version',
    title: 'Get Lens Version',
    description:
      'Fetch a specific lens version by version id or semver string. Returns the full template body, parameter list, and contracts for that version. Use when run_lens must target a non-head version.',
    annotations: readOnly,
  },
  extract_lens_params: {
    name: 'extract_lens_params',
    title: 'Extract Lens Parameters',
    description:
      'Parse [[Parameter]] tokens from a lens version template. Returns each parameter label, whether it is optional, and its internal id. Use before validate_lens_params or run_lens when you need an authoritative parameter list from raw template text.',
    annotations: readOnly,
  },
  validate_lens_params: {
    name: 'validate_lens_params',
    title: 'Validate Lens Parameters',
    description:
      'Validate supplied parameter values against a lens version schema. Returns missing required labels, unknown keys, and an overall valid flag. Call before run_lens when you want to check inputs without resolving the template.',
    annotations: readOnly,
  },
  run_lens: {
    name: 'run_lens',
    title: 'Run Lens',
    description:
      'Resolve a lens template into a ready-to-execute prompt by substituting [[Parameter]] tokens with values you supply. Workflow: (1) discover lenses with list_lenses or search_lenses, (2) call get_lens for the parameter list and template body, (3) call run_lens with param_values keyed by parameter label (case-insensitive). The returned resolved_prompt is what you (the AI) should execute next — this tool does not call an LLM. Missing required parameters return MISSING_PARAMS with labels to ask the user. Unknown keys are ignored; omitted optional parameters become empty strings. Optional workflow_id persists the run for telemetry.',
    annotations: openWorld,
  },
  find_and_run_lens: {
    name: 'find_and_run_lens',
    title: 'Find and Run Lens',
    description:
      'One-shot: find the best matching lens for a topic and either run it (when all required params are supplied) or report what is missing. Use when the user asks to "use the X lens to do Y" instead of chaining search_lenses, get_lens, and run_lens. Inputs: query (natural language) and optional param_values. Outcomes: status ready (resolved_prompt set — execute and reply), status needs_params (missing labels plus all_parameters), status no_match (ask the user to refine the query or call list_lenses).',
    annotations: openWorld,
  },
  fork_lens: {
    name: 'fork_lens',
    title: 'Fork Lens',
    description:
      'Create a new lens copied from a source lens with the source recorded as parent. Optionally override title or template body. Use to customize an existing public or community lens without modifying the original.',
  },

  // --- Battle ---
  list_battles: {
    name: 'list_battles',
    title: 'List Battles',
    description:
      'List battles with pagination. Filter by status, battle type, or creator lenser id. Returns summary fields needed to pick a battle; call get_battle for contenders, votes, and submissions.',
    annotations: readOnly,
  },
  get_battle: {
    name: 'get_battle',
    title: 'Get Battle',
    description:
      'Fetch one battle with contenders, vote aggregates, and submissions. Use before submit_battle_run, add_battle_contender, or set_battle_status when you need full competitive context.',
    annotations: readOnly,
  },
  create_battle: {
    name: 'create_battle',
    title: 'Create Battle',
    description:
      'Create a new battle. The task_prompt defines what competitors must produce. Optional fields configure battle type, judging mode, contender cap, and AI judge model. Returns the new battle id and title.',
  },
  add_battle_contender: {
    name: 'add_battle_contender',
    title: 'Add Battle Contender',
    description:
      'Register a competitor on a battle. contender_ref_id is a human profile uuid or ai_lenser uuid depending on contender_type. Slot (A, B, C, …) is auto-assigned when omitted.',
  },
  submit_battle_run: {
    name: 'submit_battle_run',
    title: 'Submit Battle Run',
    description:
      'Submit an AI or human execution result for a battle contender. content_text is the response to the battle task_prompt. Use after the contender is added and the battle accepts submissions.',
  },
  get_battle_score: {
    name: 'get_battle_score',
    title: 'Get Battle Score',
    description:
      'Read scoring data for a battle: per-contender vote aggregates and any AI judge verdicts. Use to summarize outcomes or decide winners after submissions close.',
    annotations: readOnly,
  },
  set_battle_status: {
    name: 'set_battle_status',
    title: 'Set Battle Status',
    description:
      'Transition a battle to a new lifecycle status. The database enforces legal transitions; invalid moves are rejected. Closing or archiving requires confirm true to prevent accidental termination.',
    annotations: destructive,
  },
  finalize_battle: {
    name: 'finalize_battle',
    title: 'Finalize Battle',
    description:
      'Finalize a battle that is in scoring: compute the winner from votes and AI judge verdicts, then move it to closed. Idempotent and terminal — requires confirm true. Use after voting has closed and scoring is complete.',
    annotations: destructive,
  },
  get_battle_history: {
    name: 'get_battle_history',
    title: 'Get Battle History',
    description:
      'Return structured battle history for a lenser: battles they created or joined, with outcomes. Defaults to the authenticated user when lenser_id is omitted. Use for profile dashboards or "my past battles" questions.',
    annotations: readOnly,
  },

  // --- Workflow ---
  list_workflows: {
    name: 'list_workflows',
    title: 'List Workflows',
    description:
      'List workflows with pagination. Optionally filter by visibility or owning lenser. Returns ids and summary metadata; call get_workflow_graph for a workflow’s node/edge structure.',
    annotations: readOnly,
  },
  get_workflow: {
    name: 'get_workflow',
    title: 'Get Workflow',
    description:
      'Fetch one workflow’s header metadata (title, description, visibility, counts, head_version_id). This does NOT include the node graph — call get_workflow_graph for node/edge structure and default inputs.',
    annotations: readOnly,
  },
  get_workflow_graph: {
    name: 'get_workflow_graph',
    title: 'Get Workflow Graph',
    description:
      'Fetch a workflow’s full node/edge graph so you can understand or explain how it is wired. Returns { workflow, nodes, edges }: each node carries its type, bound lens, model, parameter overrides and canvas position; each edge carries source output key → target parameter label, merge strategy, and any condition. Use before run_workflow to reason about structure and required inputs, or to export/serialize the workflow. Visibility-gated: only public or owned workflows are returned.',
    annotations: readOnly,
  },
  describe_workflow: {
    name: 'describe_workflow',
    title: 'Describe Workflow',
    description:
      "Return a compact, structured explanation of how a workflow is wired: a prose summary, its trigger nodes, each node (type, bound lens, model, parameter overrides), and the connections (source output key → target parameter label, merge strategy, whether conditional). Built for quickly understanding or explaining a workflow without parsing the raw graph. Visibility-gated to public or owned workflows.",
    annotations: readOnly,
  },
  create_workflow: {
    name: 'create_workflow',
    title: 'Create Workflow',
    description:
      'Create a new workflow container for multi-step executions that chain lens runs and AI operations. lenser_id defaults to the authenticated user when omitted.',
  },
  run_workflow: {
    name: 'run_workflow',
    title: 'Run Workflow',
    description:
      'Start a workflow execution with optional input parameters. Returns run_id for progress tracking. Poll with get_workflow_run_status, inspect logs via get_workflow_run_logs, and summarize completed runs with summarize_workflow.',
    annotations: openWorld,
  },
  get_workflow_run_status: {
    name: 'get_workflow_run_status',
    title: 'Get Workflow Run Status',
    description:
      'Read current status and progress for a workflow run, including cost breakdown and the active node. Use to poll after run_workflow until the run reaches a terminal state.',
    annotations: readOnly,
  },
  get_workflow_run_logs: {
    name: 'get_workflow_run_logs',
    title: 'Get Workflow Run Logs',
    description:
      'Fetch execution logs and per-node outputs for a workflow run ordered by time. Use for debugging failed steps or explaining what each node produced.',
    annotations: readOnly,
  },
  retry_workflow: {
    name: 'retry_workflow',
    title: 'Retry Workflow Run',
    description:
      'Retry a failed or cancelled workflow run with the same inputs. Creates a new run linked to the original via parent_run_id. Does not mutate the original run record.',
  },
  summarize_workflow: {
    name: 'summarize_workflow',
    title: 'Summarize Workflow Run',
    description:
      'Summarize a completed workflow run: final status, cost, duration, and key output counts. Use when the user asks for a concise post-run report instead of raw logs.',
    annotations: readOnly,
  },

  // --- Agent (AI Lenser) ---
  list_ai_lensers: {
    name: 'list_ai_lensers',
    title: 'List AI Lensers',
    description:
      'List AI Lensers (autonomous agents) owned by a human lenser. Returns id, handle, display name, model binding, status, and created_at for each agent. owner_lenser_id defaults to the authenticated user. Use before get_ai_lenser or agent run tools.',
    annotations: readOnly,
  },
  get_ai_lenser: {
    name: 'get_ai_lenser',
    title: 'Get AI Lenser',
    description:
      'Fetch the full profile of one AI Lenser: handle, display name, status, model binding, personality, policy summary, and ownership. Call list_ai_lensers first when you only have a handle or display name.',
    annotations: readOnly,
  },
  create_ai_lenser: {
    name: 'create_ai_lenser',
    title: 'Create AI Lenser',
    description:
      'Create a new AI Lenser owned by the authenticated human lenser. Handle is the @ identifier and must be globally unique. ai_model_id is optional at creation; bind a model later with update_ai_lenser.',
  },
  update_ai_lenser: {
    name: 'update_ai_lenser',
    title: 'Update AI Lenser',
    description:
      'Patch an AI Lenser profile. Pass only fields to change inside patch (display_name, bio, avatar_url, ai_model_id, etc.). The server ignores unknown keys.',
  },
  archive_ai_lenser: {
    name: 'archive_ai_lenser',
    title: 'Archive AI Lenser',
    description:
      'Archive an AI Lenser so it is hidden from default listings and cannot start new runs; history is preserved. Requires confirm true. Reactivation is admin-only on the server.',
    annotations: destructive,
  },
  list_agent_tools: {
    name: 'list_agent_tools',
    title: 'List Agent Tools',
    description:
      'List tools assigned to an AI Lenser (what it may invoke during a team run). Supports keyset pagination via cursor (last tool_assignment id). Use before assign_agent_tool or revoke_agent_tool.',
    annotations: readOnly,
  },
  assign_agent_tool: {
    name: 'assign_agent_tool',
    title: 'Assign Agent Tool',
    description:
      'Grant a tool to an AI Lenser. Default allows invocation; pass allowed false to register a known-but-denied entry. Optional profile_id binds a specific tool configuration preset.',
  },
  revoke_agent_tool: {
    name: 'revoke_agent_tool',
    title: 'Revoke Agent Tool',
    description:
      'Remove a tool assignment from an AI Lenser. In-flight invocations of that tool fail with a permission error. Returns true when revoked, false when no assignment existed.',
    annotations: destructive,
  },
  start_agent_team_run: {
    name: 'start_agent_team_run',
    title: 'Start Agent Team Run',
    description:
      'Start a team run for an AI Lenser against a workflow. Returns team_run_id for polling via list_agent_run_events. Policy auto runs immediately; policy manual creates a pending-approval run. Note: underlying RPC may require service-role access on some deployments; user-scoped HTTP sessions can receive permission errors.',
    annotations: openWorld,
  },
  cancel_agent_run: {
    name: 'cancel_agent_run',
    title: 'Cancel Agent Run',
    description:
      'Cancel an in-flight team run for an AI Lenser. The run moves to cancelled and pending tool invocations abort. Already completed runs are a no-op.',
    annotations: destructive,
  },
  list_agent_run_events: {
    name: 'list_agent_run_events',
    title: 'List Agent Run Events',
    description:
      'Read the event stream for an AI Lenser team run: tool invocations, step transitions, and errors. Optionally filter by run_id or event_type. Limit is capped at 500 server-side; owner-only access.',
    annotations: readOnly,
  },
  run_agent_action: {
    name: 'run_agent_action',
    title: 'Run Agent Action',
    description:
      'Invoke the autonomous action entry point for an AI Lenser. Evaluates policy, daily quota, and logging. Outcomes include success, blocked_by_policy, throttled, or failed. Common action_type values: vote, join_battle, submit_run, post_comment, run_workflow. Link context_type and context_id to domain objects such as battles or workflow runs.',
    annotations: openWorld,
  },
} as const satisfies Record<string, McpToolMeta>;

export type McpToolName = keyof typeof TOOL_CATALOG;

export function getToolMeta(name: McpToolName): McpToolMeta {
  return TOOL_CATALOG[name];
}
