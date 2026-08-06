import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { registerAgentList } from './agent-list.js';
import { registerAgentGet } from './agent-get.js';
import { registerAgentCreate } from './agent-create.js';
import { registerAgentUpdate } from './agent-update.js';
import { registerAgentArchive } from './agent-archive.js';
import { registerAgentListTools } from './agent-list-tools.js';
import { registerAgentListToolCatalog } from './agent-list-tool-catalog.js';
import { registerAgentAssignTool } from './agent-assign-tool.js';
import { registerAgentRevokeTool } from './agent-revoke-tool.js';
import { registerAgentRunAction } from './agent-run-action.js';
import { registerAgentStartTeamRun } from './agent-start-team-run.js';
import { registerAgentCancelRun } from './agent-cancel-run.js';
import { registerAgentListRunEvents } from './agent-list-run-events.js';
import { registerAgentExport } from './agent-export.js';

export function registerAgentTools(
  server: McpServer,
  sb: SupabaseClient,
  lenserId?: string,
  userId?: string
): void {
  registerAgentList(server, sb, lenserId);
  registerAgentGet(server, sb);
  registerAgentCreate(server, sb, lenserId);
  registerAgentUpdate(server, sb);
  registerAgentArchive(server, sb);
  registerAgentListTools(server, sb);
  registerAgentListToolCatalog(server, sb, lenserId);
  registerAgentAssignTool(server, sb);
  registerAgentRevokeTool(server, sb);
  registerAgentRunAction(server, sb);
  registerAgentStartTeamRun(server, sb);
  registerAgentCancelRun(server, sb);
  registerAgentListRunEvents(server, sb);
  registerAgentExport(server, sb, userId);
}
