import { defineCommand } from 'citty'
import type { TelemetryMode } from '../tui/runtime-telemetry'

const VALID_MODES: TelemetryMode[] = ['compact', 'expanded', 'battle', 'infrastructure', 'graph', 'stream']

function resolveMode(raw: string | undefined, fallback: TelemetryMode): TelemetryMode {
  return VALID_MODES.includes(raw as TelemetryMode) ? (raw as TelemetryMode) : fallback
}

const monitorCmd = defineCommand({
  meta: { name: 'monitor', description: 'Expanded runtime telemetry — all panels, per-core CPUs, graphs.' },
  args: {
    interval: { type: 'string', description: 'Refresh interval in ms', default: '1000' },
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({ initialMode: 'expanded', intervalMs: parseInt(args.interval) || 1000 })
  },
})

const battleCmd = defineCommand({
  meta: { name: 'battle', description: 'Battle operations center — battle load, agents, resource pressure.' },
  args: {
    interval: { type: 'string', description: 'Refresh interval in ms', default: '1000' },
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({ initialMode: 'battle', intervalMs: parseInt(args.interval) || 1000 })
  },
})

const graphCmd = defineCommand({
  meta: { name: 'graph', description: 'Rolling sparkline graphs for CPU and memory (60s window).' },
  args: {
    interval: { type: 'string', description: 'Refresh interval in ms', default: '1000' },
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({ initialMode: 'graph', intervalMs: parseInt(args.interval) || 1000 })
  },
})

const infraCmd = defineCommand({
  meta: { name: 'infra', description: 'Infrastructure view — service connectivity, host info.' },
  args: {
    interval: { type: 'string', description: 'Refresh interval in ms', default: '1000' },
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({ initialMode: 'infrastructure', intervalMs: parseInt(args.interval) || 1000 })
  },
})

const streamCmd = defineCommand({
  meta: { name: 'stream', description: 'Scrolling telemetry stream — pipe-friendly, no alt screen.' },
  args: {
    interval: { type: 'string', description: 'Refresh interval in ms', default: '1000' },
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({ initialMode: 'stream', intervalMs: parseInt(args.interval) || 1000 })
  },
})

export default defineCommand({
  meta: {
    name: 'top',
    description: 'Real-time runtime telemetry — CPU, memory, GPU, services, battles. Keys: [e]xpand [g]raph [b]attle [i]nfra [r]efresh [q]uit',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Initial mode: compact (default) | expanded | battle | infrastructure | graph | stream',
      default: 'compact',
    },
    interval: {
      type: 'string',
      description: 'Refresh interval in milliseconds (default: 1000)',
      default: '1000',
    },
  },
  subCommands: {
    monitor: monitorCmd,
    battle:  battleCmd,
    graph:   graphCmd,
    infra:   infraCmd,
    stream:  streamCmd,
  },
  async run({ args }) {
    const { runTelemetry } = await import('../tui/runtime-telemetry')
    await runTelemetry({
      initialMode: resolveMode(args.mode, 'compact'),
      intervalMs: parseInt(args.interval) || 1000,
    })
  },
})
