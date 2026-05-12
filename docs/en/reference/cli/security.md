---
title: lf security
description: Database security audit commands.
---

<!-- AUTO-GEN-START -->

# `lf security`

Database security audit commands. Queries the Supabase backend for RLS coverage gaps and SECURITY DEFINER hygiene issues. Designed to gate CI pipelines: exits `1` when violations are found.

## `lf security rls-audit`

Audit Row Level Security (RLS) coverage and `SECURITY DEFINER` function hygiene. Prints a violation report and exits `1` if any issues are found.

| Flag | Type | Required | Default | Description |
|---|---|---|---|---|
| `--json` | boolean | no | `false` | Output raw JSON instead of formatted tables |

**Examples**

```bash
# Run the audit and print a human-readable report
lf security rls-audit

# Machine-readable output for CI pipelines
lf security rls-audit --json
```

**Successful output**

```
✔ All sensitive tables have RLS enabled.
✔ All SECURITY DEFINER functions have SET search_path configured.
✔ RLS audit PASSED.
```

**Failure output**

```
✖ 2 table(s) missing RLS:
schema  table
public  widgets
public  drafts

✖ 1 SECURITY DEFINER function(s) missing SET search_path:
schema  function          signature
public  fn_admin_helper   fn_admin_helper()

✖ RLS audit FAILED. Fix violations before deploying.
```

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Audit passed — no violations |
| `1` | Violations found |
| `2` | Script error (missing config, unreachable backend) |

**Errors**

| Error | Cause | Fix |
|---|---|---|
| `Unauthorized` | Not logged in | Run `lf auth login` |
| `RPC error fn_rls_unprotected_tables` | Migration not applied | Run `lf dev` and apply pending migrations |

<!-- AUTO-GEN-END -->

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | Supabase anon key |

## Related Commands

- [`lf admin`](admin.md) — platform administration commands
- [`lf doctor`](doctor.md) — environment health checks
- [Safety Gates concept](safety-gates.md) — broader platform safety model
