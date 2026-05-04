-- Generic partner provision table — one row per (user, partner).
-- New partners (Google, Amazon, etc.) are just new rows; schema never changes.
CREATE TABLE public.partner_provisions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_name    text        NOT NULL,
  external_id     text        NOT NULL,
  account_id      text,
  token           text,
  token_scopes    text[]      NOT NULL DEFAULT '{}',
  starter_credits int         NOT NULL DEFAULT 0,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_name)
);

ALTER TABLE public.partner_provisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_provisions_select_own"
  ON public.partner_provisions FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX partner_provisions_user_id_idx ON public.partner_provisions (user_id);
