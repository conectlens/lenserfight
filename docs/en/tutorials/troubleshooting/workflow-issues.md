---
title: Workflow Issues
description: Diagnose and fix workflow execution failures, canvas rendering bugs, and WebSocket issues.
head:
  - - meta
    - name: og:title
      content: Workflow Issues — LenserFight Troubleshooting
  - - meta
    - name: og:description
      content: Fix workflow execution failures, canvas rendering bugs, and real-time streaming issues.
---

# Workflow Issues

Diagnosis and resolution guide for workflow execution, canvas rendering, and real-time streaming problems.

---

## Workflow execution failures

### Symptoms
- Node stays in `running` state indefinitely
- Node shows `failed` status
- Workflow completes but output is empty

### Root cause
Provider timeouts, invalid prompts, or missing parameters.

### Diagnosis
1. Click the failed node to see the error message
2. Check the Run Log panel for detailed events
3. Via CLI:
   ```bash
   lf execution inspect <run-id>
   ```

### Fixes

| Error | Fix |
|-------|-----|
| `Missing parameter: [[topic]]` | Provide the root input before running |
| `Model timeout` | Increase timeout in node settings; check provider status |
| `Provider error: 429` | Rate limited; wait and retry |
| `Provider error: 401` | Check API key for the assigned agent |
| `Upstream node failed` | Fix the upstream node first |
| `Cycle detected` | Remove the edge creating a loop |

### Prevention
- Use **dry run** to validate before execution
- Set reasonable timeouts (60–120s for complex prompts)
- Configure retries (1–2) for transient errors

---

## Canvas rendering bugs

### Symptoms
- Canvas is blank or shows a white screen
- Nodes do not appear after adding
- Edges disconnect visually but data is correct
- Pan/zoom is jumpy or unresponsive

### Root cause
React Flow rendering issues, stale state, or CSS conflicts.

### Diagnosis
1. Open browser DevTools → Console for errors
2. Check for React errors (red error boundaries)
3. Verify the workflow data loads in the Network tab

### Fixes
1. **Refresh the page** — stale React Flow state is the most common cause
2. **Clear browser cache:**
   ```
   DevTools → Application → Clear site data
   ```
3. **Reset canvas view:**
   - Press `Ctrl/Cmd + Shift + F` (fit to view)
   - If nodes are off-screen, this brings them back
4. **Disable browser extensions** — ad blockers and privacy extensions can interfere with canvas rendering

### Prevention
- Use the latest browser version (Chrome, Firefox, Edge)
- Avoid opening workflows with >100 nodes (performance degrades)

---

## WebSocket / real-time issues

### Symptoms
- Execution status does not update in real time
- Node status badges are stale
- "Connection lost" banner appears

### Root cause
WebSocket connection to Supabase Realtime dropped or blocked.

### Diagnosis
1. Open DevTools → Network → WS tab
2. Look for WebSocket connections to `realtime-*`
3. Check for connection close frames

### Fixes
1. **Refresh the page** to re-establish the WebSocket
2. **Check Supabase Realtime:**
   ```bash
   pnpm supabase status
   # Realtime should show "running"
   ```
3. **Check firewall/proxy** — WebSocket connections must be allowed on port 54321 (local) or 443 (production)
4. **Disable VPN** — some VPNs block WebSocket upgrade requests

### Prevention
- The Supabase client auto-reconnects; avoid manually closing channels
- Use `supabase.channel(...).subscribe()` for subscriptions (includes reconnect logic)

---

## API rate limits

### Symptoms
- `429 Too Many Requests` from the platform API
- Workflows queue but do not execute
- Error: `Rate limit exceeded`

### Root cause
Too many concurrent requests to the platform API or AI provider.

### Diagnosis
1. Check the `Retry-After` header in the response
2. Review execution logs for rate limit events
3. Check provider dashboard for usage spikes

### Fixes
1. **Wait and retry** — respect the `Retry-After` header
2. **Reduce concurrency** — run fewer parallel workflows
3. **Upgrade provider tier** — higher rate limits with paid plans
4. **Set per-agent rate limits:**
   ```bash
   lf lenser update <id> --rate-limit 30  # max 30 runs/hour
   ```

### Prevention
- Configure automatic retry with exponential backoff
- Set budget and rate limits on agents before production use
- Use queuing for batch workloads

---

## Edge case: empty outputs

### Symptoms
- Workflow completes successfully but output is empty string
- Result panel shows `null` or `undefined`

### Root cause
Model returned an empty response, or output mapping is misconfigured.

### Diagnosis
1. Check the raw model response in the execution details
2. Verify the edge mapping: source output key → target parameter name
3. Check if the prompt is too vague or contradictory

### Fixes
1. **Check the model response** — if genuinely empty, improve the prompt
2. **Verify edge mapping** — ensure `output` key matches (case-sensitive)
3. **Add a minimum output instruction** to the prompt:
   ```
   Always provide at least one sentence as output, even if the input is unclear.
   ```

---

## Next steps

- [Build Failures](/en/tutorials/troubleshooting/build-failures)
- [Auth Issues](/en/tutorials/troubleshooting/auth-issues)
- [Database Issues](/en/tutorials/troubleshooting/database-issues)
