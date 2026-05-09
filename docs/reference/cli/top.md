---
title: lf top
description: Real-time terminal telemetry dashboard — CPU, memory, GPU, service connectivity, and battle orchestration load.
---

# `lf top`

Real-time runtime telemetry for the LenserFight environment. Renders CPU, memory, GPU, service health, local battle load, and rolling graphs inside an alt-screen terminal UI that refreshes every second.

```bash
lf top                          # compact mode (default)
lf top --mode expanded          # all panels + per-core CPU + graphs
lf top monitor                  # subcommand alias for expanded mode
lf top battle                   # battle operations center
lf top graph                    # rolling 60-second sparkline graphs
lf top infra                    # infrastructure services + host info
lf top stream                   # pipe-friendly scrolling output (no alt screen)
```

---

## Modes

### Compact (default)

Single-screen summary: CPU bar, memory bar, GPU (when detected), service status dots, battle counts, and active alerts. Fits in ~76 columns.

### Expanded (`lf top --mode expanded` / `lf top monitor`)

All compact panels plus:
- Per-core CPU breakdown (C00–Cnn in groups)
- Rolling 60-second CPU and memory sparkline graphs
- Full process info (PID, heap MB, uptime)

Adapts to up to 100 columns.

### Battle (`lf top battle`)

Operational focus for active local battles: running/draft/executed counts, resource pressure summary (CPU/MEM/VRAM inline), and Ollama + Supabase service status. Useful during local `battle run` sessions.

### Infrastructure (`lf top infra`)

Service connectivity panel — Ollama, Supabase, Cloud API, Docker — with probe detail (version strings, HTTP status). Shows host metadata: hostname, OS, architecture, Node version.

### Graph (`lf top graph`)

Full-width Unicode sparkline graphs for CPU and memory drawn over a 60-second rolling window. The longer the session, the more context is visible.

### Stream (`lf top stream`)

Emits one timestamped line per tick to stdout without clearing the screen:

```
2026-05-09T14:32:01.000Z  cpu=43%  mem=38%  gpu=61%  battles=2
```

No alt screen, no ANSI color by default in this mode. Designed to be piped:

```bash
lf top stream --interval 5000 | tee telemetry.log
lf top stream | grep "alerts="
```

---

## Keyboard controls

Controls are active in all modes except stream.

| Key | Action |
|---|---|
| `e` | Toggle expanded / compact |
| `g` | Toggle graph mode |
| `b` | Toggle battle mode |
| `i` | Toggle infra mode |
| `r` | Force immediate refresh |
| `q` / `Ctrl-C` | Quit and restore terminal |

Switching modes is instantaneous — the active mode badge in the title bar confirms the current view.

---

## Options

| Flag | Default | Description |
|---|---|---|
| `--mode` | `compact` | Initial mode: `compact`, `expanded`, `battle`, `infrastructure`, `graph`, `stream` |
| `--interval` | `1000` | Refresh interval in milliseconds. Minimum 250. |

---

## Metrics reference

| Metric | Source | Notes |
|---|---|---|
| **CPU total** | `os.cpus()` delta between ticks | Average across all cores. First tick shows `0%` (no prior sample). |
| **CPU per-core** | Same delta | Visible in expanded and graph modes. |
| **Memory** | `os.freemem()` / `os.totalmem()` | Resident OS memory. Does not include kernel page cache. |
| **Load average** | `os.loadavg()` | 1m / 5m / 15m. Shown as trailing three numbers next to the CPU bar. |
| **GPU utilization** | `nvidia-smi` (async) | Probed every 5 ticks. Silently absent when `nvidia-smi` is unavailable. |
| **VRAM** | `nvidia-smi` | Used / total in GB. Shown only when GPU is detected. |
| **GPU temperature** | `nvidia-smi` | Degrees Celsius, inline with VRAM row. |
| **Ollama** | `GET /api/version` (2s timeout) | Reports server version string when up. |
| **Supabase** | `GET /auth/v1/health` (2s timeout) | Reads `supabaseUrl` from project config. |
| **Cloud API** | `GET /health` (2s timeout) | Reads `cloudApiUrl` from project config. |
| **Docker** | `docker version` subprocess (2s timeout) | Reports client version string when up. |
| **Battles** | `.lenserfight/local-battles/*.json` | Counts by status: running (ready), draft, executed/voted. |
| **Heap** | `process.memoryUsage().heapUsed` | V8 heap of the `lf` process itself. |
| **Uptime** | `process.uptime()` | Time since the `lf top` session started. |

Service probes run every 5 ticks and GPU detection runs every 5 ticks, both non-blocking. The displayed values between probes are the cached result from the last completed check.

---

## Alerts

The dashboard generates inline alerts when thresholds are crossed. Critical alerts show in red; warnings in yellow. Each alert includes numbered recommended actions.

| Condition | Level | Example recommendation |
|---|---|---|
| Memory ≥ 80% | Warning | Monitor Ollama VRAM; consider pausing idle agents |
| Memory ≥ 90% | Critical | Reduce active battles; enable low-memory mode |
| CPU ≥ 90% | Critical | Reduce concurrent executions; switch to a lighter model |
| GPU VRAM ≥ 90% | Critical | Reduce battles; switch inference provider; pause background agents |
| Any service down | Warning | Service-specific fix command (e.g. `ollama serve`) |

Alerts are recalculated on every tick. They auto-clear as soon as conditions normalise.

---

## Non-TTY behaviour

When stdout is not a TTY (e.g. inside a CI script or shell substitution), `lf top` emits a single compact JSON snapshot and exits:

```bash
lf top 2>/dev/null
# {"ts":"2026-05-09T14:32:01.000Z","cpu":43,"mem":38,"gpu":null,"alerts":0}
```

---

## Related

- [`lf doctor`](/reference/cli/doctor) — point-in-time environment health checks
- [`lf status`](/reference/cli/status) — auth, config, and journey progress
- [Operate LenserFight from the TUI dashboard](/how-to/operations/cli-dashboard) — main `lf` command dashboard
- [`lf battle run`](/reference/cli/battle#lf-battle-run) — local battle execution (`lf top battle` shows load during runs)
- [`lf execution list`](/reference/cli/execution) — programmatic run state for scripting

<!-- AUTO-GEN-START -->

# `lf top`

Real-time runtime telemetry dashboard — CPU, memory, GPU, service health, and battle load.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--mode` | string | no | Initial view mode: compact (default), expanded, battle, infrastructure, graph, stream |
| `--interval` | string | no | Refresh interval in milliseconds (default: 1000, min: 250) |

## Subcommands

| Subcommand | Description |
|---|---|
| `lf top monitor` | Expanded mode — all panels, per-core CPU, rolling graphs |
| `lf top battle` | Battle operations center — load, agents, resource pressure |
| `lf top graph` | Rolling 60-second CPU/memory sparkline graphs |
| `lf top infra` | Infrastructure services panel — connectivity and host info |
| `lf top stream` | Pipe-friendly scrolling telemetry stream |

<!-- AUTO-GEN-END -->
