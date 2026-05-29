import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { registerLensList } from './lens-list.js';
import { registerLensSearch } from './lens-search.js';
import { registerLensGet } from './lens-get.js';
import { registerLensCreate } from './lens-create.js';
import { registerLensUpdate } from './lens-update.js';
import { registerLensArchive } from './lens-archive.js';
import { registerLensDelete } from './lens-delete.js';
import { registerLensSetVisibility } from './lens-set-visibility.js';
import { registerLensValidateParams } from './lens-validate-params.js';
import { registerLensExtractParams } from './lens-extract-params.js';
import { registerLensRun } from './lens-run.js';
import { registerLensFindAndRun } from './lens-find-and-run.js';
import { registerLensFork } from './lens-fork.js';
import { registerLensVersions } from './lens-versions.js';
import { registerLensGetVersion } from './lens-get-version.js';

export function registerLensTools(server: McpServer, sb: SupabaseClient, _lenserId?: string): void {
  registerLensList(server, sb);
  registerLensSearch(server, sb);
  registerLensGet(server, sb);
  registerLensCreate(server, sb);
  registerLensUpdate(server, sb);
  registerLensArchive(server, sb);
  registerLensDelete(server, sb);
  registerLensSetVisibility(server, sb);
  registerLensValidateParams(server, sb);
  registerLensExtractParams(server, sb);
  registerLensRun(server, sb);
  registerLensFindAndRun(server, sb);
  registerLensFork(server, sb);
  registerLensVersions(server, sb);
  registerLensGetVersion(server, sb);
}
