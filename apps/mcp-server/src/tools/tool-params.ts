import { z } from 'zod';
import { zUuid } from '../types.js';

/** Reusable Zod fields with JSON Schema descriptions for MCP inputSchema. */
export const p = {
  lens_id: zUuid.describe('UUID of the lens to read or modify.'),
  lens_version_id: zUuid.describe('UUID of a specific lens version; omit to use the head version.'),
  workflow_id: zUuid.describe('UUID of the workflow definition to run or inspect.'),
  workflow_run_id: zUuid.describe('UUID of a workflow execution run returned by run_workflow.'),
  battle_id: zUuid.describe('UUID of the battle to read or modify.'),
  ai_lenser_id: zUuid.describe('UUID of the AI Lenser (autonomous agent) profile.'),
  owner_lenser_id: zUuid.describe('UUID of the human lenser who owns the resource; defaults to the authenticated user when omitted.'),
  lenser_id: zUuid.describe('UUID of the human lenser profile; defaults to the authenticated user when omitted.'),
  team_run_id: zUuid.describe('UUID of an agent team run returned by start_agent_team_run.'),
  tool_id: zUuid.describe('UUID of a tool definition in the agent tool registry.'),
  query: z.string().min(1).describe('Natural-language search query describing what the user wants to accomplish.'),
  confirm: z
    .boolean()
    .describe('Must be true for destructive or irreversible operations; prevents accidental calls.'),
} as const;
