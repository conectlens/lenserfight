import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';

import { registerThreadCreate } from './thread-create.js';
import { registerThreadDelete } from './thread-delete.js';
import { registerThreadGet } from './thread-get.js';
import { registerThreadListMine } from './thread-list-mine.js';
import { registerThreadUpdate } from './thread-update.js';

export function registerThreadTools(server: McpServer, sb: SupabaseClient): void {
  registerThreadCreate(server, sb);
  registerThreadListMine(server, sb);
  registerThreadGet(server, sb);
  registerThreadUpdate(server, sb);
  registerThreadDelete(server, sb);
}
