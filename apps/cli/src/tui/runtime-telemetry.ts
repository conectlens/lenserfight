import os from 'node:os'
import { execFile } from 'node:child_process'
import { A, sym } from '../utils/ansi'
import { resolveConfig } from '../config/project-config'

// ── Mode ──────────────────────────────────────────────────────────────────────

export type TelemetryMode = 'compact' | 'expanded' | 'battle' | 'infrastructure' | 'graph' | 'stream'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CpuSnapshot {
  total: number
  perCore: number[]
  model: string
  coreCount: number
}

interface MemSnapshot {
  totalGb: number
  usedGb: number
  pct: number
}

interface GpuSnapshot {
  available: boolean
  name: string
  utilPct: number
  vramUsedGb: number
  vramTotalGb: number
  tempC: number | null
}

interface ServiceProbe {
  name: string
  status: 'up' | 'down' | 'unknown'
  detail?: string
}

interface LocalBattleSummary {
  running: number
  draft: number
  executed: number
  total: number
}

interface Alert {
  level: 'warn' | 'critical'
  msg: string
  actions: string[]
}

interface TelemetrySnapshot {
  ts: Date
  cpu: CpuSnapshot
  mem: MemSnapshot
  gpu: GpuSnapshot
  services: ServiceProbe[]
  battles: LocalBattleSummary
  alerts: Alert[]
  processHeapMb: number
  processUptimeSec: number
  loadAvg: [number, number, number]
  pid: number
}

// ── CPU delta tracking ────────────────────────────────────────────────────────

let _prevCpus: os.CpuInfo[] | null = null
let _cpuModel = ''

function sampleCpu(): CpuSnapshot {
  const cpus = os.cpus()
  if (!_cpuModel && cpus[0]) _cpuModel = cpus[0].model.split('@')[0].trim()

  const perCore: number[] = []
  if (_prevCpus) {
    for (let i = 0; i < cpus.length && i < _prevCpus.length; i++) {
      const cur = cpus[i].times
      const prev = _prevCpus[i].times
      const curTotal = cur.user + cur.nice + cur.sys + cur.idle + cur.irq
      const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq
      const totalDiff = curTotal - prevTotal
      const idleDiff = cur.idle - prev.idle
      perCore.push(totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0)
    }
  } else {
    cpus.forEach(() => perCore.push(0))
  }
  _prevCpus = cpus

  const total = perCore.length > 0
    ? Math.round(perCore.reduce((a, b) => a + b, 0) / perCore.length)
    : 0
  return { total, perCore, model: _cpuModel, coreCount: cpus.length }
}

// ── Memory ────────────────────────────────────────────────────────────────────

function sampleMem(): MemSnapshot {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  const gb = (n: number) => parseFloat((n / 1024 / 1024 / 1024).toFixed(1))
  return { totalGb: gb(total), usedGb: gb(used), pct: Math.round((used / total) * 100) }
}

// ── GPU (async, cached, fire-and-forget) ──────────────────────────────────────

let _gpu: GpuSnapshot = { available: false, name: 'N/A', utilPct: 0, vramUsedGb: 0, vramTotalGb: 0, tempC: null }
let _gpuProbing = false

function probeGpu(): void {
  if (_gpuProbing) return
  _gpuProbing = true
  execFile(
    'nvidia-smi',
    ['--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu', '--format=csv,noheader,nounits'],
    { timeout: 3000 },
    (err, stdout) => {
      _gpuProbing = false
      if (err) return
      const parts = stdout.trim().split('\n')[0]?.split(',').map(s => s.trim())
      if (!parts || parts.length < 4) return
      const [name, util, memUsed, memTotal, temp] = parts
      _gpu = {
        available: true,
        name: name ?? 'GPU',
        utilPct: parseInt(util ?? '0') || 0,
        vramUsedGb: parseFloat(((parseInt(memUsed ?? '0') || 0) / 1024).toFixed(1)),
        vramTotalGb: parseFloat(((parseInt(memTotal ?? '0') || 0) / 1024).toFixed(1)),
        tempC: parseInt(temp ?? '') || null,
      }
    },
  )
}

// ── Services (async, cached, fire-and-forget) ─────────────────────────────────

let _services: ServiceProbe[] = [
  { name: 'OLLAMA',    status: 'unknown' },
  { name: 'SUPABASE',  status: 'unknown' },
  { name: 'CLOUD API', status: 'unknown' },
  { name: 'DOCKER',    status: 'unknown' },
]
let _servicesProbing = false

