# haiku-shootout

A minimal local battle example: two Ollama models competing to write the best haiku about the sea.

## Run it

```bash
lf battle local run --example haiku-shootout
```

If Ollama is not installed, swap in BYOK providers via the spec:

```bash
# Edit spec.yaml: change provider to 'openai' and model to 'gpt-4o-mini', then:
lf battle local init --from examples/local-battle/haiku-shootout/spec.yaml
lf battle local run
```

## What happens

1. `lf battle local run --example haiku-shootout` loads `spec.yaml`, creates a local battle, adds both contenders, and runs them.
2. Both models respond to the haiku task independently.
3. Outputs appear side-by-side in the terminal.
4. Run `lf battle local vote` to cast your vote, or `lf battle export <id> --as-md` to share.

## Rubric

| Criterion | Weight |
|-----------|--------|
| Syllable accuracy (5-7-5) | 3 |
| Sensory imagery | 2 |
| Originality | 2 |
| Emotional resonance | 1 |

Pass threshold: 60 % of max score.

## Swap models

Edit `spec.yaml` and change `provider`/`model` under `contenders.A` or `contenders.B`. Any provider registered with `lf runner connect` or available via Ollama works.
