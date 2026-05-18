-- Phase CP: Workflow Storage & I/O Nodes
-- Creates tables for workflow-scoped KV store and webhook triggers.

-- ── Workflow KV Store ─────────────────────────────────────────────────────────
-- Ephemeral key-value state scoped to individual workflow runs.
-- Default TTL: 24 hours. Cleaned by pg_cron purge (see cron section).

create table if not exists public.workflow_kv_store (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references lenses.workflows(id) on delete cascade,
  run_id uuid,
  key text not null,
  value jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

comment on table public.workflow_kv_store is 'Ephemeral key-value state for workflow runs. Scoped by run_id. TTL enforced by pg_cron.';

create index if not exists idx_workflow_kv_store_lookup
  on public.workflow_kv_store (workflow_id, key);

create index if not exists idx_workflow_kv_store_expiry
  on public.workflow_kv_store (expires_at);

-- RLS: owner-only access (via workflow ownership)
alter table public.workflow_kv_store enable row level security;

create policy "workflow_kv_store_owner_select"
  on public.workflow_kv_store for select
  using (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

create policy "workflow_kv_store_owner_insert"
  on public.workflow_kv_store for insert
  with check (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

create policy "workflow_kv_store_owner_delete"
  on public.workflow_kv_store for delete
  using (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

-- ── Workflow Webhook Triggers ────────────────────────────────────────────────
-- Each workflow can have one or more inbound webhook URLs.

create table if not exists public.workflow_webhook_triggers (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references lenses.workflows(id) on delete cascade,
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.workflow_webhook_triggers is 'Inbound webhook endpoints that trigger workflow runs on POST.';

create unique index if not exists idx_workflow_webhook_triggers_secret
  on public.workflow_webhook_triggers (secret);

create index if not exists idx_workflow_webhook_triggers_workflow
  on public.workflow_webhook_triggers (workflow_id)
  where is_active = true;

-- RLS: owner-only
alter table public.workflow_webhook_triggers enable row level security;

create policy "workflow_webhook_triggers_owner_select"
  on public.workflow_webhook_triggers for select
  using (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

create policy "workflow_webhook_triggers_owner_insert"
  on public.workflow_webhook_triggers for insert
  with check (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

create policy "workflow_webhook_triggers_owner_delete"
  on public.workflow_webhook_triggers for delete
  using (
    workflow_id in (
      select id from lenses.workflows where lenser_id = (
        select id from lensers.profiles where user_id = auth.uid()
      )
    )
  );

-- ── Constraints ─────────────────────────────────────────────────────────────

alter table public.workflow_kv_store
  add constraint chk_kv_key_length check (length(key) <= 256),
  add constraint chk_kv_key_format check (key ~ '^[\w\-\.]+$');

alter table public.workflow_webhook_triggers
  add constraint chk_webhook_secret_length check (length(secret) >= 16 and length(secret) <= 512);
