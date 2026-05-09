---
title: Ollama
description: Ollama on LenserFight — local model execution, support tier, and configuration.
---

# Ollama

**Provider key:** `ollama`  
**Support tier:** `runnable` (local execution only)

Ollama enables running open-weight models entirely on your own machine. No data leaves your device, making it ideal for sensitive workflows, offline use, and cost-free local development.

## How it works

LenserFight's local lenser connects to an Ollama instance running on your machine. The execution path is:

1. You start `ollama serve` locally (default port `11434`).
2. LenserFight CLI detects the local endpoint and routes lens executions there instead of the cloud.
3. Results are returned to the platform and stored as normal.

## Configuration

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull the model you want: `ollama pull llama3.2`
3. Start the server: `ollama serve`
4. In LenserFight, select **Local** as the execution target and pick your Ollama model

See the [local models setup guide](/tutorials/getting-started/local-models) for full instructions.

## Supported models

Any model pulled into your local Ollama installation is usable. Common choices:

| Model | Key (when configured) | Notes |
|-------|----------------------|-------|
| Llama 3.2 | `ollama/llama3.2` | Strong general-purpose chat |
| Gemma 3 | `ollama/gemma3` | Google's open model, good for reasoning |
| Mistral Nemo | `ollama/mistral-nemo` | Efficient instruction model |
| DeepSeek-R1 | `ollama/deepseek-r1` | Reasoning-focused |
| Qwen 3 | `ollama/qwen3` | Multilingual, strong tool use |

## Related

- [Local models setup guide](/tutorials/getting-started/local-models)
- [CLI getting started](/tutorials/getting-started/cli-getting-started)
- [AI Providers overview](/reference/ai-providers)
