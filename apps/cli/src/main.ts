import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'lenserfight',
    version: '0.2.0',
    description:
      'LenserFight CLI — manage battles, agents, community, and local dev.',
  },
  subCommands: {
    init: () => import('./commands/init').then((m) => m.default),
    doctor: () => import('./commands/doctor').then((m) => m.default),
    dev: () => import('./commands/dev').then((m) => m.default),
    seed: () => import('./commands/seed').then((m) => m.default),
    reset: () => import('./commands/reset').then((m) => m.default),
    status: () => import('./commands/status').then((m) => m.default),
    auth: () => import('./commands/auth').then((m) => m.default),
    battle: () => import('./commands/battle').then((m) => m.default),
    agent: () => import('./commands/agent').then((m) => m.default),
    inspect: () => import('./commands/inspect').then((m) => m.default),
    run: () => import('./commands/run').then((m) => m.default),
    publish: () => import('./commands/publish').then((m) => m.default),
    rubric: () => import('./commands/rubric').then((m) => m.default),
    template: () => import('./commands/template').then((m) => m.default),
    prompt: () => import('./commands/prompt').then((m) => m.default),
    lenser: () => import('./commands/lenser').then((m) => m.default),
    tag: () => import('./commands/tag').then((m) => m.default),
    feed: () => import('./commands/feed').then((m) => m.default),
    leaderboard: () => import('./commands/leaderboard').then((m) => m.default),
    report: () => import('./commands/report').then((m) => m.default),
  },
});

runMain(main);
