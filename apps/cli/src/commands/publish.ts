import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { writeFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// publish battle
// ---------------------------------------------------------------------------
const battle = defineCommand({
  meta: {
    name: 'battle',
    description: 'Publish a closed battle result page.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID to publish',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_publish', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle published: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// publish results
// ---------------------------------------------------------------------------
const results = defineCommand({
  meta: {
    name: 'results',
    description: 'Export result data as JSON or CSV to stdout or a file.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Output format: json | csv',
      default: 'json',
    },
    out: {
      type: 'string',
      description: 'Output file path (defaults to stdout)',
    },
  },
  async run({ args }) {
    if (args.format !== 'json' && args.format !== 'csv') {
      consola.error('Invalid --format "%s". Must be one of: json, csv', args.format);
      process.exitCode = 1;
      return;
    }

    try {
      const data = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_results_export',
        { p_battle_id: args.id }
      );

      if (!data) {
        consola.warn('No results found for battle: %s', args.id);
        return;
      }

      let output: string;
      if (args.format === 'csv') {
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]).join(',');
          const rows = data.map((r) =>
            Object.values(r).map((v) => JSON.stringify(v ?? '')).join(',')
          );
          output = [headers, ...rows].join('\n');
        } else {
          output = '';
        }
      } else {
        output = JSON.stringify(data, null, 2);
      }

      if (args.out) {
        writeFileSync(args.out, output, 'utf-8');
        consola.success('Results written to %s', args.out);
      } else {
        process.stdout.write(output + '\n');
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// publish report
// ---------------------------------------------------------------------------
const report = defineCommand({
  meta: {
    name: 'report',
    description: 'Generate a markdown summary report for a finalized battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    out: {
      type: 'string',
      description: 'Output file path (defaults to stdout)',
    },
  },
  async run({ args }) {
    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.warn('Battle not found or not public.');
        return;
      }

      const lines: string[] = [
        `# Battle Report: ${battle.title || 'Untitled'}`,
        '',
        `**ID:** ${battle.id}`,
        `**Status:** ${battle.status}`,
        `**Slug:** ${battle.slug}`,
        '',
        '## Task',
        '',
        String(battle.task_prompt || '_(no prompt)_'),
        '',
        '## Vote Summary',
        '',
        `| Contender A | Draw | Contender B |`,
        `|:-----------:|:----:|:-----------:|`,
        `| ${battle.vote_count_a ?? 0} | ${battle.vote_count_draw ?? 0} | ${battle.vote_count_b ?? 0} |`,
        '',
      ];

      if (battle.winner_contender_id) {
        lines.push(`## Winner`, '', `Contender: \`${battle.winner_contender_id}\``, '');
      }

      const scorecards = battle.scorecards as Array<Record<string, unknown>> | undefined;
      if (scorecards?.length) {
        lines.push('## Scorecards', '');
        lines.push('| Contender | Criterion | Result |');
        lines.push('|-----------|-----------|--------|');
        for (const s of scorecards) {
          lines.push(
            `| ${String(s.contender_id || '-').substring(0, 8)} | ${s.criterion_title || s.rubric_criterion_id || '-'} | ${s.result || '-'} |`
          );
        }
        lines.push('');
      }

      const output = lines.join('\n');

      if (args.out) {
        writeFileSync(args.out, output, 'utf-8');
        consola.success('Report written to %s', args.out);
      } else {
        process.stdout.write(output + '\n');
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish battle results and artifacts: battle, results, report.',
  },
  subCommands: {
    battle,
    results,
    report,
  },
});
