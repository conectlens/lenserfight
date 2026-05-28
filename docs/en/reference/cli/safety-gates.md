# Safety Gates

Destructive CLI commands display an **impact summary** and require explicit confirmation before any mutations occur. The confirmation method depends on the command's risk level.

---

## Confirmation policies

| Policy | Interactive TTY | CI / non-interactive |
|--------|----------------|---------------------|
| `FLAG` | Must re-run with the force flag | Must pass the force flag |
| `TYPED` | Must type an exact phrase at the prompt | Must pass `--force` |
| `COUNTDOWN` | 5-second countdown — Ctrl-C to abort | Must pass `--force` |
| `NONE` | Proceeds silently (audit entry only) | Proceeds silently |

**`FLAG`** is the most common policy. The CLI prints a full impact summary then exits 1 with a hint like "Re-run with `--force` to confirm." Passing the flag on the same invocation is the only way to proceed — interactive terminals do not get a yes/no prompt.

**`TYPED`** is used for CRITICAL operations. The CLI prompts you to type a specific phrase (shown in the impact summary). Typos abort. Pass `--force` to skip in CI.

**`COUNTDOWN`** is used for admin overrides where a 5-second window to change your mind is appropriate (e.g. `force-transition`). Ctrl-C cancels. Pass `--force` to skip in CI.

---

## Risk levels

| Level | Color | Typical use |
|-------|-------|-------------|
| `LOW` | Blue | Informational / audited-only |
| `MEDIUM` | Yellow | Cancellations, deletions of recoverable state |
| `HIGH` | Red | Irreversible deletes, credential revocations, kill switches |
| `CRITICAL` | Red background | System-wide halts, full local reset |

---

## Affected commands

| Command | Risk | Policy | Flag | Reversible |
|---------|------|--------|------|-----------|
| `lf reset` | CRITICAL | TYPED (`RESET`) | `--force` | No |
| `lf kill-switch platform on --scope system` | CRITICAL | TYPED (`PLATFORM DOWN`) | `--force` | Yes |
| `lf battle delete` | HIGH | FLAG | `--confirm` | No |
| `lf battle byok-key revoke` | HIGH | FLAG | `--force` | No |
| `lf battle force-transition` | HIGH | COUNTDOWN (5s) | `--force` | Partial |
| `lf communities delete` | HIGH | FLAG | `--confirm` | No |
| `lf kill-switch on` | HIGH | FLAG | `--confirm` | Yes |
| `lf kill-switch platform on` (scoped) | HIGH | FLAG | `--force` | Yes |
| `lf execution cancel` | MEDIUM | FLAG | `--force` | Partial |
| `lf schedule delete` | MEDIUM | FLAG | `--force` | No |

---

## CI usage

In any CI environment (detected via `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILDKITE`, `DRONE`, `CODEBUILD_BUILD_ID`, `TF_BUILD`, `CIRCLECI`, `TRAVIS`, `JENKINS_URL`), destructive commands block unless the force flag is supplied:

```bash
# CI-safe invocations
lf reset --force
lf schedule delete <id> --force
lf execution cancel <run> --force
lf kill-switch platform on --scope battle --target <id> --reason "…" --force
```

Non-interactive shells (no TTY) are treated the same as CI regardless of environment variables.

---

## Audit log

Every safety gate check — whether confirmed or aborted — appends one JSONL line to `~/.lenserfight/audit.log`:

```json
{"ts":"2026-05-09T14:23:01.000Z","risk":"HIGH","reversibility":"IRREVERSIBLE","env":"remote","confirmed":true,"description":"Permanently delete battle abc123 (creator only).","resources":[{"type":"battle","name":"abc123","scope":"remote"}]}
```

Fields: `ts`, `risk`, `reversibility`, `env`, `confirmed`, `description`, `resources`.

The file is append-only and never rotated automatically. Write failures are silent — audit logging never blocks the operation.

---

## Auth auto-recovery

When a command fails authentication (no stored token or a 401 response), the CLI attempts recovery before surfacing an error:

1. **Silent token refresh** — uses the stored refresh token. Transparent when it works.
2. **Browser device-login** — auto-opens your browser, displays an approval code, and resumes the original command once approved. Interactive TTY only.
3. **CI / non-interactive fallback** — prints `Set LF_API_KEY or run \`lf auth login\`` and exits.

In headless environments, set `LF_API_KEY` (or `LENSERFIGHT_API_KEY`) to a developer token to avoid interactive auth entirely.

---

## See also

- [Auth Commands](auth.md) — `lf auth login`, token management
- [Global Flags](global-flags.md) — `--local`, `--debug`
- [Kill Switch](kill-switch.md) — per-agent and platform-wide kill switches
- [lf reset](reset.md) — full local reset
