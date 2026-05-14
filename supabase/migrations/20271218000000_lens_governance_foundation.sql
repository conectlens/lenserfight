-- =============================================================================
-- Phase LG-P0: Lens Parameter Governance — Foundation Schema
--
-- Introduces the immutable, hash-addressed Lens Contract registry on top of the
-- existing lenses.* tables. This migration is strictly additive: no existing
-- table is dropped, no existing column changes shape. Two narrow ALTERs add
-- governance metadata to lenses.versions and lenses.tools.
--
-- Tables created
--   lenses.contracts              — append-only signed contracts, PK content_hash
--   lenses.parameter_contracts    — per-contract parameter rules (frozen)
--   lenses.contract_channels      — mutable (lens, channel) -> content_hash
--   lenses.contract_signatures    — detached Ed25519/HMAC signatures
--   lenses.dependency_edges       — materialized DAG of composite Lenses
--   lenses.parameter_deprecations — machine-readable migration recipes
--   lenses.security_scopes        — required RBAC/ABAC scopes per contract
--   lenses.capability_index       — FTS-backed AI discovery projection
--   lenses.execution_records      — compiled-context audit trail
--
-- Columns added
--   lenses.versions.content_hash, lenses.versions.semver
--   lenses.tools.governance_class, lenses.tools.is_protected
--
-- Conventions
--   - All new tables FORCE ROW LEVEL SECURITY.
--   - Immutable tables protected by public.fn_deny_mutation() trigger.
--   - Writes funnel through SECURITY DEFINER RPCs (future migration); RLS on
--     these tables denies direct INSERT/UPDATE/DELETE to authenticated/anon.
--   - content_hash columns are BYTEA (raw sha256 digest) for index efficiency;
--     callers may render as hex for transport.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ALTER lenses.versions  — content_hash + semver
-- ---------------------------------------------------------------------------

ALTER TABLE "lenses"."versions"
  ADD COLUMN IF NOT EXISTS "content_hash" bytea,
  ADD COLUMN IF NOT EXISTS "semver"       text;

-- semver shape enforced when present; nullable so legacy rows can backfill
-- through the publish RPC without breaking inserts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'versions_semver_format_check'
  ) THEN
    ALTER TABLE "lenses"."versions"
      ADD CONSTRAINT "versions_semver_format_check"
      CHECK (
        "semver" IS NULL
        OR "semver" ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+(\.[0-9]+)?)?$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'versions_content_hash_length_check'
  ) THEN
    ALTER TABLE "lenses"."versions"
      ADD CONSTRAINT "versions_content_hash_length_check"
      CHECK ("content_hash" IS NULL OR octet_length("content_hash") = 32);
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "versions_content_hash_uniq"
  ON "lenses"."versions" ("content_hash")
  WHERE "content_hash" IS NOT NULL;

COMMENT ON COLUMN "lenses"."versions"."content_hash" IS
  'sha256 digest (32 bytes) of the canonical Lens Contract body. Populated by the publish RPC; NULL for legacy rows pending backfill.';
COMMENT ON COLUMN "lenses"."versions"."semver" IS
  'Semver assigned at publish (e.g. 2.3.1, 2.4.0-rc.1). Bump level enforced by diff against prior stable contract.';

-- ---------------------------------------------------------------------------
-- 2. ALTER lenses.tools  — governance_class + is_protected
-- ---------------------------------------------------------------------------

ALTER TABLE "lenses"."tools"
  ADD COLUMN IF NOT EXISTS "governance_class" text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "is_protected"     boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tools_governance_class_check'
  ) THEN
    ALTER TABLE "lenses"."tools"
      ADD CONSTRAINT "tools_governance_class_check"
      CHECK ("governance_class" IN ('public', 'internal', 'protected', 'system'));
  END IF;

  -- Consistency: a tool marked is_protected must classify as protected or system.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tools_protected_class_consistency'
  ) THEN
    ALTER TABLE "lenses"."tools"
      ADD CONSTRAINT "tools_protected_class_consistency"
      CHECK (
        NOT "is_protected"
        OR "governance_class" IN ('protected', 'system')
      );
  END IF;
