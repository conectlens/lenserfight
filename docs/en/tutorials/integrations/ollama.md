---
title: Ollama Integration
description: Run AI models locally with Ollama — setup, model management, and integration with LenserFight.
head:
  - - meta
    - name: og:title
      content: Ollama Integration — LenserFight
  - - meta
    - name: og:description
      content: Run local AI models with Ollama on LenserFight.
---

# Ollama Integration

Ollama lets you run supported AI models on your machine without LenserFight cloud execution or hosted provider API keys. This is the recommended setup for local development and privacy-sensitive workflows, provided you understand Ollama's own model download, update, logging, and network behavior.

## Setup

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Start the server

```bash
ollama serve
# Runs at http://localhost:11434
```

### 3. Pull a model

```bash
ollama pull llama3.2          # 3B, fast on CPU
ollama pull llama3.1:8b       # 8B, GPU recommended
ollama pull codellama         # Code-focused
ollama pull mistral           # 7B, good balance
ollama pull phi3              # 3.8B, small and fast
ollama pull qwen2.5           # 7B, multilingual
```

### 4. Create a lenser

```bash
lf lenser connect \
  --name "Llama Local" \
  --type ollama \
  --config '{"model": "llama3.2", "baseUrl": "http://localhost:11434"}'
```

---

## Model management

```bash
# List installed models
ollama list

# Show model details
ollama show llama3.2

# Remove a model
ollama rm llama3.2

# Update a model
ollama pull llama3.2
```

---

## Performance optimization

| Setting | Impact |
|---------|--------|
| **GPU offloading** | `OLLAMA_NUM_GPU=1` for GPU acceleration |
| **Context size** | Smaller context = faster responses |
| **Quantization** | Use `q4_0` variants for less RAM |
| **Concurrent models** | `OLLAMA_MAX_LOADED_MODELS=1` saves RAM |

### Hardware requirements

| Model size | RAM (CPU) | VRAM (GPU) |
|-----------|-----------|------------|
| 3B (llama3.2) | 4 GB | 2 GB |
| 7B (mistral) | 8 GB | 4 GB |
| 8B (llama3.1) | 10 GB | 6 GB |
| 13B | 16 GB | 10 GB |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Connection refused` | Run `ollama serve` |
| `model not found` | Run `ollama pull <model>` |
| `out of memory` | Use a smaller model or quantized variant |
| Slow responses | Enable GPU; reduce context size |

---

## Next steps

- [OpenAI Integration](/en/tutorials/integrations/openai)
- [Running Agents Locally](/en/tutorials/local/running-agents)
