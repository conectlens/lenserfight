-- Typed IO contracts for lens versions + workflow engine hardening columns.
--
-- Adds:
--   * lenses.versions.input_contract  JSONB NULL
--   * lenses.versions.output_contract JSONB NULL
--   * lenses.workflow_edges.merge_strategy TEXT NULL
--       (last_write_wins | concat | array | json_object)
--   * lenses.workflow_edges.condition JSONB NULL
--       (JSON-path style conditional skip; evaluated by the engine)
--   * lenses.workflow_runs.idempotency_key TEXT NULL + unique index
--   * public.fn_get_version_contracts(p_version_id uuid)
--
-- Backwards-compatible: every new column is NULL-able; nothing is required to
-- be populated. The engine falls back to pre-existing behaviour when the
-- contracts are NULL.

-- ── 1. Contracts on lens versions ─────────────────────────────────────────
alter table if exists "lenses"."versions"
  add column if not exists "input_contract" jsonb null,
  add column if not exists "output_contract" jsonb null;

do $$
begin
  -- Lightweight shape check: both contracts, when present, must be JSON objects
  -- and carry a string `kind` field. We deliberately do NOT enforce the full
  -- enum here (client-side validators cover the rest) so new `kind` values
  -- can be introduced without a schema migration.
  if not exists (
    select 1 from pg_constraint where conname = 'versions_input_contract_shape_check'
  ) then
    alter table "lenses"."versions"
      add constraint "versions_input_contract_shape_check"
      check (
        input_contract is null
        or (
          jsonb_typeof(input_contract) = 'object'
          and jsonb_typeof(input_contract -> 'kind') = 'string'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'versions_output_contract_shape_check'
  ) then
    alter table "lenses"."versions"
      add constraint "versions_output_contract_shape_check"
      check (
        output_contract is null
        or (
          jsonb_typeof(output_contract) = 'object'
          and jsonb_typeof(output_contract -> 'kind') = 'string'
          and jsonb_typeof(output_contract -> 'artifactKind') = 'string'
        )
      );
  end if;
end $$;

comment on column "lenses"."versions"."input_contract" is
  'Typed input contract (LensInputContract in libs/types). Optional; when set the workflow engine validates rendered node inputs against it.';
comment on column "lenses"."versions"."output_contract" is
  'Typed output contract (LensOutputContract in libs/types). Optional; when set the workflow engine validates the returned envelope against it.';

-- ── 2. Edge merge + conditional flow ──────────────────────────────────────
alter table if exists "lenses"."workflow_edges"
  add column if not exists "merge_strategy" text null,
  add column if not exists "condition" jsonb null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'workflow_edges_merge_strategy_check'
  ) then
    alter table "lenses"."workflow_edges"
      add constraint "workflow_edges_merge_strategy_check"
      check (
        merge_strategy is null
        or merge_strategy = any (array['last_write_wins','concat','array','json_object'])
      );
  end if;
end $$;

comment on column "lenses"."workflow_edges"."merge_strategy" is
  'Fan-in merge strategy applied when two or more edges target the same (target_node_id, target_param_label). NULL defers to target node config.merge; default is last_write_wins.';
comment on column "lenses"."workflow_edges"."condition" is
  'Optional JSONB condition evaluated by the workflow engine. Shape: { type: "jsonpath", expr, op, value }. When condition evaluates false the edge is skipped.';

-- ── 2b. Widen workflow_node_results.status to include 'skipped' ──────────
-- The engine emits `skipped` when a node's on_parent_failure=skip policy
-- fires because one of its parents did not complete successfully.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'workflow_node_results_status_check'
  ) then
    alter table "lenses"."workflow_node_results"
      drop constraint "workflow_node_results_status_check";
  end if;
  alter table "lenses"."workflow_node_results"
    add constraint "workflow_node_results_status_check"
    check (status = any (array['pending','running','completed','failed','cancelled','skipped']));
end $$;

