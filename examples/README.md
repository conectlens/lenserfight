# LenserFight Developer Examples

Practical examples for the local-first LenserFight developer workflow.

> **💡 IMPORTANT: Developer Safety & Responsibility**
> 
> These examples demonstrate autonomous agent coordination, third-party connectors, and multi-step workflows. When running these examples with live providers (BYOK), you are responsible for monitoring agent behavior and associated API costs. Always review the code and configuration before execution.

These examples are organized by the project concepts they teach:

| Area          | Example                                                                                                                                           | What it teaches                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lenses        | [lenses/minimal-lens](./lenses/minimal-lens/README.md)                                                                                            | The smallest portable `LENS.md` automation object                           |
| Lenses        | [lenses/configured-review-lens](./lenses/configured-review-lens/README.md)                                                                        | Lens input/output schemas and configurable prompt behavior                  |
| Workflows     | [workflows/research-to-rubric](./workflows/research-to-rubric/README.md)                                                                          | Multi-step `WORKFLOW.md` simulation with lens and agent references          |
| Workflows     | [workflows/image-generation-demo](./workflows/image-generation-demo/README.md)                                                                    | Supabase-backed generative media workflow seed plus local simulation        |
| Agents        | [agents/review-agent-team](./agents/review-agent-team/README.md)                                                                                  | Two AI agents coordinated by an `AGENT_TEAM.md`                             |
| Battles       | [battles/model-review-battle](./battles/model-review-battle/README.md)                                                                            | Portable `PRIVATE_BATTLE.md` simulation and optional local execution        |
| Local battles | [local-battle/review-rubric-smoke](./local-battle/review-rubric-smoke/README.md)                                                                  | Bundled local battle spec for `lf battle local run --example`               |
| Connectors    | [connectors/mock-review-connector](./connectors/mock-review-connector/README.md)                                                                  | Connector adapter shape, token verification, dispatch, and failure handling |
| Scoring       | [scoring/rubric-signal-plugin](./scoring/rubric-signal-plugin/README.md)                                                                          | Deterministic scoring plugin signals and result interpretation              |
| End to end    | [workflows/research-to-rubric](./workflows/research-to-rubric/README.md) + [battles/model-review-battle](./battles/model-review-battle/README.md) | Lens -> agent team -> workflow -> battle -> scoring mental model            |

Most examples can be validated without Supabase or cloud credentials after the CLI is built:

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/lenses/minimal-lens
node dist/apps/cli/main.js workflow run examples/workflows/research-to-rubric/WORKFLOW.md
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md
```

Local battle execution calls configured providers. Use Ollama for offline runs:

```bash
node dist/apps/cli/main.js battle local run --example review-rubric-smoke --judge human --yes
```

Generated reports and battle state are written under `.lenserfight/` or the current working directory. They are intentionally ignored by git.
