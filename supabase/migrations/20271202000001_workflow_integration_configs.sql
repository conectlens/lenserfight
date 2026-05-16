-- Phase CQ: Workflow Integration Credentials Vault
-- Encrypted credential storage for third-party integrations (OAuth tokens, API keys).

create table if not exists public.workflow_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  lenser_id uuid not null references lensers.profiles(id) on delete cascade,
  integration_type text not null,
  label text,
  encrypted_config bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workflow_integration_credentials is
  'AES-GCM encrypted credentials for third-party integrations. Decrypt only via SECURITY DEFINER fn.';

create index if not exists idx_wic_lenser_type
  on public.workflow_integration_credentials (lenser_id, integration_type);

-- RLS: owner-only
alter table public.workflow_integration_credentials enable row level security;

create policy "wic_owner_select"
  on public.workflow_integration_credentials for select
  using (lenser_id = (select id from lensers.profiles where user_id = auth.uid()));

create policy "wic_owner_insert"
  on public.workflow_integration_credentials for insert
  with check (lenser_id = (select id from lensers.profiles where user_id = auth.uid()));

create policy "wic_owner_update"
  on public.workflow_integration_credentials for update
  using (lenser_id = (select id from lensers.profiles where user_id = auth.uid()));

create policy "wic_owner_delete"
  on public.workflow_integration_credentials for delete
  using (lenser_id = (select id from lensers.profiles where user_id = auth.uid()));

-- ── Constraints ─────────────────────────────────────────────────────────────

alter table public.workflow_integration_credentials
  add constraint chk_wic_type_valid check (
    integration_type in ('email', 'slack', 'discord', 'github', 'notion', 'google_sheets')
  ),
  add constraint chk_wic_label_length check (label is null or length(label) <= 100);

-- ── SECURITY DEFINER decrypt function ────────────────────────────────────────
-- Only this function can decrypt credentials. Frontend never sees raw keys.
-- The actual AES-GCM decryption uses pgcrypto + a server-side encryption key
-- stored in vault.secrets (Supabase Vault).

create or replace function public.fn_decrypt_integration_credential(
  p_credential_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lenser_id uuid;
  v_encrypted bytea;
  v_key bytea;
  v_decrypted text;
begin
  -- Verify ownership
  select lenser_id, encrypted_config
  into v_lenser_id, v_encrypted
  from public.workflow_integration_credentials
  where id = p_credential_id;

  if v_lenser_id is null then
    raise exception 'Credential not found';
  end if;

  if v_lenser_id != (select id from lensers.profiles where user_id = auth.uid()) then
    raise exception 'Access denied';
  end if;

  -- Decrypt using the platform encryption key from vault
  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'workflow_integration_encryption_key'
  limit 1;

  if v_key is null then
    raise exception 'Encryption key not configured';
  end if;

  v_decrypted := pgp_sym_decrypt(v_encrypted, encode(v_key, 'hex'));
  return v_decrypted::jsonb;
end;
$$;

-- Grant execute only to authenticated users
revoke all on function public.fn_decrypt_integration_credential(uuid) from public;
grant execute on function public.fn_decrypt_integration_credential(uuid) to authenticated;