END$$;

COMMENT ON COLUMN "lenses"."tools"."governance_class" IS
  'Lens governance class. public=caller may supply; internal=registry may override; protected=registry default, override rejected; system=resolved from execution context, never visible to caller.';
COMMENT ON COLUMN "lenses"."tools"."is_protected" IS
  'When true, parameter contracts referencing this tool cannot be overridden by callers (e.g. safety_filter, system_prompt). Implied by governance_class in (protected, system).';

-- ---------------------------------------------------------------------------
-- 3. lenses.contracts  — hash-addressed, append-only registry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."contracts" (
  "content_hash"      bytea       PRIMARY KEY,
  "lens_id"           uuid        NOT NULL REFERENCES "lenses"."lenses" ("id") ON DELETE RESTRICT,
  "version_id"        uuid        NOT NULL REFERENCES "lenses"."versions" ("id") ON DELETE RESTRICT,
  "semver"            text        NOT NULL,
  "kind"              text        NOT NULL DEFAULT 'lens',
  "spec_version"      text        NOT NULL DEFAULT '1.0.0',
  "body"              jsonb       NOT NULL,
  "supersedes_hash"   bytea       REFERENCES "lenses"."contracts" ("content_hash"),
  "published_by"      uuid        NOT NULL REFERENCES "lensers"."profiles" ("id") ON DELETE RESTRICT,
  "published_at"      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "contracts_content_hash_length_check"
    CHECK (octet_length("content_hash") = 32),
  CONSTRAINT "contracts_semver_format_check"
    CHECK ("semver" ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9]+(\.[0-9]+)?)?$'),
  CONSTRAINT "contracts_kind_check"
    CHECK ("kind" IN ('lens', 'workflow', 'composite')),
  CONSTRAINT "contracts_spec_version_format_check"
    CHECK ("spec_version" ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  CONSTRAINT "contracts_body_shape_check"
    CHECK (
      jsonb_typeof("body") = 'object'
      AND jsonb_typeof("body" -> 'inputs')  = 'array'
      AND jsonb_typeof("body" -> 'outputs') = 'array'
    ),
  CONSTRAINT "contracts_no_self_supersedes"
    CHECK ("supersedes_hash" IS NULL OR "supersedes_hash" <> "content_hash")
);

ALTER TABLE ONLY "lenses"."contracts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."contracts" OWNER TO "postgres";
ALTER TABLE "lenses"."contracts" ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE "lenses"."contracts" IS
  'Immutable signed Lens Contracts. Primary key is sha256(canonical_json(body)). Append-only: see trg_contracts_immutable. Authoritative source of truth for parameter governance.';

CREATE INDEX IF NOT EXISTS "contracts_lens_published_idx"
  ON "lenses"."contracts" ("lens_id", "published_at" DESC);

CREATE INDEX IF NOT EXISTS "contracts_lens_semver_idx"
  ON "lenses"."contracts" ("lens_id", "semver");

CREATE INDEX IF NOT EXISTS "contracts_version_idx"
  ON "lenses"."contracts" ("version_id");

CREATE INDEX IF NOT EXISTS "contracts_supersedes_idx"
  ON "lenses"."contracts" ("supersedes_hash")
  WHERE "supersedes_hash" IS NOT NULL;

-- append-only guard
DROP TRIGGER IF EXISTS "trg_contracts_immutable" ON "lenses"."contracts";
CREATE TRIGGER "trg_contracts_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."contracts"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

-- RLS: anyone can read contracts owned by a public lens or owned by them;
-- writes only via SECURITY DEFINER RPCs (future migration).
DROP POLICY IF EXISTS "contracts_visible_select" ON "lenses"."contracts";
CREATE POLICY "contracts_visible_select" ON "lenses"."contracts"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1 FROM "lenses"."lenses" l
      WHERE l."id" = "lenses"."contracts"."lens_id"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "contracts_no_direct_write" ON "lenses"."contracts";
