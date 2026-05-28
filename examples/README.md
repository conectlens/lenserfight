# LenserFight Developer Examples

Practical examples for the local-first LenserFight developer workflow.

> **💡 IMPORTANT: Developer Safety & Responsibility**
> 
> These examples demonstrate autonomous lenser coordination, third-party connectors, and multi-step colenses. When running these examples with live providers (BYOK), you are responsible for monitoring lenser behavior and associated API costs. Always review the code and configuration before execution.

These examples are organized by the project concepts they teach:

| Area          | Example                                                                                                                                           | What it teaches                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lenses        | [lenses/minimal-lens](./lenses/minimal-lens/README.md)                                                                                            | The smallest portable `LENS.md` automation object                           |
| Lenses        | [lenses/configured-review-lens](./lenses/configured-review-lens/README.md)                                                                        | Lens input/output schemas and configurable prompt behavior                  |
| Colenses      | [colenses/research-to-rubric](./colenses/research-to-rubric/README.md)                                                                            | Multi-step `COLENS.MD` simulation with lens and lenser references           |
| Colenses      | [colenses/image-generation-demo](./colenses/image-generation-demo/README.md)                                                                      | Supabase-backed generative media colens seed plus local simulation          |
| Lensers       | [lensers/review-lenser-team](./lensers/review-lenser-team/README.md)                                                                              | Two AI lensers coordinated by a `TEAM.MD`                                   |
| Battles       | [battles/model-review-battle](./battles/model-review-battle/README.md)                                                                            | Portable `PRIVATE_BATTLE.md` simulation and optional local execution        |
| Local battles | [local-battle/review-rubric-smoke](./local-battle/review-rubric-smoke/README.md)                                                                  | Bundled local battle spec for `lf battle local run --example`               |
| Connectors    | [connectors/mock-review-connector](./connectors/mock-review-connector/README.md)                                                                  | Connector adapter shape, token verification, dispatch, and failure handling |
| Scoring       | [scoring/rubric-signal-plugin](./scoring/rubric-signal-plugin/README.md)                                                                          | Deterministic scoring plugin signals and result interpretation              |
| End to end    | [colenses/research-to-rubric](./colenses/research-to-rubric/README.md) + [battles/model-review-battle](./battles/model-review-battle/README.md)  | Lens -> lenser team -> colens -> battle -> scoring mental model             |

Most examples can be validated without Supabase or cloud credentials after the CLI is built:

```bash
pnpm nx run cli:build
node dist/apps/cli/main.js validate examples/lenses/minimal-lens
node dist/apps/cli/main.js workflow run examples/colenses/research-to-rubric/COLENS.MD
node dist/apps/cli/main.js battle run examples/battles/model-review-battle/PRIVATE_BATTLE.md
```

Local battle execution calls configured providers. Use Ollama for offline runs:

```bash
node dist/apps/cli/main.js battle local run --example review-rubric-smoke --judge human --yes
```

Generated reports and battle state are written under `.lenserfight/` or the current working directory. They are intentionally ignored by git.
