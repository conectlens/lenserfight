-- =============================================================================
-- pgTAP — Phase LG-P0: Lens Parameter Governance foundation
-- Verifies: table existence, primary keys, key CHECK constraints, RLS, FORCE
-- RLS, immutability triggers, denial of direct writes, ALTERs on
-- lenses.versions / lenses.tools, governance_class consistency.
-- =============================================================================

BEGIN;

SELECT plan(38);

-- ---------------------------------------------------------------------------
-- 1-9. Tables exist
-- ---------------------------------------------------------------------------
SELECT has_table('lenses', 'contracts',               'lenses.contracts exists');
SELECT has_table('lenses', 'parameter_contracts',     'lenses.parameter_contracts exists');
SELECT has_table('lenses', 'contract_channels',       'lenses.contract_channels exists');
SELECT has_table('lenses', 'contract_signatures',     'lenses.contract_signatures exists');
SELECT has_table('lenses', 'dependency_edges',        'lenses.dependency_edges exists');
SELECT has_table('lenses', 'parameter_deprecations',  'lenses.parameter_deprecations exists');
SELECT has_table('lenses', 'security_scopes',         'lenses.security_scopes exists');
SELECT has_table('lenses', 'capability_index',        'lenses.capability_index exists');
SELECT has_table('lenses', 'execution_records',       'lenses.execution_records exists');

-- ---------------------------------------------------------------------------
-- 10-12. Primary keys
-- ---------------------------------------------------------------------------
SELECT col_is_pk('lenses', 'contracts',           ARRAY['content_hash'],
  'contracts PK is content_hash');
SELECT col_is_pk('lenses', 'parameter_contracts', ARRAY['content_hash', 'label'],
  'parameter_contracts PK is (content_hash, label)');
SELECT col_is_pk('lenses', 'dependency_edges',
  ARRAY['parent_content_hash', 'child_content_hash', 'binding'],
  'dependency_edges PK is (parent, child, binding)');

-- ---------------------------------------------------------------------------
-- 13-14. content_hash size enforcement (must be 32 bytes / sha256)
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_content_hash_length_check'
  ),
  'contracts content_hash length check exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'versions_content_hash_length_check'
  ),
  'versions.content_hash length check exists'
);

-- ---------------------------------------------------------------------------
-- 15. semver format enforced on contracts
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_semver_format_check'
  ),
  'contracts semver format check exists'
);

-- ---------------------------------------------------------------------------
-- 16. contracts.kind enum is enforced
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_kind_check'
  ),
  'contracts kind check exists'
);

-- ---------------------------------------------------------------------------
-- 17. dependency_edges depth bounded
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dependency_edges_depth_nonneg'
  ),
  'dependency_edges depth bound check exists'
);

-- ---------------------------------------------------------------------------
-- 18. parameter_contracts classification enum
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pc_classification_check'
  ),
  'parameter_contracts classification check exists'
);

-- ---------------------------------------------------------------------------
-- 19. protected param override consistency
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pc_protected_override_consistency'
  ),
  'parameter_contracts protected-override consistency check exists'
);

-- ---------------------------------------------------------------------------
-- 20-26. RLS enabled & forced
-- ---------------------------------------------------------------------------
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.contracts'::regclass),
  'RLS enabled on lenses.contracts'
);
SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'lenses.contracts'::regclass),
  'FORCE RLS on lenses.contracts'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.parameter_contracts'::regclass),
  'RLS enabled on lenses.parameter_contracts'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.contract_channels'::regclass),
  'RLS enabled on lenses.contract_channels'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.contract_signatures'::regclass),
  'RLS enabled on lenses.contract_signatures'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.dependency_edges'::regclass),
  'RLS enabled on lenses.dependency_edges'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'lenses.execution_records'::regclass),
  'RLS enabled on lenses.execution_records'
);

-- ---------------------------------------------------------------------------
-- 27-32. Immutability triggers attached
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'contracts'
      AND trigger_name = 'trg_contracts_immutable'
  ),
  'trg_contracts_immutable attached'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'parameter_contracts'
      AND trigger_name = 'trg_parameter_contracts_immutable'
  ),
  'trg_parameter_contracts_immutable attached'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'contract_signatures'
      AND trigger_name = 'trg_contract_signatures_immutable'
  ),
  'trg_contract_signatures_immutable attached'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'dependency_edges'
      AND trigger_name = 'trg_dependency_edges_immutable'
  ),
  'trg_dependency_edges_immutable attached'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'parameter_deprecations'
      AND trigger_name = 'trg_parameter_deprecations_immutable'
  ),
  'trg_parameter_deprecations_immutable attached'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'lenses'
      AND event_object_table = 'execution_records'
      AND trigger_name = 'trg_execution_records_immutable'
  ),
  'trg_execution_records_immutable attached'
);

-- ---------------------------------------------------------------------------
-- 33. Direct-write deny policy on contracts (for authenticated, anon)
-- ---------------------------------------------------------------------------
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'lenses'
      AND tablename  = 'contracts'
      AND policyname = 'contracts_no_direct_write'
  ),
  'contracts_no_direct_write policy attached'
);

-- ---------------------------------------------------------------------------
-- 34-35. ALTERs on lenses.versions
-- ---------------------------------------------------------------------------
SELECT has_column('lenses', 'versions', 'content_hash',
  'lenses.versions.content_hash exists');
SELECT has_column('lenses', 'versions', 'semver',
  'lenses.versions.semver exists');

-- ---------------------------------------------------------------------------
-- 36-38. ALTERs on lenses.tools + governance consistency
-- ---------------------------------------------------------------------------
SELECT has_column('lenses', 'tools', 'governance_class',
  'lenses.tools.governance_class exists');
SELECT has_column('lenses', 'tools', 'is_protected',
  'lenses.tools.is_protected exists');
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tools_protected_class_consistency'
  ),
  'tools_protected_class_consistency check exists'
);

SELECT finish();

ROLLBACK;
