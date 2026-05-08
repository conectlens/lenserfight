---
title: lf status
description: Show auth state, environment health, and developer journey progress in one view.
---

# lf status

```
lf status [--json]
```

Prints a summary of your current authentication state, environment configuration, and developer journey progress. Reads journey state from the API when authenticated.

---

## Output

```
LenserFight Status
──────────────────────────────────────
Auth          ✓ authenticated (@your_handle)
Environment   ✓  Node 22.x · Supabase CLI 1.x · Docker running
API           https://api.lenserfight.com

Journey
  ✓  lens created
  ✗  workflow created          not yet
  ✗  agent created             not yet
  ✗  team created              not yet
  ✗  battle created            not yet
  ✗  battle joined             not yet
  ✗  invite sent               not yet
  ✗  battle result shared      not yet
  ✗  profile published         not yet

  Progress: 1 / 9 steps done

  Next action: lf workflow create --template single-agent
──────────────────────────────────────
```

---

## Rows explained

| Row | Description |
|---|---|
| **Auth** | `authenticated` if a valid session or token is stored; `not authenticated` otherwise |
| **Environment** | Node version, Supabase CLI, Docker status (local mode only) |
| **API** | Configured cloud API URL |
| **Env setup** | Status of the last `lf setup --mode local/cloud` run |
| **Journey** | Per-step completion state from `fn_journey_state_get`; `unavailable` if API not reachable |
| **Next action** | Suggested CLI command for the first incomplete required step |

---

## Options

| Flag | Description |
|---|---|
| `--json` | Emit full structured JSON including all config values |
| `--journey` | *(reserved — journey is always shown when authenticated)* |

---

## JSON output

```json
{
  "projectConfigPresent": true,
  "mode": "cloud",
  "supabaseUrl": "https://xxx.supabase.co",
  "cloudApiUrl": "https://api.lenserfight.com",
  "supabaseAnonKeyPresent": true,
  "serviceRoleKeyPresent": false,
  "authStatus": "authenticated",
  "developerTokenStatus": "set (expires 2026-08-01)",
  "onboarding": { "status": "complete", "mode": "cloud", "updatedAt": "2026-05-09T..." },
  "defaultStorageAdapter": null,
  "ollamaBaseUrl": null,
  "journey": {
    "progress": { "done": 2, "total": 9 },
    "steps": {
      "lens_created": true,
      "workflow_created": true,
      "agent_created": false,
      "team_created": false,
      "battle_created": false,
      "battle_joined": false,
      "invite_sent": false,
      "battle_result_shared": false,
      "profile_published": false
    }
  }
}
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Journey shows `unavailable` | Run `lf doctor --check journey` to diagnose |
| Auth shows `not authenticated` | `lf auth login` |
| Environment warns about Docker | `lf setup --mode local` |

---

## Related

- [lf setup](/reference/cli/setup)
- [lf doctor](/reference/cli/index)
- [lf auth](/reference/cli/auth)
- [Developer Onboarding](/tutorials/getting-started/developer-onboarding)
