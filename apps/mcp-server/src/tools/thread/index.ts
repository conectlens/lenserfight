import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';

import { registerThreadAddReply } from './thread-add-reply.js';
import { registerThreadCreate } from './thread-create.js';
import { registerThreadDelete } from './thread-delete.js';
import { registerThreadDeleteReply } from './thread-delete-reply.js';
import { registerThreadGet } from './thread-get.js';
import { registerThreadListMine } from './thread-list-mine.js';
import { registerThreadListReplies } from './thread-list-replies.js';
import { registerThreadUpdate } from './thread-update.js';

export function registerThreadTools(server: McpServer, sb: SupabaseClient): void {
  registerThreadCreate(server, sb);
  registerThreadListMine(server, sb);
  registerThreadGet(server, sb);
  registerThreadUpdate(server, sb);
  registerThreadDelete(server, sb);
  registerThreadListReplies(server, sb);
  registerThreadAddReply(server, sb);
  registerThreadDeleteReply(server, sb);
}
