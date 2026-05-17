---
title: lf doctor
description: Validate environment health for local and cloud LenserFight flows.
---

# `lf doctor`

Point-in-time environment health checks. Validates Node.js version, auth token, API reachability, BYOK key availability, Ollama connectivity, Docker presence (local mode), and journey RPC state.

```bash
lf doctor                      # core checks (node, config, auth, API)
lf doctor --check byok         # which AI provider keys are available
lf doctor --check ollama       # Ollama server reachability
lf doctor --check auth         # token validity and user info
lf doctor --check journey      # fn_journey_state_get RPC availability
lf doctor --mode local         # add Supabase CLI + Docker to core checks
lf doctor --json               # structured JSON output
```

---

## Checks

| Check id | When it runs | Pass condition |
|---|---|---|
| `node` | Always | Node.js version is supported |
| `supabase_cli` | `--mode local` | Supabase CLI binary found |
| `docker` | `--mode local` | Docker daemon is running |
| `project_config` | Always | `.lenserfight.json` exists in working dir |
| `onboarding` | Always | Onboarding state is `complete` |
| `auth` | Always / `--check auth` | Stored token is valid; user email readable |
| `cloud_api` | Always / `--check api` | `{cloudApiUrl}/health` returns 2xx |
| `journey_state` | `--check journey` | `fn_journey_state_get` RPC succeeds |
| `ollama` | `--check ollama` | Ollama server responds at configured URL |
| `byok_*` | `--check byok` | Provider key found in environment |

---

## Options

| Flag | Type | Description |
|---|---|---|
| `--mode` | string | `local` or `cloud`. Defaults to project config mode. |
| `--check` | string | Extra targeted check: `api`, `byok`, `ollama`, `auth`, `journey` |
| `--json` | boolean | Emit structured JSON result array |

---

## JSON output

```json
{
  "mode": "cloud",
  "status": "passed",
  "checks": [
    { "id": "node",          "status": "pass", "detail": "v24.14.0" },
    { "id": "project_config","status": "pass", "detail": ".lenserfight.json present (mode=cloud)" },
    { "id": "auth",          "status": "pass", "detail": "Token valid — you@example.com" },
    { "id": "cloud_api",     "status": "pass", "detail": "https://api.lenserfight.com healthy" }
  ]
}
```

Failing checks include a `code` field with a typed error code for programmatic consumption:

```json
{ "id": "node", "status": "fail", "detail": "v16.0.0 (requires >= 20)", "code": "NODE_VERSION_UNSUPPORTED" }
```

Available error codes: `AUTH_NOT_CONFIGURED`, `API_UNREACHABLE`, `CONFIG_MISSING`, `NODE_VERSION_UNSUPPORTED`, `DOCKER_NOT_RUNNING`, `SUPABASE_CLI_MISSING`, `OLLAMA_UNREACHABLE`, `JOURNEY_RPC_UNAVAILABLE`.

`status` is `passed` unless any check has `status: "fail"`.

---

## Troubleshooting quick-ref

| Symptom | Command |
|---|---|
| Auth fails | `lf auth login` |
| Cloud API unreachable | Check `LF_CLOUD_API_URL` or run `lf setup --mode cloud` |
| Ollama not found | `ollama serve`, then `lf doctor --check ollama` |
| No BYOK keys detected | Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or equivalent |
| Docker not running (local mode) | Start Docker, then `lf doctor --mode local` |
| Journey RPC fails | Migration may not be applied — `lf dev` then retry |

---

## Related

- [`lf top`](/en/reference/cli/top) — live telemetry with continuous service status (Ollama, Supabase, Docker)
- [`lf status`](/en/reference/cli/status) — auth, config, and journey progress snapshot
- [`lf setup`](/en/reference/cli/setup) — guided environment setup
- [Developer Onboarding](/en/tutorials/getting-started/developer-onboarding)

<!-- AUTO-GEN-START -->

# `lf doctor`

Validate environment health for local and cloud LenserFight flows.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--mode` | string | no | Check mode: local or cloud |
| `--json` | boolean | no | Emit structured JSON |
| `--check` | string | no | Run an additional targeted check: api, byok, ollama, auth, journey |

<!-- AUTO-GEN-END -->
