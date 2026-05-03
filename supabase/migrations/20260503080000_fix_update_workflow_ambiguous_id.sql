-- Fix ambiguous column reference "id" in fn_update_workflow.
-- The RETURNS TABLE declares an output column named "id" which conflicts with
-- the table column "id" inside the WHERE clause of the UPDATE statement.
-- Qualifying WHERE with the table alias resolves the ambiguity.

create or replace function public.fn_update_workflow(
  p_workflow_id uuid,
  p_title       text,
  p_description text    default null,
  p_visibility  text    default 'public'
)
returns table (
  id            uuid,
  lenser_id     uuid,
  title         text,
  description   text,
  visibility    text,
  battle_count  integer,
  created_at    timestamptz,
  updated_at    timestamptz
)
language plpgsql
security definer
set search_path = lenses, lensers, public
as $$
declare
  v_lenser_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_lenser_id := lensers.get_auth_lenser_id();

  if v_lenser_id is null then
    raise exception 'Profile not found';
  end if;

  if char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 200 then
    raise exception 'Title must be between 1 and 200 characters';
  end if;

  if p_visibility not in ('public', 'private', 'unlisted') then
    raise exception 'Invalid visibility value';
  end if;

  return query
  update lenses.workflows w
  set
    title       = trim(p_title),
    description = p_description,
    visibility  = p_visibility,
    updated_at  = now()
  where w.id        = p_workflow_id
    and w.lenser_id = v_lenser_id
  returning
    w.id,
    w.lenser_id,
    w.title,
    w.description,
    w.visibility,
    w.battle_count,
    w.created_at,
    w.updated_at;

  if not found then
    raise exception 'Workflow not found or not owned by caller';
  end if;
end;
$$;

grant execute on function public.fn_update_workflow(uuid, text, text, text) to authenticated;
