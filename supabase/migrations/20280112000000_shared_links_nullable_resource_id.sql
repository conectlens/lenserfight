-- analytics.shared_links.resource_id: drop NOT NULL
-- resource_type='page' (and 'external') have no DB-entity UUID;
-- the column was always accepted as NULL in fn_analytics_shared_links_create
-- but the DDL was incorrectly NOT NULL, causing 23502 on every page-type share.
ALTER TABLE analytics.shared_links
  ALTER COLUMN resource_id DROP NOT NULL;
