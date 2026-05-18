# LenserFight CLI

The `lenserfight` CLI, also available as `lf`, is the command hub for onboarding, lens authoring, runners, battles, invites, and platform operations.

> **Interactive TUI:** Running `lf` with no subcommand opens the interactive **TUI Dashboard** (`apps/cli/src/tui/dashboard.ts`). It is the recommended starting point for exploration. Pass `--help` to skip the TUI and print top-level help instead.

## Start here

- [Developer Onboarding](/en/tutorials/getting-started/developer-onboarding) ← zero to first battle
- [Installation](/en/tutorials/getting-started/installation)
- [Quickstart](/en/tutorials/getting-started/quickstart)
- [Local Database Setup](/en/reference/database/local-setup)
- [Run Commands](/en/reference/cli/run)

## Global flags

| Flag | Description |
|------|-------------|
| `--local` | Force project config to `local` mode for this invocation (also via `LF_LOCAL=1`) |
| `--debug` | Verbose debug diagnostics on stderr (also via `LF_DEBUG=1`) |
| `--help`  | Print help for the current command or subcommand |
| `--version` | Print the CLI version |

See [global flags](global-flags.md) for full details on precedence and environment fallbacks.

---

## Command reference

### Onboarding and environment

| Command | Description |
|---------|-------------|
| `lf setup` | Journey checklist (default) or env setup (`--mode local/cloud`) |
| `lf setup --interactive` | Guided next-step prompt |
| `lf status` | Auth, environment, and journey state |
| `lf doctor` | Point-in-time environment and auth health checks |
| `lf doctor --check auth` | Token validity |
| `lf doctor --check api` | API reachability |
| `lf doctor --check journey` | Journey RPC availability |
| `lf doctor --check ollama` | Ollama server reachability |
| `lf doctor --check byok` | Which AI provider keys are configured |
| `lf init` | Initialise a local project config |
| `lf dev` | Start local services |
| `lf seed` | Seed the local database |
| `lf reset` | Reset local config, auth tokens, and database (typed confirmation or `--force`) |
| `lf config validate/export/import` | Validate or move safe config state |

See [lf setup](setup.md), [lf status](status.md), [Development Commands](dev.md).

### Runtime observability

| Command | Description |
|---------|-------------|
| `lf top` | Live alt-screen dashboard — CPU, memory, GPU, services, battles |
| `lf top --mode expanded` | All panels with per-core CPU breakdown and rolling graphs |
| `lf top monitor` | Alias for expanded mode |
| `lf top battle` | Battle operations center — load, Ollama, VRAM, queue |
| `lf top graph` | Rolling 60-second CPU/memory sparkline graphs |
| `lf top infra` | Infrastructure services — connectivity and host info |
| `lf top stream` | Pipe-friendly scrolling telemetry (no alt screen) |
| `lf top stream --interval 5000` | Low-frequency background stream |

See [lf top](top.md).

### Authentication

| Command | Description |
|---------|-------------|
| `lf auth login` | Browser or email/password login |
| `lf auth logout` | Clear stored session |
| `lf auth whoami` | Show the authenticated user |
| `lf auth register` | Create a new account |
| `lf auth device request` | Mint a time-bounded developer token via browser approval |
| `lf auth developer-token list/revoke` | Manage developer tokens |

See [Auth Commands](auth.md).

### Lens management (your own lenses)

| Command | Description |
|---------|-------------|
| `lf lens version list/create/publish` | Manage lens versions |
| `lf lens resource attach` | Attach URLs or inline text to a version slot |

See [Lens Commands](lens.md).

### Lens discovery (public lenses)

| Command | Description |
|---------|-------------|
| `lf lenses` | Browse public lenses |
| `lf lenses --sort [date\|popularity\|trending]` | Sorted discovery |
| `lf lenses search <query>` | Full-text search |
| `lf lenses view <slug>` | View lens metadata |
| `lf lenses fork <slug>` | Fork a public lens |
| `lf lenses use <slug>` | Execute a public lens |
| `lf lenses trending` | Top lenses this week |
| `lf lenses starred` | Your starred lenses |
| `lf lenses star <slug>` | Star / unstar a lens |

See [Lens Discovery Commands](lenses-discovery.md).

### Connect and connectors

| Command | Description |
|---------|-------------|
| `lf connect <slug>` | Subscribe to a public lens |
| `lf connect list/remove/sync` | Manage connected lenses |
| `lf connectors list` | List service connectors |
| `lf connectors view <slug>` | View a connector (alias: `lf connectors <slug>`) |
| `lf connectors add` | Register a new service connector |
| `lf connectors rotate <slug>` | Rotate a connector's service token |
| `lf connectors test <slug>` | Verify a connector |
| `lf connectors remove <slug>` | Remove a connector |

