import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

export default defineCommand({
  meta: {
    name: 'inspect',
    description: 'Inspect a battle: contenders, submissions, votes, scorecards.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output full JSON',
      default: false,
    },
    section: {
      type: 'string',
      description: 'Show only a section: contenders, submissions, votes, scorecards',
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

      if (args.json) {
        printJson(battle);
        return;
      }

      // Header
      consola.info('=== Battle: %s ===', battle.title || 'Untitled');
      consola.info('ID:     %s', battle.id);
      consola.info('Status: %s', battle.status);
      consola.info('Slug:   %s', battle.slug);
      consola.info('');

      // Task
      if (!args.section || args.section === 'task') {
        consola.info('--- Task ---');
        consola.info(String(battle.task_prompt || '(no prompt)'));
        consola.info('');
      }

      // Contenders
      const contenders = battle.contenders as Array<Record<string, unknown>> | undefined;
      if ((!args.section || args.section === 'contenders') && contenders?.length) {
        consola.info('--- Contenders ---');
        printTable(
          ['Slot', 'Type', 'Name', 'ID'],
          contenders.map((c) => [
            String(c.slot || '-'),
            String(c.contender_type || '-'),
            String(c.display_name || '-'),
            String(c.id || '-').substring(0, 8),
          ])
        );
        consola.info('');
      }

      // Submissions
      const submissions = battle.submissions as Array<Record<string, unknown>> | undefined;
      if ((!args.section || args.section === 'submissions') && submissions?.length) {
        consola.info('--- Submissions ---');
        for (const s of submissions) {
          consola.info(
            '  [%s] %s — %s',
            String(s.status || '-'),
            String(s.contender_id || '-').substring(0, 8),
            s.content_text
              ? String(s.content_text).substring(0, 80) + '...'
              : '(no text)'
          );
        }
        consola.info('');
      }

      // Votes
      const votes = battle.votes as Array<Record<string, unknown>> | undefined;
      if ((!args.section || args.section === 'votes') && votes?.length) {
        consola.info('--- Votes ---');
        consola.info(
          '  A: %s  B: %s  Draw: %s',
          battle.vote_count_a ?? 0,
          battle.vote_count_b ?? 0,
          battle.vote_count_draw ?? 0
        );
        for (const v of votes) {
          consola.info(
            '  %s — %s',
            String(v.vote_value || '-'),
            v.rationale ? String(v.rationale).substring(0, 60) : '(no rationale)'
          );
        }
        consola.info('');
      }

      // Scorecards
      const scorecards = battle.scorecards as Array<Record<string, unknown>> | undefined;
      if ((!args.section || args.section === 'scorecards') && scorecards?.length) {
        consola.info('--- Scorecards ---');
        printTable(
          ['Contender', 'Criterion', 'Result', 'Explanation'],
          scorecards.map((s) => [
            String(s.contender_id || '-').substring(0, 8),
            String(s.criterion_title || s.rubric_criterion_id || '-'),
            String(s.result || '-'),
            String(s.explanation || '-').substring(0, 40),
          ])
        );
        consola.info('');
      }

      // Winner
      if (battle.winner_contender_id) {
        consola.info('Winner: %s', String(battle.winner_contender_id).substring(0, 8));
      }
    } catch (err) {
      handleError(err);
    }
  },
});