CREATE POLICY "contracts_no_direct_write" ON "lenses"."contracts"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 4. lenses.parameter_contracts  — frozen parameter rules per contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."parameter_contracts" (
  "content_hash"     bytea   NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "label"            text    NOT NULL,
  "tool_id"          uuid    REFERENCES "lenses"."tools" ("id") ON DELETE RESTRICT,
  "classification"   text    NOT NULL DEFAULT 'public',
  "kind"             text    NOT NULL DEFAULT 'primitive',
  "type"             text    NOT NULL,
  "required"         boolean NOT NULL DEFAULT false,
  "default_spec"     jsonb,
  "validation"       jsonb,
  "scope"            text    NOT NULL DEFAULT 'lens',
  "overrideable_by"  text[]  NOT NULL DEFAULT '{}'::text[],
  "deprecation"      jsonb,
  "sort_order"       integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("content_hash", "label"),
  CONSTRAINT "pc_label_not_blank"        CHECK (length(trim("label")) > 0),
  CONSTRAINT "pc_label_format_check"     CHECK ("label" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "pc_classification_check"   CHECK ("classification" IN ('public', 'internal', 'protected', 'system')),
  CONSTRAINT "pc_kind_check"             CHECK ("kind" IN ('primitive', 'ai', 'runtime')),
  CONSTRAINT "pc_scope_check"            CHECK ("scope" IN ('lens', 'workflow', 'run', 'tenant', 'global')),
  CONSTRAINT "pc_default_spec_shape"     CHECK ("default_spec" IS NULL OR jsonb_typeof("default_spec") = 'object'),
  CONSTRAINT "pc_validation_shape"       CHECK ("validation"   IS NULL OR jsonb_typeof("validation")   = 'object'),
  CONSTRAINT "pc_deprecation_shape"      CHECK ("deprecation"  IS NULL OR jsonb_typeof("deprecation")  = 'object'),
  -- protected/system parameters cannot be marked overrideable by anyone except admin
  CONSTRAINT "pc_protected_override_consistency" CHECK (
    "classification" NOT IN ('protected', 'system')
    OR "overrideable_by" <@ ARRAY['admin']::text[]
  )
);

ALTER TABLE ONLY "lenses"."parameter_contracts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."parameter_contracts" OWNER TO "postgres";
ALTER TABLE "lenses"."parameter_contracts" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "parameter_contracts_tool_idx"
  ON "lenses"."parameter_contracts" ("tool_id");

CREATE INDEX IF NOT EXISTS "parameter_contracts_classification_idx"
  ON "lenses"."parameter_contracts" ("classification")
  WHERE "classification" IN ('protected', 'system');

CREATE INDEX IF NOT EXISTS "parameter_contracts_label_idx"
  ON "lenses"."parameter_contracts" ("label");

DROP TRIGGER IF EXISTS "trg_parameter_contracts_immutable" ON "lenses"."parameter_contracts";
CREATE TRIGGER "trg_parameter_contracts_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."parameter_contracts"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "parameter_contracts_visible_select" ON "lenses"."parameter_contracts";
CREATE POLICY "parameter_contracts_visible_select" ON "lenses"."parameter_contracts"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."parameter_contracts"."content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "parameter_contracts_no_direct_write" ON "lenses"."parameter_contracts";
CREATE POLICY "parameter_contracts_no_direct_write" ON "lenses"."parameter_contracts"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."parameter_contracts" IS
  'Per-contract frozen parameter rules. PK (content_hash, label). Append-only: parameter contracts mutate by publishing a new contract.';

-- ---------------------------------------------------------------------------
-- 5. lenses.contract_channels  — mutable channel pointer
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."contract_channels" (
  "lens_id"      uuid        NOT NULL REFERENCES "lenses"."lenses" ("id") ON DELETE CASCADE,
  "channel"      text        NOT NULL,
  "content_hash" bytea       NOT NULL REFERENCES "lenses"."contracts" ("content_hash"),
  "updated_at"   timestamptz NOT NULL DEFAULT now(),
  "updated_by"   uuid        REFERENCES "lensers"."profiles" ("id"),
  PRIMARY KEY ("lens_id", "channel"),
  CONSTRAINT "contract_channels_channel_check"
    CHECK ("channel" IN ('stable', 'beta', 'canary', 'deprecated', 'yanked'))
);

ALTER TABLE ONLY "lenses"."contract_channels" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."contract_channels" OWNER TO "postgres";
ALTER TABLE "lenses"."contract_channels" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "contract_channels_hash_idx"
  ON "lenses"."contract_channels" ("content_hash");

DROP POLICY IF EXISTS "contract_channels_visible_select" ON "lenses"."contract_channels";
CREATE POLICY "contract_channels_visible_select" ON "lenses"."contract_channels"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1 FROM "lenses"."lenses" l
      WHERE l."id" = "lenses"."contract_channels"."lens_id"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "contract_channels_no_direct_write" ON "lenses"."contract_channels";
CREATE POLICY "contract_channels_no_direct_write" ON "lenses"."contract_channels"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."contract_channels" IS
  'Mutable pointer (lens_id, channel) -> content_hash. The only mutable artifact in the registry. Channel promotion enforced by fn_lens_promote_channel RPC (future).';

-- ---------------------------------------------------------------------------
-- 6. lenses.contract_signatures  — detached signatures (multi-key)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."contract_signatures" (
  "content_hash"  bytea       NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "key_id"        text        NOT NULL,
  "algorithm"     text        NOT NULL,
  "signature"     bytea       NOT NULL,
  "signed_at"     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("content_hash", "key_id"),
  CONSTRAINT "contract_signatures_algorithm_check"
    CHECK ("algorithm" IN ('ed25519', 'hmac-sha256')),
  CONSTRAINT "contract_signatures_key_id_format"
    CHECK ("key_id" ~ '^[a-z0-9][a-z0-9._-]{0,63}$'),
  CONSTRAINT "contract_signatures_signature_length"
    CHECK (octet_length("signature") BETWEEN 32 AND 256)
);

ALTER TABLE ONLY "lenses"."contract_signatures" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."contract_signatures" OWNER TO "postgres";
ALTER TABLE "lenses"."contract_signatures" ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS "trg_contract_signatures_immutable" ON "lenses"."contract_signatures";
CREATE TRIGGER "trg_contract_signatures_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."contract_signatures"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "contract_signatures_visible_select" ON "lenses"."contract_signatures";
CREATE POLICY "contract_signatures_visible_select" ON "lenses"."contract_signatures"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."contract_signatures"."content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "contract_signatures_no_direct_write" ON "lenses"."contract_signatures";
CREATE POLICY "contract_signatures_no_direct_write" ON "lenses"."contract_signatures"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."contract_signatures" IS
  'Detached signatures over content_hash. Multi-key to support rotation: (content_hash, key_id) primary key. Registry private key signs at publish; verifiers fetch by key_id.';

-- ---------------------------------------------------------------------------
-- 7. lenses.dependency_edges  — materialized composite DAG
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."dependency_edges" (
  "parent_content_hash" bytea   NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "child_content_hash"  bytea   NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "binding"             text    NOT NULL DEFAULT 'lift',
  "depth"               integer NOT NULL,
  "edge_metadata"       jsonb,
  PRIMARY KEY ("parent_content_hash", "child_content_hash", "binding"),
  CONSTRAINT "dependency_edges_binding_check"
    CHECK ("binding" IN ('lift', 'bind', 'ref')),
  CONSTRAINT "dependency_edges_depth_nonneg"
    CHECK ("depth" >= 1 AND "depth" <= 16),
  CONSTRAINT "dependency_edges_no_self"
    CHECK ("parent_content_hash" <> "child_content_hash"),
  CONSTRAINT "dependency_edges_metadata_shape"
    CHECK ("edge_metadata" IS NULL OR jsonb_typeof("edge_metadata") = 'object')
);

ALTER TABLE ONLY "lenses"."dependency_edges" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."dependency_edges" OWNER TO "postgres";
ALTER TABLE "lenses"."dependency_edges" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "dependency_edges_parent_idx"
  ON "lenses"."dependency_edges" ("parent_content_hash");

CREATE INDEX IF NOT EXISTS "dependency_edges_child_idx"
  ON "lenses"."dependency_edges" ("child_content_hash");

DROP TRIGGER IF EXISTS "trg_dependency_edges_immutable" ON "lenses"."dependency_edges";
CREATE TRIGGER "trg_dependency_edges_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."dependency_edges"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "dependency_edges_visible_select" ON "lenses"."dependency_edges";
CREATE POLICY "dependency_edges_visible_select" ON "lenses"."dependency_edges"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."dependency_edges"."parent_content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "dependency_edges_no_direct_write" ON "lenses"."dependency_edges";
CREATE POLICY "dependency_edges_no_direct_write" ON "lenses"."dependency_edges"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."dependency_edges" IS
  'Materialized DAG of composite Lens / workflow dependencies. Depth precomputed at publish; cycle detection enforced before insert. Max depth 16.';

-- ---------------------------------------------------------------------------
-- 8. lenses.parameter_deprecations  — machine-readable migration recipes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."parameter_deprecations" (
  "from_content_hash"   bytea       NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "label"               text        NOT NULL,
  "to_content_hash"     bytea       REFERENCES "lenses"."contracts" ("content_hash"),
  "to_label"            text,
  "migration_recipe"    jsonb,
  "deprecated_at"       timestamptz NOT NULL DEFAULT now(),
  "removal_planned_at"  timestamptz,
  PRIMARY KEY ("from_content_hash", "label"),
  CONSTRAINT "parameter_deprecations_recipe_shape"
    CHECK ("migration_recipe" IS NULL OR jsonb_typeof("migration_recipe") = 'object'),
  CONSTRAINT "parameter_deprecations_label_format"
    CHECK ("label" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "parameter_deprecations_to_label_format"
    CHECK ("to_label" IS NULL OR "to_label" ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT "parameter_deprecations_removal_after_deprecated"
    CHECK ("removal_planned_at" IS NULL OR "removal_planned_at" >= "deprecated_at")
);

ALTER TABLE ONLY "lenses"."parameter_deprecations" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."parameter_deprecations" OWNER TO "postgres";
ALTER TABLE "lenses"."parameter_deprecations" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "parameter_deprecations_to_hash_idx"
  ON "lenses"."parameter_deprecations" ("to_content_hash")
  WHERE "to_content_hash" IS NOT NULL;

DROP TRIGGER IF EXISTS "trg_parameter_deprecations_immutable" ON "lenses"."parameter_deprecations";
CREATE TRIGGER "trg_parameter_deprecations_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."parameter_deprecations"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "parameter_deprecations_visible_select" ON "lenses"."parameter_deprecations";
CREATE POLICY "parameter_deprecations_visible_select" ON "lenses"."parameter_deprecations"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."parameter_deprecations"."from_content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "parameter_deprecations_no_direct_write" ON "lenses"."parameter_deprecations";
CREATE POLICY "parameter_deprecations_no_direct_write" ON "lenses"."parameter_deprecations"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 9. lenses.security_scopes  — RBAC/ABAC requirements per contract
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."security_scopes" (
  "content_hash"     bytea NOT NULL REFERENCES "lenses"."contracts" ("content_hash") ON DELETE RESTRICT,
  "required_scope"   text  NOT NULL,
  "scope_kind"       text  NOT NULL DEFAULT 'rbac',
  "abac_predicate"   jsonb,
  PRIMARY KEY ("content_hash", "required_scope"),
  CONSTRAINT "security_scopes_scope_format"
    CHECK ("required_scope" ~ '^[a-z][a-z0-9_]*(:[a-z][a-z0-9_]*)+$'),
  CONSTRAINT "security_scopes_kind_check"
    CHECK ("scope_kind" IN ('rbac', 'abac')),
  CONSTRAINT "security_scopes_abac_consistency"
    CHECK (
      ("scope_kind" = 'rbac' AND "abac_predicate" IS NULL)
      OR ("scope_kind" = 'abac' AND jsonb_typeof("abac_predicate") = 'object')
    )
);

ALTER TABLE ONLY "lenses"."security_scopes" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."security_scopes" OWNER TO "postgres";
ALTER TABLE "lenses"."security_scopes" ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS "trg_security_scopes_immutable" ON "lenses"."security_scopes";
CREATE TRIGGER "trg_security_scopes_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."security_scopes"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "security_scopes_visible_select" ON "lenses"."security_scopes";
CREATE POLICY "security_scopes_visible_select" ON "lenses"."security_scopes"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."security_scopes"."content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "security_scopes_no_direct_write" ON "lenses"."security_scopes";
CREATE POLICY "security_scopes_no_direct_write" ON "lenses"."security_scopes"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 10. lenses.capability_index  — FTS-backed AI discovery
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."capability_index" (
  "content_hash"     bytea       PRIMARY KEY REFERENCES "lenses"."contracts" ("content_hash") ON DELETE CASCADE,
  "lens_kind"        text        NOT NULL,
  "capability_tags"  text[]      NOT NULL DEFAULT '{}'::text[],
  "input_kinds"      text[]      NOT NULL DEFAULT '{}'::text[],
  "output_kinds"     text[]      NOT NULL DEFAULT '{}'::text[],
  "summary"          text        NOT NULL,
  "fts_doc"          tsvector    NOT NULL,
  "indexed_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "capability_index_summary_length"
    CHECK (length(trim("summary")) BETWEEN 1 AND 300),
  CONSTRAINT "capability_index_lens_kind_check"
    CHECK ("lens_kind" IN (
      'text','image','video','audio','music','research','pdf',
      'transform','orchestration','validation','routing'
    ))
);

ALTER TABLE ONLY "lenses"."capability_index" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."capability_index" OWNER TO "postgres";
ALTER TABLE "lenses"."capability_index" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "capability_index_fts_idx"
  ON "lenses"."capability_index" USING gin ("fts_doc");

CREATE INDEX IF NOT EXISTS "capability_index_tags_idx"
  ON "lenses"."capability_index" USING gin ("capability_tags");

CREATE INDEX IF NOT EXISTS "capability_index_kind_idx"
  ON "lenses"."capability_index" ("lens_kind");

DROP POLICY IF EXISTS "capability_index_visible_select" ON "lenses"."capability_index";
CREATE POLICY "capability_index_visible_select" ON "lenses"."capability_index"
  FOR SELECT TO "authenticated", "anon"
  USING (
    EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."capability_index"."content_hash"
        AND (
          l."visibility" = 'public'::"content"."visibility_enum"
          OR l."lenser_id" = "lensers"."get_auth_lenser_id"()
        )
    )
  );

DROP POLICY IF EXISTS "capability_index_no_direct_write" ON "lenses"."capability_index";
CREATE POLICY "capability_index_no_direct_write" ON "lenses"."capability_index"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."capability_index" IS
  'AI-explorable projection of published Lens contracts. fts_doc combines name, summary, capability_tags, parameter labels, output kinds for keyword search. Embedding column deferred until pgvector is available.';

-- ---------------------------------------------------------------------------
-- 11. lenses.execution_records  — compiled-context audit trail
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "lenses"."execution_records" (
  "id"                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_hash"         bytea       NOT NULL REFERENCES "lenses"."contracts" ("content_hash"),
  "principal_lenser_id"  uuid        REFERENCES "lensers"."profiles" ("id"),
  "principal_kind"       text        NOT NULL DEFAULT 'lenser',
  "compiled_at"          timestamptz NOT NULL DEFAULT now(),
  "execution_status"     text        NOT NULL DEFAULT 'compiled',
  "resolved_inputs"      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  "violation"            jsonb,
  "trace_id"             uuid        NOT NULL DEFAULT gen_random_uuid(),
  "idempotency_key"      uuid,
  CONSTRAINT "execution_records_principal_kind_check"
    CHECK ("principal_kind" IN ('lenser', 'ai_lenser', 'system', 'gateway')),
  CONSTRAINT "execution_records_status_check"
    CHECK ("execution_status" IN ('compiled', 'dispatched', 'completed', 'failed', 'rejected')),
  CONSTRAINT "execution_records_violation_shape"
    CHECK ("violation" IS NULL OR jsonb_typeof("violation") = 'object'),
  CONSTRAINT "execution_records_resolved_inputs_shape"
    CHECK (jsonb_typeof("resolved_inputs") = 'object'),
  CONSTRAINT "execution_records_violation_consistency" CHECK (
    ("execution_status" = 'rejected' AND "violation" IS NOT NULL)
    OR ("execution_status" <> 'rejected')
  )
);

ALTER TABLE ONLY "lenses"."execution_records" FORCE ROW LEVEL SECURITY;
ALTER TABLE "lenses"."execution_records" OWNER TO "postgres";
ALTER TABLE "lenses"."execution_records" ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS "execution_records_content_hash_idx"
  ON "lenses"."execution_records" ("content_hash", "compiled_at" DESC);

CREATE INDEX IF NOT EXISTS "execution_records_principal_idx"
  ON "lenses"."execution_records" ("principal_lenser_id", "compiled_at" DESC)
  WHERE "principal_lenser_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "execution_records_idempotency_idx"
  ON "lenses"."execution_records" ("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "execution_records_trace_idx"
  ON "lenses"."execution_records" ("trace_id");

-- append-only audit
DROP TRIGGER IF EXISTS "trg_execution_records_immutable" ON "lenses"."execution_records";
CREATE TRIGGER "trg_execution_records_immutable"
  BEFORE UPDATE OR DELETE ON "lenses"."execution_records"
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_deny_mutation"();

DROP POLICY IF EXISTS "execution_records_owner_select" ON "lenses"."execution_records";
CREATE POLICY "execution_records_owner_select" ON "lenses"."execution_records"
  FOR SELECT TO "authenticated"
  USING (
    "principal_lenser_id" = "lensers"."get_auth_lenser_id"()
    OR EXISTS (
      SELECT 1
      FROM "lenses"."contracts" c
      JOIN "lenses"."lenses"    l ON l."id" = c."lens_id"
      WHERE c."content_hash" = "lenses"."execution_records"."content_hash"
        AND l."lenser_id" = "lensers"."get_auth_lenser_id"()
    )
  );

DROP POLICY IF EXISTS "execution_records_no_direct_write" ON "lenses"."execution_records";
CREATE POLICY "execution_records_no_direct_write" ON "lenses"."execution_records"
  FOR ALL TO "authenticated", "anon"
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE "lenses"."execution_records" IS
  'Append-only audit of every Compiler invocation. One row per compile attempt: violations included for rejected, resolved inputs (redacted for secrets) for accepted. Trace id correlates with audit.events hash chain.';

-- ---------------------------------------------------------------------------
-- 12. Grants — readers only; writes are RPC-only.
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA "lenses" TO "authenticated", "anon";

GRANT SELECT ON "lenses"."contracts"               TO "authenticated", "anon";
GRANT SELECT ON "lenses"."parameter_contracts"     TO "authenticated", "anon";
GRANT SELECT ON "lenses"."contract_channels"       TO "authenticated", "anon";
GRANT SELECT ON "lenses"."contract_signatures"     TO "authenticated", "anon";
GRANT SELECT ON "lenses"."dependency_edges"        TO "authenticated", "anon";
GRANT SELECT ON "lenses"."parameter_deprecations"  TO "authenticated", "anon";
GRANT SELECT ON "lenses"."security_scopes"         TO "authenticated", "anon";
GRANT SELECT ON "lenses"."capability_index"        TO "authenticated", "anon";
GRANT SELECT ON "lenses"."execution_records"       TO "authenticated";

GRANT ALL ON "lenses"."contracts"               TO "service_role";
GRANT ALL ON "lenses"."parameter_contracts"     TO "service_role";
GRANT ALL ON "lenses"."contract_channels"       TO "service_role";
GRANT ALL ON "lenses"."contract_signatures"     TO "service_role";
GRANT ALL ON "lenses"."dependency_edges"        TO "service_role";
GRANT ALL ON "lenses"."parameter_deprecations"  TO "service_role";
GRANT ALL ON "lenses"."security_scopes"         TO "service_role";
GRANT ALL ON "lenses"."capability_index"        TO "service_role";
GRANT ALL ON "lenses"."execution_records"       TO "service_role";

COMMIT;