async function probeServices(): Promise<void> {
  if (_servicesProbing) return
  _servicesProbing = true
  try {
    const config = resolveConfig()
    const results: ServiceProbe[] = []

    const probe = async (url: string, timeout = 2000): Promise<Response> => {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeout)
      try { return await fetch(url, { signal: ctrl.signal }) }
      finally { clearTimeout(t) }
    }

    // Ollama
    try {
      const ollamaUrl = config.ollamaBaseUrl ?? 'http://localhost:11434'
      const res = await probe(`${ollamaUrl}/api/version`)
      if (res.ok) {
        const data = await res.json() as { version?: string }
        results.push({ name: 'OLLAMA', status: 'up', detail: data.version ? `v${data.version}` : 'connected' })
      } else {
        results.push({ name: 'OLLAMA', status: 'down', detail: `HTTP ${res.status}` })
      }
    } catch { results.push({ name: 'OLLAMA', status: 'down', detail: 'unreachable' }) }

    // Supabase
    try {
      if (config.supabaseUrl) {
        const res = await probe(`${config.supabaseUrl}/auth/v1/health`)
        results.push({ name: 'SUPABASE', status: res.ok ? 'up' : 'down', detail: res.ok ? 'healthy' : `HTTP ${res.status}` })
      } else {
        results.push({ name: 'SUPABASE', status: 'unknown', detail: 'not configured' })
      }
    } catch { results.push({ name: 'SUPABASE', status: 'down', detail: 'unreachable' }) }

    // Cloud API
    try {
      if (config.cloudApiUrl) {
        const res = await probe(`${config.cloudApiUrl}/health`)
        results.push({ name: 'CLOUD API', status: res.ok ? 'up' : 'down', detail: res.ok ? 'healthy' : `HTTP ${res.status}` })
      } else {
        results.push({ name: 'CLOUD API', status: 'unknown', detail: 'not configured' })
      }
    } catch { results.push({ name: 'CLOUD API', status: 'down', detail: 'unreachable' }) }

    // Docker
    await new Promise<void>((resolve) => {
      execFile('docker', ['version', '--format', '{{.Client.Version}}'], { timeout: 2000 }, (err, stdout) => {
        results.push(err
          ? { name: 'DOCKER', status: 'down', detail: 'not running' }
          : { name: 'DOCKER', status: 'up', detail: `v${stdout.trim()}` })
        resolve()
      })
    })

    _services = results
  } finally {
    _servicesProbing = false
  }
}

// ── Battle state (async, cached) ──────────────────────────────────────────────

let _battles: LocalBattleSummary = { running: 0, draft: 0, executed: 0, total: 0 }

async function probeBattles(): Promise<void> {
  try {
    const { readdir } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const { readBattleFile } = await import('../utils/local-battle-storage')
    const { getLocalBattleStorageDirs } = await import('../utils/local-battle-paths')
    const dirs = getLocalBattleStorageDirs()
    let running = 0, draft = 0, executed = 0
    let total = 0
    const seen = new Set<string>()
    for (const dir of [dirs.legacy, dirs.primary]) {
      const files = await readdir(dir).catch(() => [] as string[])
      for (const f of files.filter(file => file.endsWith('.json'))) {
        try {
          const b = readBattleFile<{ id?: string; status?: string }>(join(dir, f))
          const key = b.id ?? f
          if (seen.has(key)) continue
          seen.add(key)
          total++
          if (b.status === 'executed' || b.status === 'voted') executed++
          else if (b.status === 'ready') running++
          else draft++
        } catch { /* skip corrupted or locked encrypted files */ }
      }
    }
    _battles = { running, draft, executed, total }
  } catch { /* no battle dir */ }
}

// ── Alerts ────────────────────────────────────────────────────────────────────

