// deno-lint-ignore-file no-explicit-any
// @ts-nocheck — Deno Edge Function; type safety provided by Deno's npm: import resolver

import { McpServer } from "npm:@modelcontextprotocol/sdk@1.15.0/server/mcp.js";
import { StreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.15.0/server/streamableHttp.js";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function getClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function lenses(sb: any) { return sb.schema("lenses"); }
function battles(sb: any) { return sb.schema("battles"); }
function lensers(sb: any) { return sb.schema("lensers"); }

// ─── Response helpers ─────────────────────────────────────────────────────────

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, data }) }] };
}
function fail(code: string, msg: string, details?: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: { code, message: msg, details } }) }] };
}
function paginated(items: unknown[], total: number, limit: number, offset: number) {
  return ok({ items, total, limit, offset, has_more: offset + items.length < total });
}

// ─── Token resolver (lens_run) ────────────────────────────────────────────────

function resolveTemplate(body: string, params: any[], values: Record<string, string>) {
  let resolved = body;
  const missing: string[] = [];
  const used: string[] = [];
  for (const param of params) {
    const token = `[[:${param.id}]]`;
    const value =
      values[param.label] ??
      values[param.label.toLowerCase()] ??
      Object.entries(values).find(([k]) => k.toLowerCase() === param.label.toLowerCase())?.[1];
    if (value !== undefined) { resolved = resolved.split(token).join(value); used.push(param.label); }
    else if (!param.optional) { missing.push(param.label); }
    else { resolved = resolved.split(token).join(""); }
  }
  return { resolved, missing, used };
}

// ─── Tool Registration ────────────────────────────────────────────────────────