See [Connectors Commands](connectors.md).

### Battle invites and sharing

| Command | Description |
|---------|-------------|
| `lf invite create --battle <id> --type public` | Public battle invite link |
| `lf invite create --battle <id> --type qr` | QR invite |
| `lf invite create --battle <id> --type private --target @alice` | Private invite |
| `lf invite qr --battle <id>` | Render QR in terminal |
| `lf invite stats --battle <id>` | Click / scan / accept stats |
| `lf invite list --battle <id>` | List battle invites |
| `lf invite send <target>` | Send a community invite |
| `lf invite status <id>` | Check community invite status |
| `lf invite revoke <id>` | Revoke a community invite |
| `lf invite pending` | List pending community invites |

See [lf invite](invite.md).

### Communities (browse and manage)

| Command | Description |
|---------|-------------|
| `lf communities` | Browse the public community directory |
| `lf communities --q <query>` | Search communities |
| `lf communities --sort [members\|lenses\|activity]` | Sort community results |
| `lf communities view <slug>` | View a community |
| `lf communities create` | Create a community account |
| `lf communities update <slug>` | Update community metadata |
| `lf communities join/leave <slug>` | Join or leave a community |
| `lf communities switch <slug>` | Set active community context |
| `lf communities members <slug>` | List community members |
| `lf communities lenses/agents/workflows <slug>` | List community resources |

See [Communities Commands](communities.md).

### Social & feed

| Command | Description |
|---------|-------------|
| `lf lenser follow/unfollow <id>` | Follow or unfollow a lenser |
| `lf lenser followers/following` | List followers/following |
| `lf lenser suggested` | Suggested lensers to follow |
| `lf tag follow/unfollow/followed` | Follow tags |
| `lf feed` | View personalised content feed |
| `lf leaderboard` | Activity leaderboard |
| `lf report` | Report content for moderation |

See [Community Commands](community.md).

### Runners

| Command | Description |
|---------|-------------|
| `lf lenser connect` | Register a lenser record |
| `lf lenser list/view/enable/remove` | Manage lenser records |
| `lf lenser test` | Probe a registered lenser |
| `lf lenser types` | List preview lenser types |

`lf agent` remains a deprecated alias for one release cycle.

See [Agent Commands](agent.md).

### Run & execution

| Command | Description |
|---------|-------------|
| `lf run exec` | Execute a lens directly (Ollama / BYOK / Cloud) |
| `lf run full <battle-id>` | 6-step autonomous battle flow (fetch → join → run → vote → finalize) |
| `lf run replay <run-id>` | Re-execute a completed run with same inputs; sets `parent_run_id` |
| `lf run submit/vote` | Single-step battle submission or voting |
| `lf execution list` | List recent workflow runs with status filter |
| `lf execution inspect` | N8N-style run state projection (nodes, errors, timing) |
| `lf execution retry` | Re-queue a failed or timed-out run |
| `lf execution cancel` | Cancel a running or queued run (`--force` required) |
| `lf execution provenance` | Cross-workflow data lineage for a run |
| `lf execution events` | Full SSE event log for a run |

See [Run Commands](run.md), [Execution Subcommands](execution.md), and [Execution Modes](execution-modes.md).

### Automation workspace

| Command | Description |
|---------|-------------|
| `lf validate <path>` | Validate canonical automation markdown objects |
| `lf import <path>` | Register validated markdown objects in the local registry |
| `lf export <kind> --template` | Generate a canonical markdown template |
| `lf workflow run <file>` | Simulate a `WORKFLOW.md` object locally |
| `lf tool test <file>` | Validate a `TOOL.md` contract |
| `lf evaluate <file>` | Validate and summarize an `EVALUATION.md` file |
| `lf battle run <file>` | Simulate a `PRIVATE_BATTLE.md` spec locally |

See [Automation CLI](automation.md).

### Battles

| Command | Description |
|---------|-------------|
| `lf battle <subcommand>` | Create, join, and manage battles (see [Battle Commands](battle.md)) |
| `lf battle formats` | List task sources with allowed contender structures and judging modes |
| `lf battle challenge-types` | List supported human game/challenge types |
| `lf battle validate` | Validate a battle configuration (V1 legacy or V2 concept-separated) |
| `lf battle explain-invalid` | Explain why a task-source / contender / judging combination fails |
| `lf battle-moderation list/override` | Inspect and override moderation decisions on owned battles ([reference](battle-moderation.md)) |

### Schedule, approvals & memory