function buildAlerts(cpu: CpuSnapshot, mem: MemSnapshot, gpu: GpuSnapshot, services: ServiceProbe[]): Alert[] {
  const out: Alert[] = []

  if (mem.pct >= 90) {
    out.push({
      level: 'critical',
      msg: `Memory critical ${mem.usedGb}GB / ${mem.totalGb}GB (${mem.pct}%)`,
      actions: ['Reduce active battles', 'Pause background agents', 'Enable low-memory mode'],
    })
  } else if (mem.pct >= 80) {
    out.push({
      level: 'warn',
      msg: `Memory pressure ${mem.usedGb}GB / ${mem.totalGb}GB (${mem.pct}%)`,
      actions: ['Monitor Ollama VRAM', 'Consider pausing idle agents'],
    })
  }

  if (cpu.total >= 90) {
    out.push({
      level: 'critical',
      msg: `CPU overloaded at ${cpu.total}%`,
      actions: ['Reduce concurrent battle executions', 'Switch to a lighter inference model'],
    })
  }

  if (gpu.available && gpu.vramTotalGb > 0) {
    const vramPct = Math.round((gpu.vramUsedGb / gpu.vramTotalGb) * 100)
    if (vramPct >= 90) {
      out.push({
        level: 'critical',
        msg: `GPU VRAM saturated ${gpu.vramUsedGb}GB / ${gpu.vramTotalGb}GB`,
        actions: ['Reduce active battles', 'Switch inference provider', 'Enable low-memory runtime mode', 'Pause background agents'],
      })
    }
  }

  for (const svc of services.filter(s => s.status === 'down')) {
    const hints: Record<string, string> = {
      OLLAMA:     'Run: ollama serve',
      DOCKER:     'Start Docker daemon',
      SUPABASE:   'Run: lf dev  or check cloud config',
      'CLOUD API': 'Check network or verify LF_CLOUD_API_URL',
    }
    out.push({
      level: 'warn',
      msg: `${svc.name} unreachable — ${svc.detail ?? 'connection failed'}`,
      actions: hints[svc.name] ? [hints[svc.name]] : [],
    })
  }

  return out
}

// ── Rendering primitives ──────────────────────────────────────────────────────

function vlen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length
}

function padR(s: string, n: number): string {
  const gap = n - vlen(s)
  return gap > 0 ? s + ' '.repeat(gap) : s
}

function bar(pct: number, w = 18): string {
  const p = Math.max(0, Math.min(100, pct))
  const filled = Math.round((p / 100) * w)
  const empty = w - filled
  const color = p >= 85 ? A.brightRed : p >= 65 ? A.brightYellow : A.brightGreen
  return `${color}${'█'.repeat(filled)}${A.gray}${'░'.repeat(empty)}${A.reset}`
}

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
function sparkline(vals: number[]): string {
  return vals.map(v => SPARK_CHARS[Math.min(7, Math.floor((Math.max(0, Math.min(100, v)) / 100) * 8))] ?? '▁').join('')
}

function svcLabel(s: ServiceProbe): string {
  switch (s.status) {
    case 'up':      return `${A.brightGreen}${sym.pass} ${(s.detail ?? 'UP').toUpperCase()}${A.reset}`
    case 'down':    return `${A.brightRed}${sym.fail} DOWN${A.reset}`
    default:        return `${A.gray}${sym.dot} CHECKING${A.reset}`
  }
}

function bxTop(w: number): string { return `${A.gray}╔${'═'.repeat(w - 2)}╗${A.reset}` }
function bxDiv(w: number): string { return `${A.gray}╠${'═'.repeat(w - 2)}╣${A.reset}` }
function bxBot(w: number): string { return `${A.gray}╚${'═'.repeat(w - 2)}╝${A.reset}` }
function bxRow(content: string, w: number): string {
  const inner = w - 4
  const padded = padR(content, inner)
  return `${A.gray}║${A.reset} ${padded} ${A.gray}║${A.reset}`
}

function bxHead(label: string, w: number): string {
  return bxRow(`${A.bold}${A.brightWhite}${label}${A.reset}`, w)
}

// ── Rolling history ───────────────────────────────────────────────────────────

const HIST = 60
const _cpuHist: number[] = []
const _memHist: number[] = []

function pushHist(cpu: number, mem: number): void {
  _cpuHist.push(cpu)
  _memHist.push(mem)
  if (_cpuHist.length > HIST) _cpuHist.shift()
  if (_memHist.length > HIST) _memHist.shift()
}

// ── Section renderers ─────────────────────────────────────────────────────────

