-- =============================================================================
-- Seed execution.origin_types lookup table
--
-- The table replaces a hard-coded CHECK constraint on execution.requests.origin_type.
-- Without rows here every INSERT into execution.requests fails with FK 23503.
-- =============================================================================

INSERT INTO execution.origin_types (key, description) VALUES
    ('api_stream',      'Streaming execution via POST /execute/stream'),
    ('api_byok',        'BYOK streaming execution via POST /execute/byok'),
    ('web',             'Execution triggered from the web UI via fn_run_lens'),
    ('api',             'Generic API execution (internal/legacy path)'),
    ('lens_preview',    'Local BYOK preview execution persisted via fn_persist_local_execution'),
    ('content_preview', 'Preview execution for content before publishing'),
    ('template_test',   'Test execution for lens templates'),
    ('battle',          'Execution triggered as part of a battle'),
    ('forum',           'Execution triggered from a forum post'),
    ('cli',             'Execution triggered from the CLI')
ON CONFLICT (key) DO NOTHING;

