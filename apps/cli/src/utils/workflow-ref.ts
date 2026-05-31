import { callRpc } from './api'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseWorkflowRef(ref: string): { kind: 'id' | 'slug'; value: string } {
  const stripped = ref.startsWith('@:') ? ref.slice(2) : ref.startsWith(':') ? ref.slice(1) : ref
  return UUID_RE.test(stripped) ? { kind: 'id', value: stripped } : { kind: 'slug', value: stripped }
}

export async function resolveWorkflowId(ref: string): Promise<string> {
  const { kind, value } = parseWorkflowRef(ref)
  if (kind === 'id') return value
  const result = await callRpc<{ id: string } | null>(
    'fn_get_workflow',
    { p_ref: value },
    { requireAuth: true },
  )
  if (!result?.id) throw new Error(`Workflow not found: "${ref}"`)
  return result.id
}
