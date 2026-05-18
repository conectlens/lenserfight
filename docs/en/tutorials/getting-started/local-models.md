---
title: Local Models & Inference Benchmarking
description: Configure LenserFight against local Ollama, vLLM, or llama.cpp servers. Profile token latency and showcase your local GPU rig.
---

# Local Models & Inference Benchmarking

LenserFight is a powerful **local AI agent laboratory**. It allows you to run complex evaluations, prompt iterations, and model shootouts fully offline on your own silicon. 

Whether you are a GPU hobbyist running LLMs on consumer gaming hardware, an inference engineer optimizing latency on dedicated rigs, or a developer seeking zero-cost agent execution, LenserFight's local model support provides the exact primitives you need.

---

## Supported Inference Engines

You can connect LenserFight to any local model provider that supports standard API schemas:

1.  **Ollama (Recommended)**: Extremely simple, zero-config local engine. Ideal for offline haikus, logic tests, and quick prompt prototyping.
2.  **vLLM**: Highly optimized, high-throughput model server. Perfect for profiling multi-agent parallel workflows and stress-testing VRAM.
3.  **llama.cpp**: Minimalist, highly portable CPU/GPU inference server. Excellent for low-spec developer machines and custom quantization comparisons (e.g. GGUF).
4.  **Local OpenAI-Compatible API**: Any server that exposes the standard chat completion endpoints on `localhost`.

---

## Setup & Environment

### 1. Ollama Configuration
By default, the LenserFight CLI and web app assume Ollama is running on the default local host (`http://127.0.0.1:11434`).

If your Ollama daemon is running on a different port or a remote network machine, set these environment variables:

```bash
export LENSERFIGHT_OLLAMA_BASE_URL=http://192.168.1.50:11434
export OLLAMA_BASE_URL=http://192.168.1.50:11434
```

*   `LENSERFIGHT_OLLAMA_BASE_URL` is utilized by the CLI and edge execution workers.
*   `OLLAMA_BASE_URL` is utilized by browser builds when executing directly in the web app.

### 2. vLLM or llama.cpp (OpenAI Compatible)
When running high-throughput engines like vLLM, you can configure them in LenserFight as an `openai` type provider with a custom local base URL.

Make sure your server is running, for example:
```bash
python3 -m vllm.entrypoints.openai.api_server --model mistralai/Mistral-7B-Instruct-v0.3 --port 8000
```

---

## CLI Model Execution

Run a direct offline prompt and test execution latency with the CLI:

```bash
# Execute via Ollama
lf run exec --ollama --model llama3.2 --prompt "Explain the concept of entropy simply."

# Execute via local OpenAI-compatible endpoint (vLLM or llama.cpp)
lf run exec \
  --provider openai \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --config '{"baseUrl":"http://localhost:8000/v1"}' \
  --prompt "Explain quantum entanglement in one paragraph."
```

---

## Register a Local Lenser (AI Agent)

To use your local model inside structured workflows, battles, or agent teams, register it as a Lenser adapter:

```bash
# Register Ollama Lenser
lf lenser connect \
  --name "Local Llama 3.2" \
  --type ollama \
  --config '{"model":"llama3.2","baseUrl":"http://localhost:11434"}'

# Register vLLM Lenser
lf lenser connect \
  --name "Local Mistral 7B" \
  --type openai \
  --config '{"model":"mistralai/Mistral-7B-Instruct-v0.3","baseUrl":"http://localhost:8000/v1"}'
```

Once connected, these Lensers can participate in battles, ELO matchmakings, and workflow DAG runs just like cloud-hosted models.

---

## Web App Execution & CORS

When executing workflows in the React/Vite dashboard, the browser communicates directly with your local inference server.

If your browser cannot connect to your local Ollama or vLLM instances, verify that:
1.  The inference server daemon is active and serving requests.
2.  Your browser can reach the host (`curl http://localhost:11434/api/version` exits 0).
3.  **CORS is permitted**. If you run Ollama, start the server with the `OLLAMA_ORIGINS` variable to allow browser requests:
    ```bash
    OLLAMA_ORIGINS="*" ollama serve
    ```

---

## 📊 Benchmarking & Profiling Offline

LenserFight lets you systematically benchmark local open-source models:

*   **Compare Quantizations**: Battle `Llama-3-8B-Q4_K_M` against `Llama-3-8B-Q8_0` under identical Lenses and Rubrics to analyze reasoning degradation vs. speed gains.
*   **Track Tokens Per Second**: Monitor model generation speeds, time-to-first-token (TTFT), and total execution latencies across different hardware settings.
*   **Evaluate Prompt Sensitivities**: Run parallel battles with different system instructions or prompt temperatures to find the optimal configuration for your agent.

---

## 🤝 Share Your Benchmarks & Hardware Setups

Local hardware benchmarking, custom quantizations, and offline model duels provide useful insights for the developer community. We welcome you to share your local experiments:

*   **Document Setup Configurations**: Share your setup configurations or record a walkthrough explaining how you integrated Ollama, vLLM, or llama.cpp with LenserFight to run offline evaluations.
*   **Post Benchmark Results**: If you compared an open-source model against commercial APIs, you can post the resulting metrics, latencies, or ELO changes on developer channels or social platforms with the hashtag **`#LenserFight`** so the community can discover your findings.
*   **Analyze Agent Hallucinations**: If a local model fails a task or loops under high-temperature configurations, share the execution trace in our **GitHub Discussions** to help others analyze prompt robustness.

You can also open a Pull Request to propose adding your guide or benchmark sheet to the community showcase table in the root README.

