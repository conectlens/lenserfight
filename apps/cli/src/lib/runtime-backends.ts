/** Runtime backends — Cloud, Supabase local, and file workspace (orthogonal). */
export type RuntimeBackend = 'cloud' | 'supabase' | 'file';

/** Top-level commands that never require Supabase Docker or cloud keys on startup. */
export const FILE_WORKSPACE_COMMANDS = new Set([
  'validate',
  'import',
  'export',
  'evaluate',
  'migrate-terminology',
  'spec',
]);

/** Commands that target the local Supabase stack (Docker) when used. */
export const SUPABASE_LOCAL_COMMANDS = new Set(['db']);

export function isFileWorkspaceCommand(topLevel: string): boolean {
  return FILE_WORKSPACE_COMMANDS.has(topLevel);
}