function rowsSystem(snap: TelemetrySnapshot, w: number, showCores = false): string[] {
  const rows: string[] = []
  const barW = Math.min(18, w - 28)

  rows.push(bxRow(
    `${A.brightCyan}${A.bold}CPU   ${A.reset}${padR(`${snap.cpu.total}%`, 5)} ${bar(snap.cpu.total, barW)}` +
    `  ${A.gray}${snap.cpu.coreCount}c · ${snap.loadAvg[0].toFixed(2)} ${snap.loadAvg[1].toFixed(2)} ${snap.loadAvg[2].toFixed(2)}${A.reset}`,
    w,
  ))
  rows.push(bxRow(
    `${A.brightGreen}${A.bold}MEM   ${A.reset}${padR(`${snap.mem.pct}%`, 5)} ${bar(snap.mem.pct, barW)}` +
    `  ${A.gray}${snap.mem.usedGb}GB / ${snap.mem.totalGb}GB${A.reset}`,
    w,
  ))

  if (showCores && snap.cpu.perCore.length > 0) {
    const cols = w > 90 ? 8 : 4
    for (let i = 0; i < snap.cpu.perCore.length; i += cols) {
      const chunk = snap.cpu.perCore.slice(i, i + cols)
      const parts = chunk.map((p, j) => {
        const id = String(i + j).padStart(2, '0')
        const col = p >= 85 ? A.brightRed : p >= 65 ? A.brightYellow : A.gray
        return `${A.dim}C${id}${A.reset} ${col}${String(p).padStart(3)}%${A.reset}`
      })
      rows.push(bxRow(parts.join('  '), w))
    }
  }

  return rows
}

function rowsGpu(snap: TelemetrySnapshot, w: number): string[] {
  if (!snap.gpu.available) {
    return [bxRow(`${A.dim}GPU   N/A — no NVIDIA device detected${A.reset}`, w)]
  }
  const barW = Math.min(18, w - 28)
  const name = snap.gpu.name.length > 22 ? snap.gpu.name.slice(0, 21) + '…' : snap.gpu.name
  const rows = [
    bxRow(
      `${A.brightMagenta}${A.bold}GPU   ${A.reset}${padR(`${snap.gpu.utilPct}%`, 5)} ${bar(snap.gpu.utilPct, barW)}` +
      `  ${A.gray}${name}${snap.gpu.tempC != null ? `  ${snap.gpu.tempC}°C` : ''}${A.reset}`,
      w,
    ),
  ]
  if (snap.gpu.vramTotalGb > 0) {
    const vramPct = Math.round((snap.gpu.vramUsedGb / snap.gpu.vramTotalGb) * 100)
    rows.push(bxRow(
      `${A.brightMagenta}${A.bold}VRAM  ${A.reset}${padR(`${vramPct}%`, 5)} ${bar(vramPct, barW)}` +
      `  ${A.gray}${snap.gpu.vramUsedGb}GB / ${snap.gpu.vramTotalGb}GB${A.reset}`,
      w,
    ))
  }
  return rows
}

function rowsServices(snap: TelemetrySnapshot, w: number): string[] {
  return snap.services.map(svc =>
    bxRow(`${padR(`${A.bold}${svc.name}${A.reset}`, 12 + 9)}  ${svcLabel(svc)}`, w),
  )
}

function rowsBattles(snap: TelemetrySnapshot, w: number): string[] {
  const rows: string[] = []
  const { running, draft, executed, total } = snap.battles

  rows.push(bxRow(
    `${A.brightYellow}${A.bold}BATTLES  ${A.reset}` +
    `${A.brightGreen}${running} running${A.reset}  ` +
    `${A.gray}${draft} draft  ${executed} executed  ${total} total${A.reset}`,
    w,
  ))

  if (running > 0) {
    rows.push(bxRow(`  ${A.gray}├─${A.reset} ${A.brightGreen}battle-engine${A.reset}  ${A.brightGreen}RUNNING${A.reset}`, w))
  }
  rows.push(bxRow(
    `${A.dim}PROCESS  PID ${snap.pid}  heap ${snap.processHeapMb.toFixed(0)}MB  up ${fmtUptime(snap.processUptimeSec)}${A.reset}`,
    w,
  ))
  return rows
}

function rowsAlerts(alerts: Alert[], w: number): string[] {
  const rows: string[] = []
  for (const a of alerts) {
    const icon = a.level === 'critical'
      ? `${A.brightRed}${sym.fail}${A.reset}`
      : `${A.brightYellow}${sym.warn}${A.reset}`
    const msgColor = a.level === 'critical' ? A.brightRed : A.brightYellow
    rows.push(bxRow(`${icon}  ${msgColor}${a.msg}${A.reset}`, w))
    a.actions.forEach((act, i) => {
      const conn = i < a.actions.length - 1 ? '├' : '└'
      rows.push(bxRow(`     ${A.gray}${conn}─ [${i + 1}] ${act}${A.reset}`, w))
    })
  }
  return rows
}