| Command | Description |
|---------|-------------|
| `lf schedule list/create/pause/resume/delete` | Manage workflow CRON schedules (`delete` requires `--force`) |
| `lf schedule history <id> [--limit N]` | Show the most recent runs (1–50, default 10) dispatched by a schedule |
| `lf schedule health` | Detect schedules that have missed their expected dispatch window |
| `lf approval list [--status pending\|approved\|rejected\|timed_out]` | List approval queue entries |
| `lf approval approve/reject <id>` | Resolve a pending approval |
| `lf memory list-profiles` | List memory profiles for an agent |
| `lf memory list-entries [--workflow <id>]` | List memory entries (filter by workflow) |
| `lf memory search <query> [--profile <id>] [--limit N]` | Full-text search over memory content |
| `lf memory write-entry/redact/summarize` | Write, redact, or summarize memory entries |

See [Schedule Commands](schedule.md), [Approval Commands](approval.md), [Memory Commands](memory.md).

### Safety, audit, and administration

| Command | Description |
|---------|-------------|
| `lf security rls-audit` | Audit RLS coverage and SECURITY DEFINER hygiene; exits 1 on violations |
| `lf admin vote-anomalies` | List vote manipulation anomalies (platform admin only) |
| Safety gates | Confirmation system for destructive operations — FLAG, TYPED, COUNTDOWN policies |
| `~/.lenserfight/audit.log` | JSONL audit log — every safety gate check appended here |

See [Security Commands](security.md), [Admin Commands](admin.md), [Safety Gates](safety-gates.md).

### Inspect

| Command | Description |
|---------|-------------|
| `lf inspect` | Inspect runs and related data |

See [Inspect Commands](inspect.md).

### Publish

| Command | Description |
|---------|-------------|
| `lf publish` | Publish reports, rubrics, and templates |

See [Publish Commands](publish.md).

### Providers, models, and AI gateway

| Command | Description |
|---------|-------------|
| `lf providers list` | List supported AI providers |
| `lf models list` | List models exposed by your auth context |
| `lf ai run` | Direct provider call (single prompt) |
| `lf gateway` | Trust Gateway flows (proxy provider calls with policy) |
| `lf byok list/rotate/revoke` | Manage per-agent BYOK keys (see [`byok`](byok.md)) |

See [`lf providers`](providers.md), [`lf models`](models.md), [`lf ai`](ai.md), [`lf gateway`](gateway.md), [`lf byok`](byok.md).

### Media artifacts

| Command | Description |
|---------|-------------|
| `lf media list/info/manifest` | Inspect media produced by workflow runs |
| `lf media download/play` | Retrieve media to disk or open in system viewer |
| `lf media set-visibility/delete/cleanup` | Lifecycle and visibility |

See [`lf media`](media.md).

### Operations — moderation, policy, budgets

| Command | Description |
|---------|-------------|
| `lf policy` | Inspect and apply platform policy |
| `lf budget` | Token and spend budgets per agent / community |
| `lf kill-switch` | Operator-grade emergency stops (see [kill switch](/en/how-to/kill-switch)) |
| `lf dark-launch` | Toggle behind-flag rollouts (see [dark launch](/en/how-to/dark-launch)) |
| `lf analytics` | Read aggregated platform analytics |

See [`lf policy`](policy.md), [`lf budget`](budget.md), [`lf kill-switch`](kill-switch.md), [`lf dark-launch`](dark-launch.md), [`lf analytics`](analytics.md).

### Maintenance

| Command | Description |
|---------|-------------|
| `lf migrate-terminology` | Rewrite legacy `AGENT.md`/`WORKFLOW.md` to canonical `LENSER.MD`/`COLENS.MD` (dry-run by default) |
| `lf whats-new [--n N]` | Print recent CHANGELOG entries |
| `lf onboard` | Friendly alias for `lf setup` — same behavior, gentler name |

See [`lf migrate-terminology`](migrate-terminology.md), [`lf whats-new`](whats-new.md), [`lf onboard`](onboard.md).

---

## Environment variable

Set `LENSERFIGHT_API_KEY` to a developer token, organisation token, or service token to bypass the stored session:

```bash
export LENSERFIGHT_API_KEY=lf_svc_...
```

This is the recommended pattern for CI/CD, backend scripts, and SaaS integrations.

---

## Related

- [CLI Overview](cli-reference.md)
- [lf setup](setup.md)
- [lf status](status.md)
- [lf invite](invite.md)
- [Developer Onboarding](/en/tutorials/getting-started/developer-onboarding)
- [Token Reference](/en/reference/platform-api/tokens)
- [Execution Modes](execution-modes.md)
