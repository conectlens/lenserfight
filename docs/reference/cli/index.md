# LenserFight CLI

The `lenserfight` CLI, also available as `lf`, is the command hub for local setup, direct execution, community interactions, and platform integrations.

## Start here

- [Installation](/tutorials/getting-started/installation)
- [Quickstart](/tutorials/getting-started/quickstart)
- [Local Database Setup](/reference/database/local-setup)
- [Run Commands](/reference/cli/run)

---

## Command reference

### Environment & development

| Command | Description |
|---------|-------------|
| `lf init` | Initialise a local LenserFight environment |
| `lf setup` | Run the deterministic onboarding wizard |
| `lf doctor` | Check local setup health |
| `lf dev` | Start local services |
| `lf seed` | Seed the local database |
| `lf reset` | Reset the local database |
| `lf status` | Show local environment status |
| `lf config validate/export/import` | Validate or move safe config state |

See [Development Commands](dev.md).

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

### Connect, connectors & invite

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
| `lf invite @username` | Invite a user to a community |
| `lf invite list/revoke/status` | Manage invitations |

See [Connectors & Invite Commands](connectors.md).

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
| `lf runner connect` | Register a runner record |
| `lf runner list/view/enable/remove` | Manage runner records |
| `lf runner test` | Probe a registered runner |
| `lf runner types` | List preview runner types |

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
| `lf execution cancel` | Cancel a running or queued run |
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
- [Token Reference](/reference/platform-api/tokens)
- [SaaS Integration Quickstart](/how-to/integrations/saas-quickstart)
- [Execution Modes](execution-modes.md)