function rowsGraph(w: number): string[] {
  const sparkW = Math.max(10, w - 14)
  const rows = [
    bxRow(`${A.brightCyan}CPU  ${A.reset}${A.gray}${sparkline(_cpuHist.slice(-sparkW))}${A.reset}`, w),
    bxRow(`${A.brightGreen}MEM  ${A.reset}${A.gray}${sparkline(_memHist.slice(-sparkW))}${A.reset}`, w),
  ]
  return rows
}

function rowsKeybar(mode: TelemetryMode, w: number): string[] {
  const kb = (k: string, l: string) =>
    `${A.gray}[${A.reset}${A.brightYellow}${k}${A.reset}${A.gray}]${A.reset}${A.dim}${l}${A.reset}`
  const dot = `  ${A.gray}${sym.dot}${A.reset}  `
  const active = (m: TelemetryMode, k: string, l: string) =>
    mode === m ? `${A.bgBlue}${A.brightWhite}[${k}]${l}${A.reset}` : kb(k, l)
  const bindings = [
    active('expanded', 'e', 'expand'),
    active('graph', 'g', 'graph'),
    active('battle', 'b', 'battle'),
    active('infrastructure', 'i', 'infra'),
    kb('r', 'refresh'),
    kb('q', 'quit'),
  ].join(dot)
  return [bxRow(bindings, w)]
}

function rowsTitleBar(mode: TelemetryMode, snap: TelemetrySnapshot, w: number): string[] {
  const modeLabels: Record<TelemetryMode, string> = {
    compact: 'COMPACT', expanded: 'EXPANDED', battle: 'BATTLE',
    infrastructure: 'INFRA', graph: 'GRAPH', stream: 'STREAM',
  }
  const title = `${A.brightMagenta}${A.bold}${sym.robot}  LENSERFIGHT TELEMETRY${A.reset}`
  const modeTag = `${A.bgBlue}${A.brightWhite} ${modeLabels[mode]} ${A.reset}`
  const ts = `${A.gray}${snap.ts.toLocaleTimeString()}  ${sym.dot}  1s${A.reset}`
  return [bxRow(`${title}   ${modeTag}   ${ts}`, w)]
}

// ── Mode painters ─────────────────────────────────────────────────────────────

