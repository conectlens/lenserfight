-- Workflow bootstrap payload for reducing initial workflow builder round-trips.
-- Returns workflow detail + nodes + edges in one RPC call.

create or replace function public.fn_get_workflow_bootstrap(p_workflow_id uuid)
returns table (
  workflow jsonb,
  nodes jsonb,
  edges jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with wf as (
    select * from public.fn_get_workflow_detail(p_workflow_id)
  )
  select
    to_jsonb(wf.*) as workflow,
    coalesce(
      (select jsonb_agg(n) from public.fn_get_workflow_nodes(p_workflow_id) n),
      '[]'::jsonb
    ) as nodes,
    coalesce(
      (select jsonb_agg(e) from public.fn_get_workflow_edges(p_workflow_id) e),
      '[]'::jsonb
    ) as edges
  from wf;
end;
$$;

grant execute on function public.fn_get_workflow_bootstrap(uuid) to authenticated;
grant execute on function public.fn_get_workflow_bootstrap(uuid) to anon;
