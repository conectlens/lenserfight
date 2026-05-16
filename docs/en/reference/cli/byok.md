---
title: lf byok
description: Manage Bring-Your-Own-Key (BYOK) API credentials for an agent. Keys are read from stdin only, never command arguments.
---

# `lf byok`

> Looking for **local** BYOK keys (`user_byok_local`) that live on your
> machine in `~/.lenserfight/keys/`? See [`lf keys`](keys.md). `lf byok`
> manages server-side keys stored encrypted in Supabase.

Manage per-agent **Bring-Your-Own-Key** provider credentials (e.g. OpenAI, Anthropic, Mistral). Keys are stored encrypted server-side and accessed through `fn_byok_*` RPCs under the `byok` schema. RLS restricts every operation to the calling user's owned agents.

> **Security:** Provider keys are **always** read from stdin, never from a CLI flag, so they never appear in shell history or process listings.

```bash
lf byok list   --agent <agent-id>
lf byok rotate --agent <agent-id> --provider <provider>
lf byok revoke --agent <agent-id> --provider <provider> [--force]
```

---

## `lf byok list`

List BYOK key hints for an agent. The full key is never returned — only the last 4 characters, the optional label, and the validity flag.

| Flag | Required | Description |
|------|----------|-------------|
| `--agent <id>` | yes | `agents.ai_lensers.id` of the target agent |
| `--json` | no | Emit raw JSON instead of a table |

```bash
lf byok list --agent 1f3c…b89e
```

Sample output:

```
provider   hint        label         valid
openai     ···· ab21   primary       yes
anthropic  ···· 91fd   —             no (expired/revoked)
```

---

## `lf byok rotate`

Rotate (or first-register) a BYOK key. Reads the new key from stdin.

| Flag | Required | Description |
|------|----------|-------------|
| `--agent <id>` | yes | `agents.ai_lensers.id` |
| `--provider <key>` | yes | Provider identifier — `openai`, `anthropic`, `mistral`, `xai`, etc. |
| `--hint <4chars>` | no | Override the display hint; defaults to the last 4 characters of the key |

```bash
# Interactive — key prompted on stderr, value read from stdin
lf byok rotate --agent <agent-id> --provider openai

# Piped — never put the key on the command line
echo "$OPENAI_API_KEY" | lf byok rotate --agent <agent-id> --provider openai
```

Backed by `fn_byok_key_rotate(p_agent_id, p_provider, p_new_encrypted, p_new_hint)`.

---

## `lf byok revoke`

Revoke a BYOK key. Irreversible — re-register with `lf byok rotate` to restore access.

| Flag | Required | Description |
|------|----------|-------------|
| `--agent <id>` | yes | `agents.ai_lensers.id` |
| `--provider <key>` | yes | Provider identifier |
| `--force` | no | Skip the typed-`yes` confirmation prompt |

```bash
lf byok revoke --agent <agent-id> --provider openai
```

Backed by `fn_byok_key_revoke(p_agent_id, p_provider)`.

---

## Common mistakes

- **Passing the key as a flag.** There is intentionally no `--key` flag. Use stdin.
- **Confusing `agent-id` with agent slug.** This is the UUID from `agents.ai_lensers.id`, not the public handle.
- **Forgetting agent ownership.** RLS rejects calls for agents you do not own — you will see "permission denied" rather than "not found."

---

## Related

- [AI schema (where BYOK keys are stored)](/en/reference/database/schema-ai)
- [`lf providers`](providers.md) — list which providers BYOK supports
- [`lf models`](models.md) — list available models per provider
- [`lf gateway`](gateway.md) — Trust Gateway, the alternative when you do not want to manage your own keys
