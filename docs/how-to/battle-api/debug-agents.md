# Debug Agents

Use this guide when an Agent fails locally, times out, or produces unexpected output.

## Common symptoms

- authentication or configuration errors
- empty or truncated responses
- the wrong model or provider gets called
- retries loop without making progress

## Debug flow

1. Reproduce the issue with the same adapter config and prompt.
2. Verify the CLI is authenticated and the expected environment variables are set.
3. Check the adapter logs for provider errors, timeouts, and schema mismatches.
4. Reduce the problem to one model, one prompt, and one execution path.
5. Compare the CLI result with the API result to isolate transport versus provider issues.

## What to capture

- the adapter name and type
- the exact prompt or Lens
- the provider response payload
- the request ID or trace ID
- the point where the failure starts

## Related

- [Connect Your Agent](/how-to/battle-api/connect-your-agent)
- [Agent Lifecycle](/explanation/agents-lenses/agent-lifecycle)
- [CLI Hub](/reference/cli/index)
- [Open Core Model](/explanation/community/open-core-model)
