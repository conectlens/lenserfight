---
title: Audit Trail Examples
description: Concrete SQL and CLI patterns for inspecting the audit trail of a scheduled run, tool call, memory write, and approval decision.
---

# Audit Trail Examples

LenserFight records every significant agent action in append-only tables. This tutorial shows four concrete audit patterns — each with the SQL query, the matching CLI command, and the expected output shape.

---

## 1. Scheduled run audit

**What it shows:** The full node lifecycle for a scheduled workflow run — when each node started, what it produced, and the final run status.

**SQL:**

```sql
SELECT
  event_type,
  timestamp,
  payload->>'node_id'   AS node_id,
  payload->>'status'    AS status,
  payload->>'error'     AS error
FROM lenses.workflow_run_events
WHERE run_id = '<run-id>'
ORDER BY event_id ASC;
```

**Expected output (abbreviated):**

```
event_type         | timestamp                  | node_id   | status    | error
-------------------+----------------------------+-----------+-----------+-------
run.started        | 2026-05-09 08:00:45+00     |           |           |
node.started       | 2026-05-09 08:00:46+00     | node-abc  |           |
node.completed     | 2026-05-09 08:01:02+00     | node-abc  | completed |
node.started       | 2026-05-09 08:01:03+00     | node-def  |           |
node.completed     | 2026-05-09 08:01:18+00     | node-def  | completed |
run.completed      | 2026-05-09 08:01:18+00     |           | completed |
```

**CLI equivalent:**

```bash
lf run inspect <run-id> --events
```

---

## 2. Tool call audit

**What it shows:** The full invocation record for a write-class tool call — including who approved it, when, and the input/output payload.

**SQL:**

```sql
SELECT
  invocation_id,
  tool_name,
  egress_class,
  approval_status,
  approved_by,
  approved_at,
  rejection_reason,
  input_payload,
  output_payload,
  error_message,
  created_at
FROM platform.tool_invocation_logs
WHERE run_id = '<run-id>'
ORDER BY created_at ASC;
```

**Expected output (abbreviated):**

```
invocation_id | tool_name       | egress_class | approval_status | approved_by     | approved_at
--------------+-----------------+--------------+-----------------+-----------------+---------------------
<uuid>        | send_email      | write        | approved        | lenser-abc      | 2026-05-09 08:00:52
<uuid>        | write_crm_note  | write        | rejected        |                 |
```

**CLI equivalent:**

```bash
lf tool-invocations list --run <run-id>
lf tool-invocations inspect <invocation-id>
```

---

## 3. Memory write audit

**What it shows:** Every memory entry written during a successful run — scope, source, confidence, and when it was written.

**SQL:**

```sql
-- Memory entries written by a specific run
SELECT
  e.id,
  e.scope,
  e.source,
  left(e.content, 80) AS content_preview,
  e.confidence,
  e.created_at
FROM agents.memories e
WHERE e.source = '<run-id>'
ORDER BY e.created_at ASC;
```

```sql
-- Memory access log (reads + writes) for a profile
SELECT
  access_type,
  accessed_by_run_id,
  entry_id,
  accessed_at
FROM agents.memory_access_logs
WHERE profile_id = '<profile-id>'
ORDER BY accessed_at DESC
LIMIT 20;
```

**CLI equivalent:**

```bash
lf memory list-entries --source <run-id>
```

**Note:** Memory entries are written only on **successful** run completion. If the run failed, no entries from that run appear in `agents.memories`. The buffered writes are discarded.

---

## 4. Approval decision audit

**What it shows:** The human decision record for a run-level approval — who decided, when, what reason was given, and any input modifications.

**SQL:**

```sql
SELECT
  event_type,
  timestamp,
  payload->>'decision_by_lenser_id'    AS decided_by,
  payload->>'decision_at'              AS decided_at,
  payload->>'decision_reason'          AS reason,
  payload->>'decision_modifications'   AS modifications
FROM agents.agent_run_events
WHERE run_id = '<run-id>'
  AND event_type IN ('approval_decided', 'approval_rejected', 'approval_modified_and_approved')
ORDER BY timestamp ASC;
```

**Expected output:**

```
event_type          | decided_by   | decided_at              | reason              | modifications
--------------------+--------------+-------------------------+---------------------+---------------
approval_decided    | lenser-abc   | 2026-05-09 08:00:45+00  |                     |
```

For a rejection:

```
event_type          | decided_by   | decided_at              | reason
--------------------+--------------+-------------------------+------------------------------
approval_rejected   | lenser-abc   | 2026-05-09 08:00:45+00  | Holiday — skip today
```

For a modify-and-approve:

```
event_type                         | decided_by   | modifications
-----------------------------------+--------------+-------------------------------
approval_modified_and_approved     | lenser-abc   | {"inputs":{"topic":"revised"}}
```

**CLI equivalent:**

```bash
lf approval history <approval-id>
```

---

## Combining all four

To get a complete picture of one scheduled run — from dispatch through approval to tool calls and memory:

```sql
-- 1. Run timeline
SELECT event_type, timestamp FROM lenses.workflow_run_events
WHERE run_id = '<run-id>' ORDER BY event_id;

-- 2. Approval decisions
SELECT event_type, payload FROM agents.agent_run_events
WHERE run_id = '<run-id>' AND event_type LIKE 'approval%';

-- 3. Tool calls
SELECT tool_name, approval_status, approved_at FROM platform.tool_invocation_logs
WHERE run_id = '<run-id>';

-- 4. Memory writes
SELECT scope, content, confidence FROM agents.memories
WHERE source = '<run-id>';
```

---

## Related

- [Agent Boundaries](/explanation/agents/agent-boundaries) — what gates produce these records
- [Approvals Reference](/connected-lenses/approvals) — decision walkthrough
- [Tools Reference](/connected-lenses/tools) — egress classes and invocation flow
- [Memory Reference](/connected-lenses/memory-per-agent) — profiles, entries, and access logs
