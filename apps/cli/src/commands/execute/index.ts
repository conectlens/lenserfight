import { defineCommand } from 'citty'

/**
 * Unified execution surface: workflow runs, battles, lens prompts, team dispatch.
 * Delegates to existing commands — single professional entry point for developers.
 */
export default defineCommand({
  meta: {
    name: 'execute',
    description:
      'Run and observe AI executions: workflows, battles, lens prompts, and team runs.',
  },
  subCommands: {
    status: () =>
      import('../execution').then((m) => {
        const sub = (m.default as { subCommands?: Record<string, unknown> }).subCommands
        return sub?.['status'] as ReturnType<typeof defineCommand>
      }),
    workflow: defineCommand({
      meta: {
        name: 'workflow',
        description: 'Workflow run execution: list, inspect, wait, cancel, stream events.',
      },
      subCommands: {
        list: () => import('../execution').then((m) => m.default.subCommands?.['list'] as never),
        inspect: () => import('../execution').then((m) => m.default.subCommands?.['inspect'] as never),
        wait: () => import('../execution').then((m) => m.default.subCommands?.['wait'] as never),
        cancel: () => import('../execution').then((m) => m.default.subCommands?.['cancel'] as never),
        retry: () => import('../execution').then((m) => m.default.subCommands?.['retry'] as never),
        events: () => import('../execution').then((m) => m.default.subCommands?.['events'] as never),
        provenance: () =>
          import('../execution').then((m) => m.default.subCommands?.['provenance'] as never),
        stream: () => import('./workflow-stream').then((m) => m.default),
      },
    }),
    battle: defineCommand({
      meta: {
        name: 'battle',
        description: 'Battle AI execution: cloud exec, dispatch, file workspace, jobs.',
      },
      subCommands: {
        exec: () => import('../battle').then((m) => m.default.subCommands?.['exec'] as never),
        dispatch: () => import('../battle').then((m) => m.default.subCommands?.['dispatch'] as never),
        jobs: () => import('../battle').then((m) => m.default.subCommands?.['jobs'] as never),
        schedule: () => import('../battle').then((m) => m.default.subCommands?.['schedule'] as never),
        'file-run': () => import('./battle-file-run').then((m) => m.default),
      },
    }),
    lens: defineCommand({
      meta: {
        name: 'lens',
        description: 'Execute a lens or model prompt (BYOK, Ollama, or cloud RPC).',
      },
      subCommands: {
        prompt: () => import('../run').then((m) => m.default.subCommands?.['exec'] as never),
        run: () => import('../models').then((m) => m.default.subCommands?.['run'] as never),
      },
    }),
    prompt: defineCommand({
      meta: {
        name: 'prompt',
        description: 'Alias for `lf execute lens prompt` — direct model execution.',
      },
      async run(ctx) {
        const run = await import('../run')
        const exec = run.default.subCommands?.['exec'] as { run?: (c: typeof ctx) => Promise<void> }
        return exec?.run?.(ctx)
      },
    }),
    team: defineCommand({
      meta: {
        name: 'team',
        description: 'Dispatch an AI lenser team run (agent workspace).',
      },
      subCommands: {
        dispatch: () => import('../team').then((m) => m.default.subCommands?.['dispatch'] as never),
        list: () => import('../team').then((m) => m.default.subCommands?.['list'] as never),
      },
    }),
  },
})
