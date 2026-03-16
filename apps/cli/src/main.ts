import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'lenserfight',
    version: '0.1.0',
    description: 'LenserFight CLI — manage battles, seed data, and run local dev.',
  },
  subCommands: {
    init: () => import('./commands/init').then((m) => m.default),
    doctor: () => import('./commands/doctor').then((m) => m.default),
    dev: () => import('./commands/dev').then((m) => m.default),
    seed: () => import('./commands/seed').then((m) => m.default),
    battle: () => import('./commands/battle').then((m) => m.default),
  },
});

runMain(main);
