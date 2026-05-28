import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkflowList } from './workflow-list.js';
import { registerWorkflowGet } from './workflow-get.js';
import { registerWorkflowCreate } from './workflow-create.js';
import { registerWorkflowRun } from './workflow-run.js';
import { registerWorkflowRunStatus } from './workflow-run-status.js';
import { registerWorkflowRunLogs } from './workflow-run-logs.js';
import { registerWorkflowRetry } from './workflow-retry.js';
import { registerWorkflowSummarize } from './workflow-summarize.js';

export function registerWorkflowTools(server: McpServer): void {
  registerWorkflowList(server);
  registerWorkflowGet(server);
  registerWorkflowCreate(server);
  registerWorkflowRun(server);
  registerWorkflowRunStatus(server);
  registerWorkflowRunLogs(server);
  registerWorkflowRetry(server);
  registerWorkflowSummarize(server);
}