function paintCompact(snap: TelemetrySnapshot): void {
  const w = Math.min(76, process.stdout.columns || 76)
  const buf: string[] = [bxTop(w), ...rowsTitleBar('compact', snap, w), bxDiv(w)]
  buf.push(...rowsSystem(snap, w, false))
  if (snap.gpu.available) { buf.push(bxDiv(w)); buf.push(...rowsGpu(snap, w)) }
  buf.push(bxDiv(w))
  buf.push(...rowsServices(snap, w))
  buf.push(bxDiv(w))
  buf.push(...rowsBattles(snap, w))
  if (snap.alerts.length) { buf.push(bxDiv(w)); buf.push(...rowsAlerts(snap.alerts, w)) }
  buf.push(bxDiv(w))
  buf.push(...rowsKeybar('compact', w))
  buf.push(bxBot(w))
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintExpanded(snap: TelemetrySnapshot): void {
  const w = Math.min(process.stdout.columns || 100, 100)
  const buf: string[] = [bxTop(w), ...rowsTitleBar('expanded', snap, w), bxDiv(w)]
  buf.push(bxHead('SYSTEM RESOURCES', w))
  buf.push(...rowsSystem(snap, w, true))
  if (snap.gpu.available) { buf.push(bxDiv(w)); buf.push(bxHead('GPU', w)); buf.push(...rowsGpu(snap, w)) }
  buf.push(bxDiv(w))
  buf.push(bxHead('INFRASTRUCTURE SERVICES', w))
  buf.push(...rowsServices(snap, w))
  buf.push(bxDiv(w))
  buf.push(bxHead('BATTLE ORCHESTRATION', w))
  buf.push(...rowsBattles(snap, w))
  buf.push(bxDiv(w))
  buf.push(bxHead('RUNTIME GRAPHS', w))
  buf.push(...rowsGraph(w))
  if (snap.alerts.length) { buf.push(bxDiv(w)); buf.push(bxHead('ALERTS', w)); buf.push(...rowsAlerts(snap.alerts, w)) }
  buf.push(bxDiv(w))
  buf.push(...rowsKeybar('expanded', w))
  buf.push(bxBot(w))
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintBattle(snap: TelemetrySnapshot): void {
  const w = Math.min(process.stdout.columns || 88, 88)
  const cpuCol = snap.cpu.total >= 85 ? A.brightRed : snap.cpu.total >= 65 ? A.brightYellow : A.brightGreen
  const memCol = snap.mem.pct >= 85 ? A.brightRed : snap.mem.pct >= 65 ? A.brightYellow : A.brightGreen
  const buf: string[] = [bxTop(w), ...rowsTitleBar('battle', snap, w), bxDiv(w)]
  buf.push(bxRow(`${A.bold}${A.brightYellow}${sym.fight}  BATTLE OPERATIONS CENTER${A.reset}`, w))
  buf.push(bxDiv(w))
  buf.push(...rowsBattles(snap, w))
  buf.push(bxDiv(w))
  buf.push(bxRow(
    `${A.bold}RESOURCES ${A.reset} ${cpuCol}CPU ${snap.cpu.total}%${A.reset}  ${memCol}MEM ${snap.mem.pct}%${A.reset}` +
    (snap.gpu.available ? `  ${A.brightMagenta}GPU ${snap.gpu.utilPct}%  VRAM ${snap.gpu.vramUsedGb}/${snap.gpu.vramTotalGb}GB${A.reset}` : ''),
    w,
  ))
  buf.push(bxDiv(w))
  const ollama = snap.services.find(s => s.name === 'OLLAMA')
  const supa   = snap.services.find(s => s.name === 'SUPABASE')
  if (ollama) buf.push(bxRow(`${padR(`${A.bold}OLLAMA${A.reset}`, 16)}  ${svcLabel(ollama)}`, w))
  if (supa)   buf.push(bxRow(`${padR(`${A.bold}SUPABASE${A.reset}`, 16)}  ${svcLabel(supa)}`, w))
  if (snap.alerts.length) { buf.push(bxDiv(w)); buf.push(...rowsAlerts(snap.alerts, w)) }
  buf.push(bxDiv(w))
  buf.push(...rowsKeybar('battle', w))
  buf.push(bxBot(w))
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintInfra(snap: TelemetrySnapshot): void {
  const w = Math.min(process.stdout.columns || 80, 80)
  const buf: string[] = [bxTop(w), ...rowsTitleBar('infrastructure', snap, w), bxDiv(w)]
  buf.push(bxHead('INFRASTRUCTURE SERVICES', w))
  buf.push(...rowsServices(snap, w))
  buf.push(bxDiv(w))
  buf.push(bxRow(`${A.bold}HOST  ${A.reset}${A.gray}${os.hostname()}  ${os.platform()} ${os.arch()}  Node ${process.version}${A.reset}`, w))
  buf.push(bxRow(
    `${A.dim}CPU ${snap.cpu.total}%  MEM ${snap.mem.pct}%  LOAD ${snap.loadAvg[0].toFixed(2)} ${snap.loadAvg[1].toFixed(2)} ${snap.loadAvg[2].toFixed(2)}${A.reset}`,
    w,
  ))
  if (snap.alerts.length) { buf.push(bxDiv(w)); buf.push(...rowsAlerts(snap.alerts, w)) }
  buf.push(bxDiv(w))
  buf.push(...rowsKeybar('infrastructure', w))
  buf.push(bxBot(w))
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintGraph(snap: TelemetrySnapshot): void {
  const w = Math.min(process.stdout.columns || 80, 80)
  const buf: string[] = [bxTop(w), ...rowsTitleBar('graph', snap, w), bxDiv(w)]
  buf.push(bxHead(`RUNTIME GRAPHS  ${A.gray}(${HIST}s rolling window)`, w))
  buf.push(bxDiv(w))
  buf.push(...rowsGraph(w))
  buf.push(bxDiv(w))
  buf.push(bxRow(
    `${A.brightCyan}CPU${A.reset} ${snap.cpu.total}%  ${A.brightGreen}MEM${A.reset} ${snap.mem.pct}%` +
    (snap.gpu.available ? `  ${A.brightMagenta}GPU${A.reset} ${snap.gpu.utilPct}%` : ''),
    w,
  ))
  buf.push(bxDiv(w))
  buf.push(...rowsKeybar('graph', w))
  buf.push(bxBot(w))
  process.stdout.write(A.clearScreen + A.homeCursor + buf.join('\n') + '\n')
}

function paintStream(snap: TelemetrySnapshot): void {
  const parts = [
    snap.ts.toISOString(),
    `cpu=${snap.cpu.total}%`,
    `mem=${snap.mem.pct}%`,
    snap.gpu.available ? `gpu=${snap.gpu.utilPct}%` : null,
    `battles=${snap.battles.running}`,
    snap.alerts.length ? `alerts=${snap.alerts.length}` : null,
  ].filter((v): v is string => v !== null)
  process.stdout.write(parts.join('  ') + '\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtUptime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

async function collect(): Promise<TelemetrySnapshot> {
  const cpu = sampleCpu()
  const mem = sampleMem()
  const heap = process.memoryUsage()
  pushHist(cpu.total, mem.pct)
  return {
    ts: new Date(),
    cpu,
    mem,
    gpu: _gpu,
    services: _services,
    battles: _battles,
    alerts: buildAlerts(cpu, mem, _gpu, _services),
    processHeapMb: heap.heapUsed / 1024 / 1024,
    processUptimeSec: process.uptime(),
    loadAvg: os.loadavg() as [number, number, number],
    pid: process.pid,
  }
}

function paint(mode: TelemetryMode, snap: TelemetrySnapshot): void {
  if (mode === 'compact')        paintCompact(snap)
  else if (mode === 'expanded')  paintExpanded(snap)
  else if (mode === 'battle')    paintBattle(snap)
  else if (mode === 'infrastructure') paintInfra(snap)
  else if (mode === 'graph')     paintGraph(snap)
  else if (mode === 'stream')    paintStream(snap)
}

// ── Public entry point ────────────────────────────────────────────────────────

export interface TelemetryOptions {
  initialMode?: TelemetryMode
  intervalMs?: number
}

export async function runTelemetry(opts: TelemetryOptions = {}): Promise<void> {
  let mode: TelemetryMode = opts.initialMode ?? 'compact'
  const intervalMs = Math.max(250, opts.intervalMs ?? 1000)
  const isStream = mode === 'stream'

  if (!process.stdin.isTTY || isStream) {
    if (isStream) {
      void probeServices()
      void probeBattles()
      probeGpu()
      const tick = async () => { paint('stream', await collect()) }
      await tick()
      const t = setInterval(() => { void tick() }, intervalMs)
      await new Promise<void>((resolve) => {
        process.on('SIGINT', () => { clearInterval(t); resolve() })
        process.on('SIGTERM', () => { clearInterval(t); resolve() })
      })
      return
    }
    paint('compact', await collect())
    return
  }

  const out = process.stdout
  out.write(A.altScreenOn + A.hideCursor)

  let timer: NodeJS.Timeout | null = null
  let gpuTick = 0
  let svcTick = 0

  const cleanup = () => {
    if (timer) clearInterval(timer)
    timer = null
    try { process.stdin.setRawMode(false) } catch { /* */ }
    process.stdin.pause()
    out.write(A.showCursor + A.altScreenOff)
  }
  const exit = (code = 0) => { cleanup(); process.exit(code) }
  process.on('SIGINT', () => exit(130))
  process.on('SIGTERM', () => exit(143))

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf-8')

  const tick = async () => {
    gpuTick++; svcTick++
    if (gpuTick >= 5) { gpuTick = 0; probeGpu() }
    if (svcTick >= 5) { svcTick = 0; void probeServices() }
    void probeBattles()
    paint(mode, await collect())
  }

  process.stdin.on('data', (data: Buffer | string) => {
    const key = data.toString()
    if (key === '\x03' || key === 'q' || key === 'Q') { exit(0); return }
    const prev = mode
    if (key === 'e') mode = mode === 'expanded' ? 'compact' : 'expanded'
    else if (key === 'g') mode = mode === 'graph' ? 'compact' : 'graph'
    else if (key === 'b') mode = mode === 'battle' ? 'compact' : 'battle'
    else if (key === 'i') mode = mode === 'infrastructure' ? 'compact' : 'infrastructure'
    else if (key === 'r') { void tick(); return }
    if (mode !== prev) void tick()
  })

  // Fire background probes — don't wait; show placeholder state on first paint
  void probeServices()
  void probeBattles()
  probeGpu()

  await tick()
  timer = setInterval(() => { void tick() }, intervalMs)
}
