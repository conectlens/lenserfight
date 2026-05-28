import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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
import { registerLensFork } from './lens-fork.js';
import { registerLensVersions } from './lens-versions.js';
import { registerLensGetVersion } from './lens-get-version.js';

export function registerLensTools(server: McpServer): void {
  registerLensList(server);
  registerLensSearch(server);
  registerLensGet(server);
  registerLensCreate(server);
  registerLensUpdate(server);
  registerLensArchive(server);
  registerLensDelete(server);
  registerLensSetVisibility(server);
  registerLensValidateParams(server);
  registerLensExtractParams(server);
  registerLensRun(server);
  registerLensFork(server);
  registerLensVersions(server);
  registerLensGetVersion(server);
}
