---
title: "Local Battles — Concept & Quickstart"
description: "Understand offline AI model comparison, run zero-cost battles on your GPU using Ollama/vLLM, and record side-by-side battles for your community showcase."
---

# Local Battles — Concept & Quickstart

> New to battles entirely? Read [Your First Battle](/en/tutorials/battle-walkthroughs/your-first-battle) first — it explains the foundational battle lifecycle and judge heuristics.

**Time:** ~5 minutes  
**Level:** Beginner to Intermediate  
**Target Audience:** Local developers, GPU hobbyists, inference engineers, and AI content creators.  
**Prerequisites:** `lf` CLI installed, plus one of:
*   [Ollama](https://ollama.com) running locally with a pulled model (fully offline)
*   **vLLM** or **llama.cpp** serving an OpenAI-compatible endpoint locally
*   `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` set in your shell (for cloud comparison)

---

## What is a Local Battle?

A **local battle** is a self-contained AI shootout that runs entirely on your own machine. There is no platform account required, no cloud dependencies, and zero costs incurred.

You pit two AI models (or two instances of the same model with different configurations/prompts) side-by-side, give them a standardized task, stream their token generation in parallel, and automatically call an AI judge to score the results against a strict Rubric.

The entire battle state lives in a portable JSON file under your runtime directory (`~/.lenserfight/local-battles/<id>.json`). You can inspect it, override the judge’s verdict, reuse it as a local benchmark, or push the shell to the cloud arena to let the community vote!

---

## Why Local Battles are a Game Changer

Local battles bridge the gap between high-level prompt engineering, low-level inference hacking, and creative social content:

| Goal | Why Local Battles Rock |
|---|---|
| **Zero Platform Costs** | Run thousands of matches using local models offline without spending credits. |
| **GPU Optimization** | Stress-test your hardware rig (token/sec, VRAM usage) under parallel agent load. |
| **Complete Privacy** | Submissions and outputs never leave your machine unless you choose to push. |
| **Automated CI Benchmarking** | Run `lf battle local run` in GitHub Actions or pre-commit hooks to gate prompt regressions. |
| **Creator Content Goldmine** | Terminal side-by-side token streaming is highly visual. It's the perfect showcase for YouTube, TikTok, or Twitter/X! |

---

## How a Local Battle Works Offline

```text
lf battle local run
      │
      ├── Slot A (Ollama / vLLM / Key) ─► Parallel Offline API Execution ─► Tokens stream live
      ├── Slot B (Ollama / vLLM / Key) ─► Parallel Offline API Execution ─► Tokens stream live
      │
      ▼
  local-battles/<id>.json
      ├── contender_a: { provider, model, output, tokens_per_sec }
      ├── contender_b: { provider, model, output, tokens_per_sec }
      └── verdict:    { winner, rubric_breakdown, rationale, source }
            │
            ▼ (Optional)
  lf battle local push --slug "ollama-shootout"
            │
            ▼
  LenserFight Cloud Arena — Live matchmaking shell ready for public votes!
```

---

## Step 1 — Initialize Your Local Battle

Create a new battle draft and specify the competitive prompt task:

```bash
lf battle local init \
  --name "Haiku Shootout: Ollama vs. Cloud" \
  --task "Explain quantum physics to an 8-year-old using a strict 3-line haiku."
```

Expected Output:
```text
✔ Local battle created.
ID:   a1b2c3d4-...
Name: Haiku Shootout: Ollama vs. Cloud

Next steps:
  lf battle local add-contender A --provider ollama    --model llama3.2
  lf battle local add-contender B --provider anthropic --model claude-haiku-4-5
  lf battle local run a1b2c3d4-...
```

The battle draft is saved entirely on your filesystem. No API calls or network requests have occurred.

---

## Step 2 — Configure Contender A (Your Local Model)

Configure Slot A to use your local **Ollama** server running `llama3.2`:

```bash
lf battle local add-contender A \
  --provider ollama \
  --model llama3.2
```

> **💡 GPU Tip:** If you run **vLLM** or **llama.cpp** locally, configure it as an OpenAI-compatible provider:
> ```bash
> lf battle local add-contender A \
>   --provider openai \
>   --model custom-local-model \
>   --config '{"baseUrl":"http://localhost:8000/v1"}'
> ```

---

## Step 3 — Configure Contender B (The Challenger)

For Slot B, let's use a cloud model to run a benchmark, or connect another local model to test different weights (e.g. `gemma2`):

```bash
lf battle local add-contender B \
  --provider anthropic \
  --model claude-haiku-4-5
```

The CLI will fetch `ANTHROPIC_API_KEY` from your environment.

---

## Step 4 — Run the Battle (and Get Ready to Record!)

Now, execute the match. This is where the magic happens. 

```bash
lf battle local run
```

### 🤝 Documenting and Sharing Your Shootout

Executing local battles directly from the CLI produces highly visual, parallel terminal streams that are excellent for demonstrating model comparisons:

*   **Capture the Execution**: You can record your terminal while executing the battle. Watching model outputs stream in real-time is a great way to demonstrate comparative token latency.
*   **Observe Compute Latency**: If you are running complex local configurations, note your hardware behavior, VRAM allocation, and token-generation speed (tokens/sec) during parallel model execution.
*   **Share with other developers**: If you post your comparison results or walkthroughs on developer channels (such as YouTube, Twitter/X, or LinkedIn), feel free to use the hashtag **`#LenserFight`** so the community can discover your work.

---

## Step 5 — Inspect the AI Judge's Verdict

Once execution completes, the CLI automatically calls an AI judge to evaluate both outputs against the task constraints and records the verdict:

```text
✔ Execution complete in 3140ms.
Tokens — A: 38  B: 42

AI judge evaluating… (utilizing local prompt rubric analysis)
✔ Winner: Contender B (anthropic/claude-haiku-4-5)
  Rationale: Contender B explained the complex quantum concept (superposition) much more accurately for an 8-year-old audience, whereas Contender A focused solely on movement.
  Judge: anthropic/claude-haiku-4-5

Override the verdict: lf battle local vote --slot A|B|draw
```

---

## Step 6 — Override the Verdict (Human Priority)

As the lab operator, you have absolute authority. If you disagree with the AI judge's reasoning, override the score:

```bash
lf battle local vote \
  --slot A \
  --rationale "Preferred the simple vocabulary used by Ollama."
```

If you check the battle diagnostics (`lf battle local status`), your vote will override the judge and be marked `source=human`.

---

## Step 7 — Push to LenserFight Cloud (Optional Showcase)

Ready to let the world vote or show off your local model shootout to friends?

```bash
lf battle local push --slug "ollama-quantum-duel"
```

This registers the battle metadata on the public LenserFight cloud arena. Your private credentials and raw endpoint configurations remain safely local on your laptop, but the competitive shootout shell goes live for public spectators!

---

## What to Try Next

*   **Compare Inference Engines**: Run vLLM vs. llama.cpp offline to benchmark execution latency and hardware usage.
*   **Stress-Test Agent Teams**: Build a DAG workflow of multiple local models cooperating, then battle them against a single cloud model.
*   **Document Unexpected Outputs**: If a local model produces loop errors, hallucinations, or unexpected judge verdicts under temperature pressure, you can share these runs under GitHub Discussions to help others analyze prompt edge-cases.
*   **Submit a Showcase Link**: If you have published a detailed benchmark tutorial or video guide, you can propose adding your link to our community showcase table by opening a Pull Request.

