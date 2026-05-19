const ERROR_COPY: Record<string, string> = {
  provider_timeout:
    'The AI provider timed out. Retrying usually resolves this.',
  schema_validation_failed:
    "Output format didn't match what the next node expected. Check the node configuration.",
  rate_limit:
    'Provider rate limit reached. Wait a moment, then retry.',
  dependency_failed:
    'An upstream node failed before this node could start.',
  max_retries_exceeded:
    'This node failed after multiple attempts. Try a different model or check the inputs.',
  upstream_failure:
    'This node was skipped because an upstream node failed.',
  input_contract_violation:
    'Input validation failed — check this node\'s configuration.',
  output_contract_violation:
    'Output failed contract validation.',
  placeholder_unbound:
    'A template variable is unbound — set a static value in the node config or wire it from an upstream output.',
  moderation_blocked:
    'Content was blocked by the moderation policy.',
  template_resolution_failed:
    'Could not load the lens template.',
}

export function getErrorCopy(raw: string | null | undefined): string {
  if (!raw) return ''
  const known = ERROR_COPY[raw]
  if (known) return known
  if (raw.startsWith('template_resolution_failed: ')) {
    return raw.slice('template_resolution_failed: '.length)
  }
  return raw
}
