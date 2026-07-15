---
title: Workflow Safety
description: How LenserFight keeps workflow execution safe — the worker privilege boundary, injection-safe parametric prompts, idempotency and rate limits, budgets, moderation, human approvals, and failure recovery.
---

# Workflow Safety

Workflows run untrusted prompts, call external providers, spend credits, and can be triggered by webhooks and schedules. This page explains the layers that keep that safe. The guiding principle is **RLS-first**: every table enforces row-level security, and privileged work happens only behind narrowly-scoped functions.

## The worker privilege boundary

Execution is split between two roles:

- **Clients** (`authenticated` / `anon`) — the web app, CLI, and MCP server. They author and start workflows through RPCs gated by row-level security.
- **The worker** (`service_role`) — the only role that claims runs, decrypts provider keys, reads raw lens bodies, and writes node results.

The functions that do that privileged work are `SECURITY DEFINER` and run with elevated rights, so they are granted **only** to `service_role` — never to `anon` or `authenticated`. A client cannot decrypt a stored key, claim another tenant's run, or read a private lens body by calling a worker function directly. This boundary is verified by a standing test so a newly added worker function cannot regress it.

## Injection-safe parametric prompts

Parameters use double-square-bracket tokens — `[[label]]`, `[[label!]]` for optional, `[[label:type]]` for typed — rather than the `{{ … }}` syntax used by common template engines.

::: v-pre
The choice is deliberate: a user's prompt body frequently *contains* literal `{{ … }}` (Jinja, Handlebars, Mustache examples). Binding on `[[ … ]]` means user content can never collide with the parameter engine, and input sanitisation actively strips `{{ … }}` sequences from supplied values so they cannot smuggle template control into a downstream renderer.
:::

Two further guards protect the rendered prompt:

- **Strict unbound detection** — after substitution, a leftover required placeholder aborts the node instead of sending a half-filled prompt to a model.
- **No internal ids leak** — stored-form `[[:uuid]]` references (the persisted representation of a parameter) are stripped before a prompt reaches a provider, so an internal id can never appear in model input.

## Idempotency and rate limits

- **Idempotency** — starting a run accepts an idempotency key derived from the workflow and its inputs. Within the key's TTL window, a repeated submit resolves to the same run instead of creating a duplicate, so a retried webhook or double-click does not fan out into parallel executions.
- **Rate limiting** — run creation is capped per lenser over a short rolling window, bounding accidental or abusive bursts.
- **Concurrency** — schedules honour a `max_concurrent` policy so a slow workflow cannot stack unbounded overlapping runs.

## Budgets and cost control

Every run carries a credit budget. The scheduler checks spend against the budget before each wave of nodes and halts scheduling when a run would exceed it, so a runaway loop or an expensive model cannot silently drain an account. Scheduled dispatch additionally enforces per-agent spending limits and a system-wide kill switch / queue freeze.

## Moderation gateway

AI nodes pass through moderation on both sides: inputs are screened before a provider call, and outputs are screened before they become available to downstream nodes. A blocked node is tagged (`moderation_blocked`) rather than silently dropped, so the run record explains why a branch stopped.

## Human-in-the-loop approvals

Schedules and sensitive nodes can require an approval before they proceed. An approval policy pauses the run at a checkpoint and records who approved it, which keeps a human in control of high-impact or irreversible actions without disabling automation entirely.

## Failure policies and recovery

Reliability is layered so a transient fault does not lose or duplicate work:

- **Per-node** — configurable retries with backoff, timeouts, and a parent-failure policy (`skip`, `propagate`, or `substitute_default`).
- **Per-run** — a heartbeat marks a run as actively owned by a worker; a recovery loop reclaims only runs whose heartbeat has gone stale, so an in-flight run is never stolen.
- **Dead letters** — exhausted failures land in a dead-letter record for inspection instead of vanishing.

## Visibility and export redaction

Reading a workflow's graph (see [Export a Workflow](../../how-to/workflows/export-a-workflow.md)) is visibility-gated to public or owned workflows, and returns configuration **references** — never decrypted keys. Webhook secrets and integration credentials live outside the node graph and are omitted from exports.

## Related

- [Workflow Concepts](./workflow-concepts.md)
- [Export a Workflow](../../how-to/workflows/export-a-workflow.md)
- [Open Source Workflows](./open-source-workflows.md)
