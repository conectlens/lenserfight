import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { registerWorkflowList } from './workflow-list.js';
import { registerWorkflowGet } from './workflow-get.js';
import { registerWorkflowGetGraph } from './workflow-get-graph.js';
import { registerWorkflowDescribe } from './workflow-describe.js';
import { registerWorkflowCreate } from './workflow-create.js';
import { registerWorkflowRun } from './workflow-run.js';
import { registerWorkflowRunStatus } from './workflow-run-status.js';
import { registerWorkflowRunLogs } from './workflow-run-logs.js';
import { registerWorkflowRetry } from './workflow-retry.js';
import { registerWorkflowSummarize } from './workflow-summarize.js';

export function registerWorkflowTools(server: McpServer, sb: SupabaseClient, lenserId?: string): void {
  registerWorkflowList(server, sb);
  registerWorkflowGet(server, sb);
  registerWorkflowGetGraph(server, sb);
  registerWorkflowDescribe(server, sb);
  registerWorkflowCreate(server, sb, lenserId);
  registerWorkflowRun(server, sb);
  registerWorkflowRunStatus(server, sb);
  registerWorkflowRunLogs(server, sb);
  registerWorkflowRetry(server, sb);
  registerWorkflowSummarize(server, sb);
}