function registerTools(server: McpServer) {

  // ── Lens tools ──────────────────────────────────────────────────────────────

  server.tool("lens_list", "List lenses with pagination. Filter by visibility, status, or lenser_id.", {
    limit: z.number().int().min(1).max(100).default(20).optional(),
    offset: z.number().int().min(0).default(0).optional(),
    visibility: z.enum(["public","community","private"]).optional(),
    status: z.enum(["draft","published","archived"]).optional(),
    lenser_id: z.string().uuid().optional(),
    include_archived: z.boolean().default(false).optional(),
  }, async (args: any) => {
    const limit = args.limit ?? 20, offset = args.offset ?? 0;
    try {
      const sb = getClient();
      let q = lenses(sb).from("lenses").select("id,lenser_id,visibility,status,is_featured,created_at,updated_at,head_version_id", { count: "exact" }).range(offset, offset + limit - 1).order("created_at", { ascending: false });
      if (!args.include_archived) q = q.not("status", "eq", "archived");
      if (args.visibility) q = q.eq("visibility", args.visibility);
      if (args.status) q = q.eq("status", args.status);
      if (args.lenser_id) q = q.eq("lenser_id", args.lenser_id);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return paginated(data ?? [], count ?? 0, limit, offset);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_search", "Full-text search lenses by query string, with optional tag and visibility filters.", {
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(10).optional(),
    offset: z.number().int().min(0).default(0).optional(),
    visibility: z.enum(["public","community"]).optional(),
  }, async (args: any) => {
    const limit = args.limit ?? 10, offset = args.offset ?? 0;
    try {
      const sb = getClient();
      let q = lenses(sb).from("lenses").select("id,lenser_id,visibility,status,created_at,head_version_id", { count: "exact" }).ilike("title", `%${args.query}%`).is("deleted_at", null).range(offset, offset + limit - 1);
      if (args.visibility) q = q.eq("visibility", args.visibility);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return paginated(data ?? [], count ?? 0, limit, offset);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_get", "Get a lens with its head version body and parameter list.", {
    lens_id: z.string().uuid(),
  }, async ({ lens_id }: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("lenses").select("*,versions!head_version_id(id,semver,template_body,version_parameters(id,label,optional))").eq("id", lens_id).is("deleted_at", null).single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", `Lens ${lens_id} not found`); throw new Error(error.message); }
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_create", "Create a new lens. Use [[Param]] for required params, [[Param!]] for optional.", {
    title: z.string().min(1).max(200),
    template_body: z.string().min(50),
    visibility: z.enum(["public","community","private"]).default("public").optional(),
    params: z.array(z.object({ label: z.string().min(1), optional: z.boolean().default(false).optional() })).default([]).optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data, error } = await sb.rpc("fn_create_lens", { p_title: args.title, p_template_body: args.template_body, p_visibility: args.visibility ?? "public", p_params: JSON.stringify((args.params ?? []).map((p: any) => ({ label: p.label, optional: p.optional ?? false }))) });
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_update", "Create a new immutable version of a lens with an updated template. Returns the new version.", {
    lens_id: z.string().uuid(),
    template_body: z.string().min(50),
    params: z.array(z.object({ label: z.string().min(1), optional: z.boolean().default(false).optional() })).default([]).optional(),
    changelog: z.string().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data, error } = await sb.rpc("fn_update_lens", { p_lens_id: args.lens_id, p_template_body: args.template_body, p_params: JSON.stringify((args.params ?? []).map((p: any) => ({ label: p.label, optional: p.optional ?? false }))), p_changelog: args.changelog ?? null });
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_archive", "Archive a lens. Archived lenses are hidden from default listings.", {
    lens_id: z.string().uuid(),
  }, async ({ lens_id }: any) => {
    try {
      const sb = getClient();
      const { error } = await lenses(sb).from("lenses").update({ status: "archived", archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", lens_id).is("deleted_at", null);
      if (error) throw new Error(error.message);
      return ok({ lens_id, status: "archived" });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_delete", "Soft-delete a lens. Requires explicit confirmation.", {
    lens_id: z.string().uuid(),
    confirm: z.literal(true),
  }, async ({ lens_id }: any) => {
    try {
      const sb = getClient();
      const { error } = await lenses(sb).from("lenses").update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", lens_id).is("deleted_at", null);
      if (error) throw new Error(error.message);
      return ok({ lens_id, deleted: true });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_set_visibility", "Change the visibility of a lens.", {
    lens_id: z.string().uuid(),
    visibility: z.enum(["public","community","private"]),
  }, async ({ lens_id, visibility }: any) => {
    try {
      const sb = getClient();
      const { error } = await lenses(sb).from("lenses").update({ visibility, updated_at: new Date().toISOString() }).eq("id", lens_id).is("deleted_at", null);
      if (error) throw new Error(error.message);
      return ok({ lens_id, visibility });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_validate_params", "Validate a set of parameter values against a lens version's schema. Returns missing required params and unknown keys.", {
    lens_id: z.string().uuid(),
    version_id: z.string().uuid().optional(),
    param_values: z.record(z.string()),
  }, async (args: any) => {
    try {
      const sb = getClient();
      let versionId = args.version_id;
      if (!versionId) {
        const { data: lens } = await lenses(sb).from("lenses").select("head_version_id").eq("id", args.lens_id).is("deleted_at", null).single();
        if (!lens) return fail("NOT_FOUND", `Lens ${args.lens_id} not found`);
        versionId = lens.head_version_id;
      }
      const { data: params } = await lenses(sb).from("version_parameters").select("id,label,optional").eq("version_id", versionId);
      const paramList = params ?? [];
      const paramLabels = paramList.map((p: any) => p.label.toLowerCase());
      const missing = paramList.filter((p: any) => !p.optional && !Object.keys(args.param_values).find((k) => k.toLowerCase() === p.label.toLowerCase())).map((p: any) => p.label);
      const unknown = Object.keys(args.param_values).filter((k) => !paramLabels.includes(k.toLowerCase()));
      return ok({ valid: missing.length === 0, missing, unknown, version_id: versionId });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_extract_params", "Extract [[Parameter]] tokens from a lens template and return the parameter schema.", {
    lens_id: z.string().uuid(),
    version_id: z.string().uuid().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      let versionId = args.version_id;
      if (!versionId) {
        const { data: lens } = await lenses(sb).from("lenses").select("head_version_id").eq("id", args.lens_id).is("deleted_at", null).single();
        if (!lens) return fail("NOT_FOUND", `Lens ${args.lens_id} not found`);
        versionId = lens.head_version_id;
      }
      const { data: version } = await lenses(sb).from("versions").select("template_body").eq("id", versionId).single();
      const { data: params } = await lenses(sb).from("version_parameters").select("id,label,optional").eq("version_id", versionId);
      const tokens = Array.from((version?.template_body ?? "").matchAll(/\[\[([^\]]+)\]\]/g)).map((m: any) => m[1]);
      return ok({ version_id: versionId, params: params ?? [], tokens_in_template: tokens });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_run", "Resolve a lens template by substituting [[Param]] tokens with values. Returns the ready-to-use prompt. Does NOT call an LLM. Optionally creates a workflow_run record.", {
    lens_id: z.string().uuid(),
    version_id: z.string().uuid().optional(),
    param_values: z.record(z.string()).default({}).optional(),
    workflow_id: z.string().uuid().optional(),
  }, async (args: any) => {
    const values = args.param_values ?? {};
    try {
      const sb = getClient();
      let versionId = args.version_id;
      if (!versionId) {
        const { data: lens, error } = await lenses(sb).from("lenses").select("head_version_id").eq("id", args.lens_id).is("deleted_at", null).single();
        if (error || !lens) return fail("NOT_FOUND", `Lens ${args.lens_id} not found`);
        versionId = lens.head_version_id;
      }
      const { data: version } = await lenses(sb).from("versions").select("template_body").eq("id", versionId).single();
      if (!version) return fail("NOT_FOUND", `Version ${versionId} not found`);
      const { data: paramRows } = await lenses(sb).from("version_parameters").select("id,label,optional").eq("version_id", versionId);
      const { resolved, missing, used } = resolveTemplate(version.template_body, paramRows ?? [], values);
      if (missing.length > 0) return fail("MISSING_PARAMS", "Required parameters not provided.", { missing });
      let runId: string | null = null;
      let persisted = false;
      if (args.workflow_id) {
        const { data: run } = await lenses(sb).from("workflow_runs").insert({ workflow_id: args.workflow_id, status: "pending", trigger_mode: "manual", context_inputs: values, metadata: { mcp_tool: "lens_run", lens_id: args.lens_id, version_id: versionId } }).select("id").single();
        if (run) { runId = run.id; persisted = true; }
      }
      return ok({ resolved_prompt: resolved, run_id: runId, lens_id: args.lens_id, version_id: versionId, params_used: used, estimated_input_tokens: Math.ceil(resolved.length / 4), persisted });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_fork", "Fork an existing lens into a new one. Copies the template and parameter schema.", {
    source_lens_id: z.string().uuid(),
    title: z.string().min(1).max(200),
    visibility: z.enum(["public","community","private"]).default("private").optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data: source, error: srcErr } = await lenses(sb).from("lenses").select("*,versions!head_version_id(template_body,version_parameters(label,optional))").eq("id", args.source_lens_id).is("deleted_at", null).single();
      if (srcErr || !source) return fail("NOT_FOUND", `Source lens ${args.source_lens_id} not found`);
      const headVersion = (source as any).versions;
      const { data, error } = await sb.rpc("fn_create_lens", { p_title: args.title, p_template_body: headVersion?.template_body ?? "", p_visibility: args.visibility ?? "private", p_params: JSON.stringify((headVersion?.version_parameters ?? []).map((p: any) => ({ label: p.label, optional: p.optional ?? false }))), p_parent_lens_id: args.source_lens_id });
      if (error) throw new Error(error.message);
      return ok({ ...data, forked_from: args.source_lens_id });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_versions", "List all versions of a lens ordered by creation date, newest first.", {
    lens_id: z.string().uuid(),
  }, async ({ lens_id }: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("versions").select("id,semver,created_at,changelog").eq("lens_id", lens_id).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return ok(data ?? []);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("lens_get_version", "Get a specific lens version by version ID or semver string.", {
    lens_id: z.string().uuid(),
    version_id: z.string().uuid().optional(),
    semver: z.string().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      let q = lenses(sb).from("versions").select("id,semver,template_body,changelog,created_at,version_parameters(id,label,optional)").eq("lens_id", args.lens_id);
      if (args.version_id) q = q.eq("id", args.version_id);
      else if (args.semver) q = q.eq("semver", args.semver);
      else return fail("VALIDATION_ERROR", "Provide version_id or semver");
      const { data, error } = await q.single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", "Version not found"); throw new Error(error.message); }
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  // ── Battle tools ────────────────────────────────────────────────────────────

  server.tool("battle_list", "List battles with pagination. Filter by status, battle_type, or creator.", {
    limit: z.number().int().min(1).max(100).default(20).optional(),
    offset: z.number().int().min(0).default(0).optional(),
    status: z.enum(["draft","open","executing","voting","scoring","closed","published","archived"]).optional(),
    battle_type: z.enum(["ai_vs_ai","human_vs_human_ai_votes","human_vs_human_open_votes","human_vs_ai","workflow_battle","lenser_battle"]).optional(),
    creator_lenser_id: z.string().uuid().optional(),
  }, async (args: any) => {
    const limit = args.limit ?? 20, offset = args.offset ?? 0;
    try {
      const sb = getClient();
      let q = battles(sb).from("battles").select("id,title,slug,status,battle_type,judging_mode,created_at,updated_at,creator_lenser_id,total_vote_count", { count: "exact" }).is("deleted_at", null).range(offset, offset + limit - 1).order("created_at", { ascending: false });
      if (args.status) q = q.eq("status", args.status);
      if (args.battle_type) q = q.eq("battle_type", args.battle_type);
      if (args.creator_lenser_id) q = q.eq("creator_lenser_id", args.creator_lenser_id);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return paginated(data ?? [], count ?? 0, limit, offset);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_get", "Get a battle with contenders, vote aggregates, and submission summary.", {
    battle_id: z.string().uuid(),
  }, async ({ battle_id }: any) => {
    try {
      const sb = getClient();
      const { data, error } = await battles(sb).from("battles").select("*,contenders(id,slot_label,contender_type,display_name,status,total_votes,contender_entity_map(entity_type,entity_id)),vote_aggregates(contender_id,vote_count,vote_score)").eq("id", battle_id).is("deleted_at", null).single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", `Battle ${battle_id} not found`); throw new Error(error.message); }
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_create", "Create a new battle. The task_prompt defines what competitors must accomplish.", {
    title: z.string().min(1).max(200),
    task_prompt: z.string().min(1).max(32000),
    battle_type: z.enum(["ai_vs_ai","human_vs_human_ai_votes","human_vs_human_open_votes","human_vs_ai","workflow_battle","lenser_battle"]).default("ai_vs_ai").optional(),
    judging_mode: z.enum(["community_vote","ai_judge","rubric_score","auto_score"]).default("ai_judge").optional(),
    max_contenders: z.number().int().min(2).max(26).default(2).optional(),
    ai_judge_model_key: z.string().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);
      const { data, error } = await sb.rpc("fn_battles_create", { p_title: args.title, p_slug: slug, p_task_prompt: args.task_prompt, p_rubric_id: null });
      if (error) throw new Error(error.message);
      const updates: any = {};
      if (args.battle_type) updates.battle_type = args.battle_type;
      if (args.judging_mode) updates.judging_mode = args.judging_mode;
      if (args.max_contenders) updates.max_contenders = args.max_contenders;
      if (args.ai_judge_model_key) { updates.ai_judge_model_key = args.ai_judge_model_key; updates.ai_judge_enabled = true; }
      if (Object.keys(updates).length > 0) await battles(sb).from("battles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", data.id);
      return ok({ id: data.id, title: args.title });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_add_contender", "Add a contender (AI model, lenser, or workflow) to a battle.", {
    battle_id: z.string().uuid(),
    contender_type: z.enum(["ai_model","lenser","workflow"]),
    display_name: z.string().min(1).max(100),
    entity_id: z.string().uuid().optional(),
    entity_type: z.string().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data: contenders } = await battles(sb).from("contenders").select("slot_label").eq("battle_id", args.battle_id).order("slot_label");
      const nextSlot = String.fromCharCode(65 + (contenders ?? []).length);
      const { data: contender, error } = await battles(sb).from("contenders").insert({ battle_id: args.battle_id, slot_label: nextSlot, contender_type: args.contender_type, display_name: args.display_name, status: "pending" }).select("id,slot_label").single();
      if (error) throw new Error(error.message);
      if (args.entity_id && args.entity_type) {
        await battles(sb).from("contender_entity_map").insert({ contender_id: contender.id, entity_type: args.entity_type, entity_id: args.entity_id });
      }
      return ok({ contender_id: contender.id, slot_label: contender.slot_label, battle_id: args.battle_id });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_submit_run", "Submit a contender's run result for scoring.", {
    battle_id: z.string().uuid(),
    contender_id: z.string().uuid(),
    output: z.string().min(1),
    model_key: z.string().optional(),
    tokens_used: z.number().int().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data, error } = await sb.rpc("fn_battles_submit", { p_battle_id: args.battle_id, p_contender_id: args.contender_id, p_output: args.output, p_model_key: args.model_key ?? null, p_tokens_used: args.tokens_used ?? null });
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_score", "Get vote aggregates and AI judge verdicts for a battle.", {
    battle_id: z.string().uuid(),
  }, async ({ battle_id }: any) => {
    try {
      const sb = getClient();
      const [{ data: votes }, { data: verdicts }] = await Promise.all([
        battles(sb).from("vote_aggregates").select("contender_id,vote_count,vote_score").eq("battle_id", battle_id),
        battles(sb).from("ai_judge_verdicts").select("contender_id,verdict,score,reasoning,created_at").eq("battle_id", battle_id),
      ]);
      return ok({ battle_id, vote_aggregates: votes ?? [], ai_judge_verdicts: verdicts ?? [] });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_set_status", "Change the status of a battle. Closing or archiving requires confirmation.", {
    battle_id: z.string().uuid(),
    status: z.enum(["draft","open","executing","voting","scoring","closed","published","archived"]),
    confirm: z.boolean().optional(),
  }, async (args: any) => {
    if (["closed","archived"].includes(args.status) && !args.confirm) {
      return fail("CONFIRM_REQUIRED", `Setting status to '${args.status}' is irreversible. Pass confirm: true to proceed.`);
    }
    try {
      const sb = getClient();
      const { error } = await battles(sb).from("battles").update({ status: args.status, updated_at: new Date().toISOString() }).eq("id", args.battle_id).is("deleted_at", null);
      if (error) {
        if (error.message.includes("INVALID_TRANSITION")) return fail("INVALID_TRANSITION", error.message);
        throw new Error(error.message);
      }
      return ok({ battle_id: args.battle_id, status: args.status });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("battle_history", "Get the battle history for a lenser: battles they created or participated in as a contender.", {
    lenser_id: z.string().uuid(),
    limit: z.number().int().min(1).max(100).default(20).optional(),
    offset: z.number().int().min(0).default(0).optional(),
  }, async (args: any) => {
    const limit = args.limit ?? 20, offset = args.offset ?? 0;
    try {
      const sb = getClient();
      const { data, error, count } = await battles(sb).from("battles").select("id,title,slug,status,battle_type,created_at,creator_lenser_id", { count: "exact" }).eq("creator_lenser_id", args.lenser_id).is("deleted_at", null).range(offset, offset + limit - 1).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return paginated(data ?? [], count ?? 0, limit, offset);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  // ── Workflow tools ──────────────────────────────────────────────────────────

  server.tool("workflow_list", "List workflows with pagination.", {
    limit: z.number().int().min(1).max(100).default(20).optional(),
    offset: z.number().int().min(0).default(0).optional(),
    lenser_id: z.string().uuid().optional(),
  }, async (args: any) => {
    const limit = args.limit ?? 20, offset = args.offset ?? 0;
    try {
      const sb = getClient();
      let q = lenses(sb).from("workflows").select("id,name,description,status,lenser_id,created_at,updated_at", { count: "exact" }).range(offset, offset + limit - 1).order("created_at", { ascending: false });
      if (args.lenser_id) q = q.eq("lenser_id", args.lenser_id);
      const { data, error, count } = await q;
      if (error) throw new Error(error.message);
      return paginated(data ?? [], count ?? 0, limit, offset);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_get", "Get a workflow with its current version details.", {
    workflow_id: z.string().uuid(),
  }, async ({ workflow_id }: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("workflows").select("*").eq("id", workflow_id).single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", `Workflow ${workflow_id} not found`); throw new Error(error.message); }
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_create", "Create a new workflow.", {
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    lenser_id: z.string().uuid(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("workflows").insert({ name: args.name, description: args.description ?? null, lenser_id: args.lenser_id, status: "active" }).select("id,name,status,created_at").single();
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_run", "Start a workflow run with optional context inputs. Returns the run_id for status polling.", {
    workflow_id: z.string().uuid(),
    context_inputs: z.record(z.string()).default({}).optional(),
    global_model_id: z.string().uuid().optional(),
  }, async (args: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("workflow_runs").insert({ workflow_id: args.workflow_id, status: "pending", trigger_mode: "manual", context_inputs: args.context_inputs ?? {}, global_model_id: args.global_model_id ?? null, metadata: { mcp_tool: "workflow_run" } }).select("id,status,created_at").single();
      if (error) throw new Error(error.message);
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_run_status", "Get the current status, progress, and cost metadata of a workflow run.", {
    run_id: z.string().uuid(),
  }, async ({ run_id }: any) => {
    try {
      const sb = getClient();
      const { data, error } = await lenses(sb).from("workflow_runs").select("id,workflow_id,status,started_at,completed_at,spent_credits,budget_credits,cost_metadata,metadata").eq("id", run_id).single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", `Run ${run_id} not found`); throw new Error(error.message); }
      return ok(data);
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_run_logs", "Get node-level execution logs for a workflow run, ordered by time.", {
    run_id: z.string().uuid(),
  }, async ({ run_id }: any) => {
    try {
      const sb = getClient();
      const [{ data: nodeResults, error }, { data: run }] = await Promise.all([
        lenses(sb).from("workflow_node_results").select("id,node_id,status,output,error_message,started_at,completed_at,tokens_used,cost_credits").eq("run_id", run_id).order("started_at", { ascending: true }),
        lenses(sb).from("workflow_runs").select("id,status,metadata,cost_metadata,started_at,completed_at").eq("id", run_id).single(),
      ]);
      if (error && error.code !== "42P01") throw new Error(error.message);
      return ok({ run, node_results: nodeResults ?? [] });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_retry", "Retry a failed or cancelled workflow run with the same inputs. Links to original via parent_run_id.", {
    run_id: z.string().uuid(),
  }, async ({ run_id }: any) => {
    try {
      const sb = getClient();
      const { data: original, error: fetchErr } = await lenses(sb).from("workflow_runs").select("id,workflow_id,context_inputs,global_model_id,status").eq("id", run_id).single();
      if (fetchErr) { if (fetchErr.code === "PGRST116") return fail("NOT_FOUND", `Run ${run_id} not found`); throw new Error(fetchErr.message); }
      if (!original) return fail("NOT_FOUND", `Run ${run_id} not found`);
      const { data: newRun, error: insertErr } = await lenses(sb).from("workflow_runs").insert({ workflow_id: original.workflow_id, status: "pending", trigger_mode: "manual", context_inputs: original.context_inputs, global_model_id: original.global_model_id, parent_run_id: run_id, metadata: { mcp_tool: "workflow_retry", retried_from: run_id } }).select("id,status,created_at").single();
      if (insertErr) throw new Error(insertErr.message);
      return ok({ new_run: newRun, original_run_id: run_id });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });

  server.tool("workflow_summarize", "Summarize a completed workflow run: status, cost, duration, and node result counts.", {
    run_id: z.string().uuid(),
  }, async ({ run_id }: any) => {
    try {
      const sb = getClient();
      const { data: run, error } = await lenses(sb).from("workflow_runs").select("id,workflow_id,status,started_at,completed_at,spent_credits,budget_credits,cost_metadata").eq("id", run_id).single();
      if (error) { if (error.code === "PGRST116") return fail("NOT_FOUND", `Run ${run_id} not found`); throw new Error(error.message); }
      if (!run) return fail("NOT_FOUND", `Run ${run_id} not found`);
      const startedAt = run.started_at ? new Date(run.started_at).getTime() : null;
      const completedAt = run.completed_at ? new Date(run.completed_at).getTime() : null;
      const { data: nodeResults } = await lenses(sb).from("workflow_node_results").select("status").eq("run_id", run_id);
      const nodes = nodeResults ?? [];
      return ok({ run_id, workflow_id: run.workflow_id, status: run.status, duration_ms: startedAt && completedAt ? completedAt - startedAt : null, spent_credits: run.spent_credits, budget_credits: run.budget_credits, cost_metadata: run.cost_metadata, nodes: { total: nodes.length, completed: nodes.filter((n: any) => n.status === "completed").length, failed: nodes.filter((n: any) => n.status === "failed").length, skipped: nodes.filter((n: any) => n.status === "skipped").length } });
    } catch (e) { return fail("DB_ERROR", (e as Error).message); }
  });
}

// ─── OAuth Discovery ──────────────────────────────────────────────────────────

const discoveryDoc = {
  issuer: `${SUPABASE_URL}/auth/v1`,
  authorization_endpoint: `${SUPABASE_URL}/auth/v1/authorize`,
  token_endpoint: `${SUPABASE_URL}/auth/v1/token`,
  userinfo_endpoint: `${SUPABASE_URL}/auth/v1/user`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  code_challenge_methods_supported: ["S256"],
  scopes_supported: ["openid", "email", "profile"],
  token_endpoint_auth_methods_supported: ["none"],
};

// ─── Node.js HTTP shims for StreamableHTTPServerTransport ────────────────────
// Deno edge functions expose Fetch API (Request/Response). The MCP SDK's
// StreamableHTTPServerTransport expects Node.js IncomingMessage/ServerResponse.
// These minimal shims provide the interface the SDK needs.

function makeShims(req: Request, bodyText: string): [any, any, Promise<Response>] {
  const nodeReq = {
    method: req.method.toUpperCase(),
    url: new URL(req.url).pathname,
    headers: Object.fromEntries(req.headers.entries()),
    on: () => nodeReq,
    once: () => nodeReq,
    removeListener: () => nodeReq,
  };

  const resHeaders: Record<string, string> = {};
  const chunks: string[] = [];
  let status = 200;
  let ended = false;
  let resolve!: (r: Response) => void;
  const responsePromise = new Promise<Response>((r) => { resolve = r; });

  const nodeRes = {
    statusCode: 200,
    writableEnded: false,
    setHeader(name: string, value: string) { resHeaders[name] = value; },
    getHeader(name: string) { return resHeaders[name]; },
    writeHead(code: number, hdrs?: Record<string, string>) {
      status = code;
      if (hdrs) Object.assign(resHeaders, hdrs);
    },
    write(chunk: string | Uint8Array) {
      if (!ended) chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    },
    end(chunk?: string | Uint8Array) {
      if (chunk) chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      ended = true;
      nodeRes.writableEnded = true;
      resolve(new Response(chunks.join("") || null, { status, headers: resHeaders }));
    },
    on: () => nodeRes,
    once: () => nodeRes,
    removeListener: () => nodeRes,
    flushHeaders: () => {},
  };

  return [nodeReq, nodeRes, responsePromise];
}

// ─── Server initialization ────────────────────────────────────────────────────
// Lazy-initialized on the first request, shared across warm invocations.

type SessionEntry = { transport: StreamableHTTPServerTransport };
const sessions = new Map<string, SessionEntry>();
let globalServer: McpServer | null = null;

async function getOrCreateSession(sessionId: string | null): Promise<{ server: McpServer; transport: StreamableHTTPServerTransport; sessionId: string }> {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    return { server: globalServer!, transport: session.transport, sessionId };
  }

  const newSessionId = sessionId ?? crypto.randomUUID();

  if (!globalServer) {
    globalServer = new McpServer({ name: "lenserfight", version: "1.0.0" });
    registerTools(globalServer);
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });
  await globalServer.connect(transport);

  sessions.set(newSessionId, { transport });
  transport.onclose = () => sessions.delete(newSessionId);

  return { server: globalServer, transport, sessionId: newSessionId };
}

// ─── JWT Validation ───────────────────────────────────────────────────────────

async function validateJwt(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  try {
    const sb = getClient();
    const { data, error } = await sb.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, mcp-session-id",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  // Health check
  if (url.pathname.endsWith("/health")) {
    return Response.json({ status: "ok", server: "lenserfight-mcp", version: "1.0.0" }, { headers: CORS_HEADERS });
  }

  // OAuth 2.1 discovery
  if (url.pathname.endsWith("/.well-known/oauth-authorization-server")) {
    return Response.json(discoveryDoc, { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=3600" } });
  }

  // All /mcp routes require a valid Bearer JWT
  if (!await validateJwt(req.headers.get("authorization"))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Get or create MCP session
  const incomingSessionId = req.headers.get("mcp-session-id");
  const { transport, sessionId } = await getOrCreateSession(incomingSessionId);

  // Parse the request body for POST
  const bodyText = req.method === "POST" ? await req.text() : "";
  const parsedBody = bodyText ? JSON.parse(bodyText) : undefined;

  const [nodeReq, nodeRes, responsePromise] = makeShims(req, bodyText);

  await transport.handleRequest(nodeReq, nodeRes, parsedBody);

  const response = await responsePromise;

  // Attach CORS and session headers
  const finalHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) finalHeaders.set(k, v);
  finalHeaders.set("mcp-session-id", sessionId);

  return new Response(response.body, { status: response.status, headers: finalHeaders });
});
