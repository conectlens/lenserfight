import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SupabaseClient } from '@supabase/supabase-js'

import { registerWorkflowCreate } from './workflow-create.js'
import { registerWorkflowDescribe } from './workflow-describe.js'
import { registerWorkflowDescribeNodeType } from './workflow-describe-node-type.js'
import { registerWorkflowGetGraph } from './workflow-get-graph.js'
import { registerWorkflowGet } from './workflow-get.js'
import { registerWorkflowList } from './workflow-list.js'
import { registerWorkflowListNodeTypes } from './workflow-list-node-types.js'
import { registerWorkflowRetry } from './workflow-retry.js'
import { registerWorkflowRunLogs } from './workflow-run-logs.js'
import { registerWorkflowRunStatus } from './workflow-run-status.js'
import { registerWorkflowRun } from './workflow-run.js'
import { registerWorkflowSummarize } from './workflow-summarize.js'
import { registerWorkflowValidate } from './workflow-validate.js'
import { registerWorkflowExport } from './workflow-export.js'

export function registerWorkflowTools(
  server: McpServer,
  sb: SupabaseClient,
  lenserId?: string,
  userId?: string
): void {
  registerWorkflowList(server, sb)
  registerWorkflowGet(server, sb)
  registerWorkflowGetGraph(server, sb)
  registerWorkflowDescribe(server, sb)
  registerWorkflowListNodeTypes(server, sb)
  registerWorkflowDescribeNodeType(server, sb)
  registerWorkflowCreate(server, sb, lenserId)
  registerWorkflowRun(server, sb)
  registerWorkflowRunStatus(server, sb)
  registerWorkflowRunLogs(server, sb)
  registerWorkflowRetry(server, sb)
  registerWorkflowSummarize(server, sb)
  registerWorkflowValidate(server, sb)
  registerWorkflowExport(server, sb, userId)
}