-- ── 3. Run idempotency ────────────────────────────────────────────────────
alter table if exists "lenses"."workflow_runs"
  add column if not exists "idempotency_key" text null;

create unique index if not exists "workflow_runs_idempotency_unique"
  on "lenses"."workflow_runs" ("workflow_id", "idempotency_key")
  where "idempotency_key" is not null;

comment on column "lenses"."workflow_runs"."idempotency_key" is
  'Client-derived sha256(workflow_id || rootInputsCanonicalJson). Prevents double-trigger when the UI retries a submit.';

-- ── 3b. Overload fn_start_workflow_run with idempotency key ──────────────
-- Adds an additional overload; the existing 2-arg and 3-arg versions are
-- preserved so existing callers continue to compile.
create or replace function lenses.fn_start_workflow_run(
  p_workflow_id uuid,
  p_inputs jsonb default '{}'::jsonb,
  p_global_model_id text default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
set search_path to lenses, lensers, public
as $$
declare
  v_lenser_id uuid;
  v_run_id    uuid;
begin
  v_lenser_id := lensers.get_auth_lenser_id();

  if not exists (
    select 1 from lenses.workflows w
    where w.id = p_workflow_id
      and (w.visibility = 'public' or w.lenser_id = v_lenser_id)
  ) then
    raise exception 'workflow_not_found_or_forbidden';
  end if;

  if p_idempotency_key is not null then
    select id into v_run_id
    from lenses.workflow_runs
    where workflow_id = p_workflow_id
      and idempotency_key = p_idempotency_key
    limit 1;
    if v_run_id is not null then
      return v_run_id;
    end if;
  end if;

  insert into lenses.workflow_runs (workflow_id, triggered_by, status, context_inputs, global_model_id, idempotency_key)
  values (p_workflow_id, v_lenser_id, 'pending', p_inputs, p_global_model_id, p_idempotency_key)
  returning id into v_run_id;

  insert into lenses.workflow_node_results (run_id, node_id, status)
  select v_run_id, n.id, 'pending'
  from lenses.workflow_nodes n
  where n.workflow_id = p_workflow_id;

  return v_run_id;
end;
$$;

alter function lenses.fn_start_workflow_run(uuid, jsonb, text, text) owner to postgres;
comment on function lenses.fn_start_workflow_run(uuid, jsonb, text, text) is
  'Idempotent overload: when p_idempotency_key matches an existing run for the workflow, returns that run_id without creating a new row.';

create or replace function public.fn_start_workflow_run(
  p_workflow_id uuid,
  p_inputs jsonb default '{}'::jsonb,
  p_global_model_id text default null,
  p_idempotency_key text default null
) returns uuid
language plpgsql
security definer
set search_path to lenses, lensers, public
as $$
begin
  return lenses.fn_start_workflow_run(p_workflow_id, p_inputs, p_global_model_id, p_idempotency_key);
end;
$$;

alter function public.fn_start_workflow_run(uuid, jsonb, text, text) owner to postgres;
grant execute on function public.fn_start_workflow_run(uuid, jsonb, text, text) to authenticated;
grant execute on function public.fn_start_workflow_run(uuid, jsonb, text, text) to anon;
grant execute on function public.fn_start_workflow_run(uuid, jsonb, text, text) to service_role;

-- ── 4. Bootstrap RPC returning both contracts in one call ────────────────
create or replace function public.fn_get_version_contracts(p_version_id uuid)
returns table (
  version_id uuid,
  input_contract jsonb,
  output_contract jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.id, v.input_contract, v.output_contract
  from lenses.versions v
  where v.id = p_version_id
$$;

grant execute on function public.fn_get_version_contracts(uuid) to authenticated;
grant execute on function public.fn_get_version_contracts(uuid) to anon;

comment on function public.fn_get_version_contracts(uuid) is
  'Returns the input_contract + output_contract JSONB for a lens version in a single round-trip. Consumed by the workflow execution engine.';
