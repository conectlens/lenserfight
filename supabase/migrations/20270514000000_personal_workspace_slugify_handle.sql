-- =============================================================================
-- Tenancy workspace slug checks
-- =============================================================================
-- Some environments picked up a duplicate CHECK (ck_tenancy_workspaces_slug_format)
-- that only allows hyphens — it rejects valid Community Edition slugs with
-- underscores (e.g. alice_arena). The canonical rule remains workspaces_slug_format.
--
-- Also align fn_create_personal_workspace: profile handles may contain dots
-- (lensers_handle_format_check) but workspace slugs may not.
-- =============================================================================

ALTER TABLE tenancy.workspaces
  DROP CONSTRAINT IF EXISTS ck_tenancy_workspaces_slug_format;

-- Phase Z4 (20270510300000_text_length_and_format_checks.sql) added hyphen-only
-- slug CHECKs on every *slug* column. Those conflict with existing per-table slug
-- rules (underscores, etc.). Drop only constraints whose definition is that
-- exact Z4 pattern; leave table-specific checks (e.g. workspaces_slug_format).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS sch, c.relname AS tbl, con.conname AS cname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.contype = 'c'
      AND con.conname LIKE 'ck\_%\_format' ESCAPE '\'
      AND pg_get_constraintdef(con.oid) LIKE '%^[a-z0-9][a-z0-9-]{0,127}$%'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      r.sch, r.tbl, r.cname
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION tenancy.fn_create_personal_workspace() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'tenancy', 'lensers', 'public'
    AS $$
DECLARE
    v_workspace_id uuid;
    v_slug         text;
BEGIN
    IF EXISTS (
        SELECT 1 FROM tenancy.workspaces
        WHERE owner_lenser_id = NEW.id AND type = 'personal'
    ) THEN
        RETURN NEW;
    END IF;

    -- Map profile handle → workspace slug (no dots; collapse runs of separators).
    v_slug := trim(both '_' FROM regexp_replace(
        regexp_replace(lower(NEW.handle), '[^a-z0-9]+', '_', 'g'),
        '_+', '_', 'g'
    ));

    IF v_slug IS NULL OR length(v_slug) < 3 THEN
        v_slug := 'lwf_' || replace(NEW.id::text, '-', '');
    END IF;

    v_slug := left(v_slug, 64);

    BEGIN
        INSERT INTO tenancy.workspaces (slug, type, display_name, owner_lenser_id)
        VALUES (v_slug, 'personal', COALESCE(NEW.display_name, NEW.handle), NEW.id)
        RETURNING id INTO v_workspace_id;

    EXCEPTION WHEN unique_violation THEN
        v_slug := left(
            regexp_replace(
                v_slug || '_' || replace(NEW.id::text, '-', ''),
                '_+', '_', 'g'
            ),
            64
        );

        INSERT INTO tenancy.workspaces (slug, type, display_name, owner_lenser_id)
        VALUES (v_slug, 'personal', COALESCE(NEW.display_name, NEW.handle), NEW.id)
        RETURNING id INTO v_workspace_id;
    END;

    INSERT INTO tenancy.workspace_members (workspace_id, lenser_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner')
    ON CONFLICT (workspace_id, lenser_id) DO NOTHING;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION tenancy.fn_create_personal_workspace() IS
'AFTER INSERT OR UPDATE on lensers.profiles. Creates a personal workspace slug derived from handle (workspace-safe: dots and repeated separators normalized). Idempotent.';
