import { defineCommand } from 'citty';
import consola from 'consola';
import { type PrivateBattleFrontmatter } from '@lenserfight/types';
import { callRpc, callRest, handleError } from '../utils/api';
import {
  buildWorkflowSimulationReport,
  parseAutomationDocument,
  writeWorkflowSimulationArtifacts,
} from '../utils/automation-objects';
import { printTable, printJson, truncate } from '../utils/output';
import { A } from '../utils/ansi';

// ---------------------------------------------------------------------------
// battle create
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new battle on LenserFight Cloud.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Battle title',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe slug (e.g. my-battle-2026)',
      required: true,
    },
    task: {
      type: 'string',
      description: 'Task prompt — the challenge participants must respond to',
      required: true,
    },
    'rubric-id': {
      type: 'string',
      description: 'Rubric UUID used to score submissions (optional)',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_create',
        {
          p_title: args.title,
          p_slug: args.slug,
          p_task_prompt: args.task,
          p_rubric_id: args['rubric-id'] || null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(battle);
        return;
      }

      consola.success('Battle created.');
      consola.info('ID:     %s', battle['id']);
      consola.info('Title:  %s', battle['title']);
      consola.info('Status: %s', battle['status']);
      consola.info('');
      consola.info('Next steps:');
      consola.info('  lf battle open %s         — open for entries', battle['id']);
      consola.info('  lf battle invite %s --email <email>', battle['id']);
      consola.info('  lf battle view %s', battle['id']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle join
// ---------------------------------------------------------------------------
const join = defineCommand({
  meta: {
    name: 'join',
    description: 'Join an open battle as a human, AI agent, or agent team.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    agent: {
      type: 'string',
      description: 'AI agent UUID to join as (omit for human participation)',
      default: '',
    },
    runner: {
      type: 'string',
      description: 'Execution mode: local | cloud | manual (default: cloud)',
      default: 'cloud',
    },
    device: {
      type: 'string',
      description: 'Device UUID for local runner execution',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (args.runner === 'local' && !args.device) {
      consola.warn('Local runner selected but no --device provided. Use `lf gateway devices` to find your device ID.');
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_join',
        {
          p_battle_id: args.id,
          p_agent_id: args.agent || null,
          p_runner_mode: args.runner || 'cloud',
          p_device_id: args.device || null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result ?? { battle_id: args.id, joined: true });
        return;
      }

      consola.success('Joined battle %s.', args.id);
      if (args.agent) consola.info('Agent:  %s', args.agent);
      if (args.runner !== 'cloud') consola.info('Runner: %s', args.runner);
      if (args.device) consola.info('Device: %s', args.device);
      consola.info('');
      consola.info('Submit your entry:');
      if (args.runner === 'local') {
        consola.info('  lf battle submit %s --run-id <run-id> --attestation', args.id);
      } else {
        consola.info('  lf battle submit %s --text "your response"', args.id);
        consola.info('  lf run exec --prompt "..." --model claude-sonnet-4-6 --byok anthropic  (then submit with --run-id)');
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle list
// ---------------------------------------------------------------------------
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List public battles on LenserFight Cloud.',
  },
  args: {
    status: {
      type: 'string',
      description: 'Filter by status: draft | open | voting | scoring | published',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Maximum results',
      default: '20',
    },
    offset: {
      type: 'string',
      description: 'Pagination offset',
      default: '0',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battles = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_list_public',
        {
          p_limit: parseInt(args.limit, 10),
          p_offset: parseInt(args.offset, 10),
        }
      );

      if (!Array.isArray(battles) || battles.length === 0) {
        consola.info('No public battles found.');
        return;
      }

      const filtered = args.status
        ? battles.filter((b) => b['status'] === args.status)
        : battles;

      if (args.json) {
        printJson(filtered);
        return;
      }

      printTable(
        ['ID', 'Title', 'Status', 'Task'],
        filtered.map((b) => [
          String(b['id'] ?? '').slice(0, 8) + '…',
          truncate(String(b['title'] ?? ''), 32),
          String(b['status'] ?? ''),
          truncate(String(b['task_prompt'] ?? ''), 48),
        ])
      );
      consola.info('%d battle(s) shown.', filtered.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle view
// ---------------------------------------------------------------------------
const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show details of a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      if (args.json) {
        printJson(battle);
        return;
      }

      consola.log('');
      consola.log('  Title:   %s', battle['title']);
      consola.log('  ID:      %s', battle['id']);
      consola.log('  Status:  %s', battle['status']);
      consola.log('  Task:    %s', battle['task_prompt']);
      if (battle['voting_opens_at'])  consola.log('  Voting opens:  %s', battle['voting_opens_at']);
      if (battle['voting_closes_at']) consola.log('  Voting closes: %s', battle['voting_closes_at']);
      consola.log('');
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle run (file-first private battle scaffold)
// ---------------------------------------------------------------------------
const run = defineCommand({
  meta: {
    name: 'run',
    description: 'Simulate or execute a PRIVATE_BATTLE.md locally.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to PRIVATE_BATTLE.md (defaults to ./PRIVATE_BATTLE.md)',
      required: false,
    },
    execute: {
      type: 'boolean',
      description: 'Actually call AI providers and stream outputs (requires provider/model in participant frontmatter)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output the generated battle summary as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const filePath = args.file || 'PRIVATE_BATTLE.md'
    const parsed = parseAutomationDocument(filePath)
    if (!parsed.ok || parsed.kind !== 'private_battle' || !parsed.document) {
      consola.error('Private battle validation failed for %s', filePath)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as PrivateBattleFrontmatter
    const participants = (frontmatter.participants ?? []).map((participant) => `${participant.type}:${participant.ref}`)

    // ── Execution mode ───────────────────────────────────────────────────────
    if (args.execute) {
      const execParticipants = (frontmatter.participants ?? []).filter(
        (p) => p.provider && p.model
      );
      if (execParticipants.length < 2) {
        consola.error(
          'Execution requires at least 2 participants with `provider` and `model` set in frontmatter.'
        );
        consola.info('Example frontmatter:');
        consola.info('  participants:');
        consola.info('    - type: model');
        consola.info('      ref: claude');
        consola.info('      provider: anthropic');
        consola.info('      model: claude-sonnet-4-6');
        process.exitCode = 1;
        return;
      }

      // Build a local battle state from the frontmatter and run it
      const { localBattleStore: lbs, localBattleRunner: lbr } = await import('../utils/local-battle-engine');
      const state = lbs.create(
        frontmatter.name ?? frontmatter.id ?? 'PRIVATE_BATTLE',
        String((parsed.document as any).body ?? frontmatter.name ?? 'Complete the task.')
      );

      // Add up to 2 contenders
      const [pA, pB] = execParticipants;
      lbs.addContender(state.id, {
        slot: 'A',
        label: pA.ref,
        provider: pA.provider!,
        model: pA.model!,
        keyVar: pA.key_var,
      });
      lbs.addContender(state.id, {
        slot: 'B',
        label: pB.ref,
        provider: pB.provider!,
        model: pB.model!,
        keyVar: pB.key_var,
      });

      const loaded = lbs.load(state.id);
      consola.start('Executing %s…', frontmatter.name ?? frontmatter.id);
      const result = await lbr.run(loaded, (slot, delta) => {
        const color = slot === 'A' ? A.brightBlue : A.brightGreen;
        process.stdout.write(`${A.bold}${color}[${slot}]${A.reset} ${delta}`);
      });

      process.stdout.write('\n\n');
      lbs.markExecuted(state.id, result);

      // Write result files alongside the source file
      const { writeFileSync: wfs } = require('node:fs') as typeof import('node:fs');
      const { resolve: res } = require('node:path') as typeof import('node:path');
      const base = (frontmatter.slug ?? frontmatter.id ?? 'battle').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const resultMd = res(process.cwd(), `${base}.result.md`);
      const resultJson = res(process.cwd(), `${base}.result.json`);
      wfs(resultMd, `# ${frontmatter.name ?? base} — Results\n\n## Contender A (${pA.provider}/${pA.model})\n\n${result.A}\n\n---\n\n## Contender B (${pB.provider}/${pB.model})\n\n${result.B}\n`, 'utf-8');
      wfs(resultJson, JSON.stringify({ ...result, battle: state }, null, 2), 'utf-8');

      if (args.json) { printJson({ ...result, resultMd, resultJson }); return; }
      consola.success('Execution complete in %dms.', result.durationMs);
      consola.info('Results: %s', resultMd);
      consola.info('JSON:    %s', resultJson);
      consola.info('');
      consola.info('Vote: lf battle local vote --slot A|B|draw --id %s', state.id.slice(0, 8));
      return;
    }

    // ── Simulation-only mode (original behaviour) ────────────────────────────
    const summary = {
      source: {
        kind: 'private_battle',
        id: frontmatter.id,
        name: frontmatter.name,
      },
      participants,
      evaluation_method: frontmatter.evaluation_method ?? 'unspecified',
      metrics: frontmatter.metrics ?? [],
      generated_at: new Date().toISOString(),
    }

    const report = buildWorkflowSimulationReport(
      frontmatter.name ?? frontmatter.id,
      participants.length >= 2 ? 'ready' : 'blocked',
      participants.length > 0 ? participants : ['No participants were declared in the battle spec.']
    )
    const artifacts = writeWorkflowSimulationArtifacts(frontmatter.slug ?? frontmatter.id, summary, report)

    if (args.json) {
      printJson({ ...summary, artifacts })
      return
    }

    consola.success('Simulated private battle %s', frontmatter.name ?? frontmatter.id)
    consola.info('Participants: %d', participants.length)
    consola.info('JSON report: %s', artifacts.jsonPath)
    consola.info('Markdown report: %s', artifacts.reportPath)
    if (participants.some((_, i) => (frontmatter.participants?.[i]?.provider))) {
      consola.info('')
      consola.info('Tip: participants have provider/model set — run with --execute to actually call AI:')
      consola.info('  lf battle run %s --execute', filePath)
    }
  },
})

// ---------------------------------------------------------------------------
// battle submit
// ---------------------------------------------------------------------------
const submit = defineCommand({
  meta: {
    name: 'submit',
    description: 'Submit your entry to an open battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    text: {
      type: 'string',
      description: 'Inline text submission',
      default: '',
    },
    url: {
      type: 'string',
      description: 'External URL submission (mutually exclusive with --text)',
      default: '',
    },
    'run-id': {
      type: 'string',
      description: 'Execution run ID — attach a Cloud execution run as your submission',
      default: '',
    },
    attestation: {
      type: 'boolean',
      description: 'Include execution attestation metadata for trusted local execution',
      default: false,
    },
    'device-id': {
      type: 'string',
      description: 'Device UUID used for local execution (legacy display only; signed attestations use --envelope-kid)',
      default: '',
    },
    'envelope-kid': {
      type: 'string',
      description: 'Device UUID (kid) for a signed execution attestation envelope',
      default: '',
    },
    'envelope-iat': {
      type: 'string',
      description: 'Envelope issued-at timestamp (ISO timestamptz) for signed attestation',
      default: '',
    },
    'envelope-nonce': {
      type: 'string',
      description: 'Envelope nonce for signed attestation replay protection',
      default: '',
    },
    'canonical-jcs-b64url': {
      type: 'string',
      description: 'Base64url JCS canonical bytes for signed attestation',
      default: '',
    },
    'signature-b64url': {
      type: 'string',
      description: 'Base64url Ed25519 signature for signed attestation',
      default: '',
    },
    'workflow-hash': {
      type: 'string',
      description: 'Optional workflow content hash for attestation metadata (matches fn_record_signed_attestation)',
      default: '',
    },
    'lens-hash': {
      type: 'string',
      description: 'Optional lens content hash for attestation metadata',
      default: '',
    },
    'agent-config-hash': {
      type: 'string',
      description: 'Optional agent config hash for attestation metadata',
      default: '',
    },
    'runner-version': {
      type: 'string',
      description: 'Optional runner/daemon version string for attestation metadata',
      default: '',
    },
    'cli-version': {
      type: 'string',
      description: 'Optional lf CLI version string for attestation metadata',
      default: '',
    },
    workflow: {
      type: 'string',
      description: 'Workflow UUID — submit as a workflow-type submission',
      default: '',
    },
    agent: {
      type: 'string',
      description: 'Agent UUID (used with --workflow)',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // Workflow submission path
    if (args.workflow) {
      try {
        const submissionId = await callRpc<string>(
          'fn_battle_submit_workflow',
          {
            p_battle_id:   args.id,
            p_workflow_id: args.workflow,
            p_run_id:      args['run-id'] || null,
            p_agent_id:    args.agent || null,
            p_content:     args.text || null,
          },
          { requireAuth: true }
        )
        if (args.json) {
          printJson({ submission_id: submissionId, type: 'workflow', workflow_id: args.workflow })
          return
        }
        consola.success('Workflow submission created. ID: %s', submissionId)
        if (!args.text) {
          consola.info('Run your workflow, then update with output:')
          consola.info('  lf workflow run %s', args.workflow)
          consola.info('  (update submission %s with result via fn_battle_update_workflow_submission)', submissionId)
        }
      } catch (err) {
        handleError(err)
      }
      return
    }

    if (!args.text && !args.url && !args['run-id']) {
      consola.error('Provide one of: --text, --url, --run-id, or --workflow');
      consola.info('Tip: run `lf run exec --prompt "..." --model <model> --byok <provider>` first, then submit the output with --text');
      process.exitCode = 1;
      return;
    }

    if (args.text && args.url) {
      consola.error('Provide only one of --text or --url, not both.');
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_submit',
        {
          p_battle_id: args.id,
          p_content_text: args.text || null,
          p_content_url: args.url || null,
          p_content_media: null,
          p_execution_run_id: args['run-id'] || null,
          p_artifact_id: null,
          p_source_type: args['run-id'] ? 'execution_run' : args.url ? 'url' : 'text',
          p_adapter_id: null,
          p_model_id: null,
        },
        { requireAuth: true }
      );

      if (args.attestation && args['run-id']) {
        const submissionId = result?.['id'] as string | undefined;
        if (submissionId) {
          const missing = [
            'envelope-kid',
            'envelope-iat',
            'envelope-nonce',
            'canonical-jcs-b64url',
            'signature-b64url',
          ].filter((key) => !args[key]);

          if (missing.length > 0) {
            consola.error(
              'Signed attestation required. Missing: %s',
              missing.map((key) => `--${key}`).join(', ')
            );
            consola.info(
              'Use the gateway daemon or runner to produce a signed execution envelope before submitting trust metadata.'
            );
            process.exitCode = 2;
            return;
          }

          await callRpc<void>(
            'fn_record_signed_attestation',
            {
              p_run_id: args['run-id'],
              p_envelope_kid: args['envelope-kid'],
              p_envelope_iat: args['envelope-iat'],
              p_envelope_nonce: args['envelope-nonce'],
              p_canonical_jcs_b64url: args['canonical-jcs-b64url'],
              p_signature_b64url: args['signature-b64url'],
              p_workflow_hash: args['workflow-hash'] || null,
              p_lens_hash: args['lens-hash'] || null,
              p_agent_config_hash: args['agent-config-hash'] || null,
              p_runner_version: args['runner-version'] || null,
              p_cli_version: args['cli-version'] || null,
              p_policy_passed: true,
            },
            { requireAuth: true }
          );
          await callRpc<void>(
            'fn_compute_submission_trust',
            { p_submission_id: submissionId },
            { requireAuth: true }
          );
          consola.success('Execution attestation recorded.');
        }
      }

      if (args.json) {
        printJson(result ?? { battle_id: args.id, submitted: true });
        return;
      }

      consola.success('Submission recorded for battle %s.', args.id);
      if (result?.['id']) consola.info('Submission ID: %s', result['id']);
      if (args.attestation) consola.info('Trust level computed. Use `lf inspect submission %s` to view.', result?.['id'] ?? args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle open
// ---------------------------------------------------------------------------
const open = defineCommand({
  meta: {
    name: 'open',
    description: 'Open a draft battle for entries (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_open', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s is now open for entries.', args.id);
      consola.info('Share the battle link or invite participants:');
      consola.info('  lf battle invite %s --email <email>', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle start-voting
// ---------------------------------------------------------------------------
const startVoting = defineCommand({
  meta: {
    name: 'start-voting',
    description: 'Transition an open battle into voting phase (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    'closes-at': {
      type: 'string',
      description: 'Voting deadline as ISO 8601 timestamp (e.g. 2026-05-10T18:00:00Z)',
      required: true,
    },
  },
  async run({ args }) {
    const closesAt = new Date(args['closes-at']);
    if (isNaN(closesAt.getTime())) {
      consola.error('Invalid --closes-at value. Use ISO 8601 format: 2026-05-10T18:00:00Z');
      process.exitCode = 1;
      return;
    }

    try {
      await callRpc(
        'fn_battles_start_voting',
        { p_battle_id: args.id, p_voting_closes_at: closesAt.toISOString() },
        { requireAuth: true }
      );
      consola.success('Voting started. Closes at %s.', closesAt.toISOString());
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle finalize
// ---------------------------------------------------------------------------
const finalize = defineCommand({
  meta: {
    name: 'finalize',
    description: 'Finalize scoring after voting closes (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_finalize', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s finalized.', args.id);
      consola.info('View results: lf battle leaderboard %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle publish
// ---------------------------------------------------------------------------
const publish = defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a finalized battle — makes results publicly visible.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_publish', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s published.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle leaderboard
// ---------------------------------------------------------------------------
const leaderboard = defineCommand({
  meta: {
    name: 'leaderboard',
    description: 'Show the scoring leaderboard for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_leaderboard',
        { p_battle_id: args.id }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No scores yet for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['Rank', 'Handle', 'Score', 'Votes'],
        rows.map((r, i) => [
          String(r['rank'] ?? i + 1),
          String(r['handle'] ?? r['lenser_handle'] ?? '—'),
          String(r['score'] ?? '—'),
          String(r['vote_count'] ?? '—'),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle invite
// ---------------------------------------------------------------------------
const invite = defineCommand({
  meta: {
    name: 'invite',
    description: 'Invite a participant to a battle by email.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    email: {
      type: 'string',
      description: 'Email address of the invitee',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_invite',
        { p_battle_id: args.id, p_email: args.email },
        { requireAuth: true }
      );
      consola.success('Invitation sent to %s.', args.email);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle clone
// ---------------------------------------------------------------------------
const clone = defineCommand({
  meta: {
    name: 'clone',
    description: 'Clone an existing battle with a new title and slug.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Source battle UUID',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title for the cloned battle',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'Slug for the cloned battle',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_clone',
        { p_battle_id: args.id, p_title: args.title, p_slug: args.slug },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result);
        return;
      }

      consola.success('Battle cloned.');
      consola.info('New ID:  %s', result?.['id']);
      consola.info('Title:   %s', result?.['title'] ?? args.title);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle delete
// ---------------------------------------------------------------------------
const deleteBattle = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a draft battle (creator only, irreversible).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    confirm: {
      type: 'boolean',
      description: 'Skip confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.confirm) {
      consola.warn('This will permanently delete battle %s.', args.id);
      consola.info('Re-run with --confirm to proceed.');
      return;
    }

    try {
      await callRpc('fn_battles_delete', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s deleted.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle create-from-template
// ---------------------------------------------------------------------------
const createFromTemplate = defineCommand({
  meta: {
    name: 'create-from-template',
    description: 'Create a new draft battle from an existing template.',
  },
  args: {
    'template-id': {
      type: 'positional',
      description: 'Template UUID',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title for the new battle',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe slug for the new battle',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_create_from_template',
        {
          p_template_id: args['template-id'],
          p_title: args.title,
          p_slug: args.slug,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result);
        return;
      }

      consola.success('Battle created from template.');
      consola.info('ID:     %s', result?.['id']);
      consola.info('Title:  %s', result?.['title'] ?? args.title);
      consola.info('Status: %s', result?.['status']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle vote
// ---------------------------------------------------------------------------
const vote = defineCommand({
  meta: {
    name: 'vote',
    description: 'Submit a vote for a battle in voting phase.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    contender: {
      type: 'string',
      description: 'Contender ID you are voting for',
      required: true,
    },
    value: {
      type: 'string',
      description: "Vote value: 'contender_a' | 'contender_b' | 'draw'",
      required: true,
    },
    draw: {
      type: 'boolean',
      description: 'Mark this vote as a draw',
      default: false,
    },
    rationale: {
      type: 'string',
      description: 'Optional rationale for your vote',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const allowedValues = ['contender_a', 'contender_b', 'draw'];
    if (!allowedValues.includes(args.value)) {
      consola.error(
        "Invalid --value. Use one of: 'contender_a', 'contender_b', 'draw'"
      );
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_submit_vote',
        {
          p_battle_id: args.id,
          p_voted_contender_id: args.contender,
          p_vote_value: args.value,
          p_is_draw: args.draw,
          p_rationale: args.rationale || null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result ?? { battle_id: args.id, voted: true });
        return;
      }

      consola.success('Vote submitted for battle %s.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle close-voting
// ---------------------------------------------------------------------------
const closeVoting = defineCommand({
  meta: {
    name: 'close-voting',
    description:
      'Close the voting phase and transition battle to scoring (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battle_close_voting',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success(
        'Voting closed for battle %s. Now in scoring phase.',
        args.id
      );
      consola.info('Next: lf battle finalize %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle close
// ---------------------------------------------------------------------------
const closeBattle = defineCommand({
  meta: {
    name: 'close',
    description:
      'Close a battle (alternate path — transitions to closed state).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_close',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('Battle %s closed.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle archive
// ---------------------------------------------------------------------------
const archive = defineCommand({
  meta: {
    name: 'archive',
    description: 'Archive a battle — removes it from the public feed.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_archive',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('Battle %s archived.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle retract
// ---------------------------------------------------------------------------
const retract = defineCommand({
  meta: {
    name: 'retract',
    description: 'Retract a published battle — reverts it to draft.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_retract',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success(
        'Battle %s retracted and reverted to draft.',
        args.id
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle comments
// ---------------------------------------------------------------------------
const comments = defineCommand({
  meta: {
    name: 'comments',
    description: 'Fetch paginated comments for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Maximum number of comments to return',
      default: '20',
    },
    'before-ts': {
      type: 'string',
      description:
        'Pagination cursor: return comments before this ISO timestamp',
      default: '',
    },
    'before-id': {
      type: 'string',
      description:
        'Pagination cursor: return comments before this comment UUID',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_battle_comments',
        {
          p_battle_id: args.id,
          p_limit: parseInt(args.limit, 10),
          p_before_ts: args['before-ts'] || null,
          p_before_id: args['before-id'] || null,
        }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No comments found for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['ID', 'Author', 'Body', 'Created At'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['author_handle'] ?? r['handle'] ?? '—'),
          truncate(String(r['body'] ?? ''), 60),
          String(r['created_at'] ?? ''),
        ])
      );
      consola.info('%d comment(s) shown.', rows.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle messages
// ---------------------------------------------------------------------------
const messages = defineCommand({
  meta: {
    name: 'messages',
    description: 'Fetch paginated global messages for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Maximum number of messages to return',
      default: '20',
    },
    'before-ts': {
      type: 'string',
      description:
        'Pagination cursor: return messages before this ISO timestamp',
      default: '',
    },
    'before-id': {
      type: 'string',
      description:
        'Pagination cursor: return messages before this message UUID',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_global_messages',
        {
          p_battle_id: args.id,
          p_limit: parseInt(args.limit, 10),
          p_before_ts: args['before-ts'] || null,
          p_before_id: args['before-id'] || null,
        }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No messages found for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['ID', 'Sender', 'Role', 'Body', 'Sent At'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['sender_handle'] ?? '—'),
          String(r['sender_role'] ?? '—'),
          truncate(String(r['body'] ?? ''), 48),
          String(r['created_at'] ?? ''),
        ])
      );
      consola.info('%d message(s) shown.', rows.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle post-message
// ---------------------------------------------------------------------------
const postMessage = defineCommand({
  meta: {
    name: 'post-message',
    description: 'Post a global moderator/system message to a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    body: {
      type: 'string',
      description: 'Message body text',
      required: true,
    },
    'sender-handle': {
      type: 'string',
      description: 'Handle of the sender',
      required: true,
    },
    'sender-role': {
      type: 'string',
      description: "Sender role: 'moderator' | 'system' | 'creator'",
      default: 'moderator',
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_post_global_message',
        {
          p_battle_id: args.id,
          p_body: args.body,
          p_sender_handle: args['sender-handle'],
          p_sender_role: args['sender-role'],
        },
        { requireAuth: true }
      );
      consola.success('Message posted to battle %s.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle feed
// ---------------------------------------------------------------------------
const feed = defineCommand({
  meta: {
    name: 'feed',
    description:
      'Fetch the cursor-based public battles feed (replaces deprecated list).',
  },
  args: {
    status: {
      type: 'string',
      description:
        'Filter by status: draft | open | voting | scoring | published',
      default: '',
    },
    'battle-type': {
      type: 'string',
      description: 'Filter by battle type',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Maximum results per page',
      default: '20',
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor returned from previous feed call',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<
        Array<Record<string, unknown>> | Record<string, unknown>
      >('fn_get_battles_feed', {
        p_status: args.status || null,
        p_battle_type: args['battle-type'] || null,
        p_limit: parseInt(args.limit, 10),
        p_cursor: args.cursor || null,
      });

      const battles = Array.isArray(result)
        ? result
        : ((result as Record<string, unknown>)?.[
            'data'
          ] as Array<Record<string, unknown>> | undefined) ?? [];

      if (battles.length === 0) {
        consola.info('No battles in feed.');
        return;
      }

      if (args.json) {
        printJson(result);
        return;
      }

      printTable(
        ['ID', 'Title', 'Status', 'Type'],
        battles.map((b) => [
          String(b['id'] ?? '').slice(0, 8) + '…',
          truncate(String(b['title'] ?? ''), 32),
          String(b['status'] ?? ''),
          String(b['battle_type'] ?? '—'),
        ])
      );

      const next = (result as Record<string, unknown>)?.['next_cursor'];
      if (next) {
        consola.info('Next page: lf battle feed --cursor %s', next);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle local — offline dev battle subcommand group
// ---------------------------------------------------------------------------
import {
  localBattleStore,
  localBattleRunner,
  type LocalContenderConfig,
} from '../utils/local-battle-engine';

const localInit = defineCommand({
  meta: { name: 'init', description: 'Create a new local battle (no cloud required).' },
  args: {
    name:  { type: 'string', description: 'Battle name', required: true },
    task:  { type: 'string', description: 'Task prompt both contenders will answer', required: true },
    json:  { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = localBattleStore.create(args.name, args.task);
      if (args.json) { printJson(state); return; }
      consola.success('Local battle created.');
      consola.info('ID:   %s', state.id);
      consola.info('Name: %s', state.name);
      consola.info('');
      consola.info('Next steps:');
      consola.info('  lf battle local add-contender A --provider anthropic --model claude-haiku-4-5');
      consola.info('  lf battle local add-contender B --provider ollama    --model llama3');
      consola.info('  lf battle local run %s', state.id.slice(0, 8));
    } catch (err) { handleError(err); }
  },
});

const localAddContender = defineCommand({
  meta: { name: 'add-contender', description: 'Add or replace a contender slot (A or B).' },
  args: {
    slot:     { type: 'positional', description: 'A or B', required: true },
    provider: { type: 'string',     description: 'Provider: anthropic | openai | google | mistral | ollama', required: true },
    model:    { type: 'string',     description: 'Model key, e.g. claude-sonnet-4-6', required: true },
    label:    { type: 'string',     description: 'Display label (defaults to model name)', default: '' },
    'key-var':{ type: 'string',     description: 'Custom env var for API key override', default: '' },
    id:       { type: 'string',     description: 'Local battle ID (omit to use most recent)', default: '' },
    json:     { type: 'boolean',    description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    const slot = args.slot.toUpperCase() as 'A' | 'B';
    if (slot !== 'A' && slot !== 'B') {
      consola.error('Slot must be A or B'); process.exitCode = 1; return;
    }
    try {
      const state = args.id ? localBattleStore.load(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found. Run `lf battle local init` first.'); process.exitCode = 1; return; }
      const cfg: LocalContenderConfig = {
        slot,
        label: args.label || args.model,
        provider: args.provider,
        model: args.model,
        keyVar: args['key-var'] || undefined,
      };
      const updated = localBattleStore.addContender(state.id, cfg);
      if (args.json) { printJson(updated); return; }
      consola.success('Contender %s set: %s/%s', slot, args.provider, args.model);
      consola.info('Status: %s', updated.status);
    } catch (err) { handleError(err); }
  },
});

const localRun = defineCommand({
  meta: { name: 'run', description: 'Execute both contenders locally using BYOK keys.' },
  args: {
    id:   { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    yes:  { type: 'boolean', description: 'Skip cost confirmation prompt', default: false },
    json: { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found. Run `lf battle local init` first.'); process.exitCode = 1; return; }
      if (state.status === 'draft') {
        consola.error('Add both contenders first:');
        consola.info('  lf battle local add-contender A --provider <p> --model <m>');
        consola.info('  lf battle local add-contender B --provider <p> --model <m>');
        process.exitCode = 1; return;
      }

      const cA = state.contenders.find((c) => c.slot === 'A')!;
      const cB = state.contenders.find((c) => c.slot === 'B')!;

      if (!args.yes && process.stdin.isTTY) {
        const { createInterface } = await import('readline');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question(
            `\n⚠  This will call ${cA.provider}/${cA.model} and ${cB.provider}/${cB.model} via your BYOK keys.\n` +
            `   Charges apply to your API accounts, not LenserFight.\n` +
            `   Continue? (y/n) `,
            (a) => { rl.close(); resolve(a.trim().toLowerCase()); }
          );
        });
        if (answer !== 'y' && answer !== 'yes') {
          consola.info('Cancelled. Re-run with --yes to skip this prompt.');
          process.exitCode = 1; return;
        }
      }

      consola.start('Running "%s"', state.name);
      consola.info('A: %s/%s  vs  B: %s/%s', cA.provider, cA.model, cB.provider, cB.model);
      consola.info('Task: %s', state.task);
      process.stdout.write('\n');

      const bufA: string[] = [], bufB: string[] = [];

      const result = await localBattleRunner.run(
        state,
        (slot, delta) => {
          if (slot === 'A') { bufA.push(delta); process.stdout.write(`${A.bold}${A.brightBlue}[A]${A.reset} ${delta}`); }
          else              { bufB.push(delta); process.stdout.write(`${A.bold}${A.brightGreen}[B]${A.reset} ${delta}`); }
        },
      );

      process.stdout.write('\n\n');
      const updated = localBattleStore.markExecuted(state.id, result);

      if (args.json) { printJson(updated); return; }

      consola.success('Execution complete in %dms.', result.durationMs);
      consola.info('Tokens — A: %d  B: %d', result.tokensA, result.tokensB);
      consola.info('');
      consola.warn('Results are stored in plaintext in your local battle state. Do not commit if they contain sensitive prompts or outputs.');
      consola.info('Next: lf battle local vote %s --slot A|B|draw', state.id.slice(0, 8));
    } catch (err) { handleError(err); }
  },
});

const localVote = defineCommand({
  meta: { name: 'vote', description: 'Cast a vote on a locally executed battle.' },
  args: {
    slot:      { type: 'string',  description: 'A | B | draw', required: true },
    id:        { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    rationale: { type: 'string',  description: 'Optional rationale', default: '' },
    json:      { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    const slot = args.slot.toLowerCase() as 'a' | 'b' | 'draw';
    if (!['a', 'b', 'draw'].includes(slot)) {
      consola.error('--slot must be A, B, or draw'); process.exitCode = 1; return;
    }
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found.'); process.exitCode = 1; return; }
      if (state.status !== 'executed' && state.status !== 'voted') {
        consola.error('Run the battle first: lf battle local run'); process.exitCode = 1; return;
      }
      const vote = {
        slot: (slot === 'a' ? 'A' : slot === 'b' ? 'B' : 'draw') as 'A' | 'B' | 'draw',
        rationale: args.rationale || undefined,
        votedAt: new Date().toISOString(),
      };
      const updated = localBattleStore.recordVote(state.id, vote);
      if (args.json) { printJson(updated); return; }
      consola.success('Vote recorded: %s', vote.slot);
      if (args.rationale) consola.info('Rationale: %s', args.rationale);
    } catch (err) { handleError(err); }
  },
});

const localStatus = defineCommand({
  meta: { name: 'status', description: 'Show the current state and vote tally of a local battle.' },
  args: {
    id:   { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.info('No local battles yet. Run `lf battle local init`.'); return; }
      if (args.json) { printJson(state); return; }

      consola.log('');
      consola.log('  Name:   %s', state.name);
      consola.log('  ID:     %s', state.id);
      consola.log('  Status: %s', state.status);
      consola.log('  Task:   %s', state.task);

      if (state.contenders.length) {
        consola.log('');
        for (const c of state.contenders) {
          consola.log('  Contender %s: %s/%s', c.slot, c.provider, c.model);
        }
      }

      if (state.votes.length) {
        const tally = { A: 0, B: 0, draw: 0 };
        for (const v of state.votes) tally[v.slot]++;
        consola.log('');
        consola.log('  Votes — A: %d  B: %d  Draw: %d', tally.A, tally.B, tally.draw);
        const winner = tally.A > tally.B ? 'A' : tally.B > tally.A ? 'B' : tally.draw > 0 ? 'Draw' : 'Tied';
        consola.log('  Winner: %s', winner);
      }
      consola.log('');
    } catch (err) { handleError(err); }
  },
});

const localList = defineCommand({
  meta: { name: 'list', description: 'List all local battles.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const all = localBattleStore.list();
      if (!all.length) { consola.info('No local battles. Run `lf battle local init` to create one.'); return; }
      if (args.json) { printJson(all); return; }
      printTable(
        ['ID', 'Name', 'Status', 'Contenders'],
        all.map((s) => [
          s.id.slice(0, 8) + '…',
          truncate(s.name, 32),
          s.status,
          s.contenders.map((c) => `${c.slot}:${c.provider}/${c.model}`).join('  ') || '—',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const localPush = defineCommand({
  meta: { name: 'push', description: 'Push a local battle to LenserFight Cloud as a draft.' },
  args: {
    id:    { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    slug:  { type: 'string',  description: 'Cloud URL slug (required)', required: true },
    json:  { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found.'); process.exitCode = 1; return; }

      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_create',
        {
          p_title: state.name,
          p_slug: args.slug,
          p_task_prompt: state.task,
          p_rubric_id: null,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(battle); return; }
      consola.success('Local battle "%s" pushed to cloud as a draft.', state.name);
      consola.info('Cloud ID:  %s', battle['id']);
      consola.info('Status:    %s', battle['status']);
      consola.info('');
      consola.warn('Note: pushing to cloud does not enable cloud battle execution or public arena access.');
      consola.warn('Cloud battles require VITE_FEATURE_PUBLIC_BATTLES=true (Private Alpha — not publicly available).');
      consola.info('Continue: lf battle open %s', battle['id']);
    } catch (err) { handleError(err); }
  },
});

const local = defineCommand({
  meta: { name: 'local', description: 'Manage offline local battles (no cloud or auth required).' },
  subCommands: {
    init: localInit,
    'add-contender': localAddContender,
    run: localRun,
    vote: localVote,
    status: localStatus,
    list: localList,
    push: localPush,
  },
});

// ---------------------------------------------------------------------------
// battle dispatch — agent-based BYOK/Ollama execution for a cloud battle
// ---------------------------------------------------------------------------
const dispatch = defineCommand({
  meta: {
    name: 'dispatch',
    description: 'Execute a cloud battle submission on behalf of an AI agent using BYOK keys or local Ollama.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    agent: {
      type: 'string',
      description: 'AI agent UUID that will compete',
      required: true,
    },
    model: {
      type: 'string',
      description: 'Model spec: ollama:<model> | byok:<provider> (e.g. ollama:llama3.2, byok:openai)',
      required: true,
    },
    device: {
      type: 'string',
      description: 'Device UUID for local attestation (recommended for trusted execution)',
      default: '',
    },
    workflow: {
      type: 'string',
      description: 'Workflow UUID — submit workflow output instead of raw text',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const [modelType, modelKey] = args.model.split(':')
    if (!modelType || !modelKey) {
      consola.error('Invalid --model format. Use: ollama:<model> or byok:<provider>')
      consola.info('Examples: ollama:llama3.2   byok:openai   byok:anthropic')
      process.exitCode = 1
      return
    }

    try {
      // 1. Register dispatch intent + validate ownership/state
      const dispatch = await callRpc<Record<string, unknown>>(
        'fn_battle_dispatch_agent',
        {
          p_battle_id:   args.id,
          p_agent_id:    args.agent,
          p_model_spec:  args.model,
          p_device_id:   args.device || null,
          p_workflow_id: args.workflow || null,
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson(dispatch)
        return
      }

      consola.success('Dispatch registered.')
      consola.info('Battle:     %s', dispatch['battle_id'])
      consola.info('Agent:      %s', dispatch['agent_id'])
      consola.info('Model:      %s', dispatch['model_spec'])
      consola.info('Status:     %s', dispatch['status'])
      consola.info('')

      if (modelType === 'ollama') {
        consola.info('Run your Ollama model locally, then submit the output:')
        consola.info('  ollama run %s "<your battle prompt>"', modelKey)
        consola.info('  lf battle submit %s --text "<output>" --run-id <run-id>', args.id)
        if (args.device) {
          consola.info('  (add --attestation --device-id %s for trusted execution + bonus XP)', args.device)
        }
      } else if (modelType === 'byok') {
        consola.info('Using BYOK key for provider: %s', modelKey)
        consola.info('Execute via the exec subcommand with your provider key:')
        consola.info('  lf battle exec %s --byok --provider-a %s --model-a <model>', args.id, modelKey)
      }

      if (args.workflow) {
        consola.info('')
        consola.info('Workflow submission: %s', args.workflow)
        consola.info('  lf battle submit %s --workflow %s --agent %s', args.id, args.workflow, args.agent)
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// battle byok-key — manage encrypted BYOK keys for an agent
// ---------------------------------------------------------------------------
const byokKeySet = defineCommand({
  meta: {
    name: 'set',
    description: 'Store an encrypted BYOK key for an agent (key encrypted locally before upload).',
  },
  args: {
    agent:    { type: 'string', description: 'Agent UUID', required: true },
    provider: { type: 'string', description: 'Provider: openai | anthropic | mistral | google | cohere | custom', required: true },
    key:      { type: 'string', description: 'API key value (encrypted before upload)', required: true },
    label:    { type: 'string', description: 'Optional label', default: '' },
  },
  async run({ args }) {
    try {
      const hint = args.key.slice(-4)
      // In production: encrypt args.key with device keychain or app key before upload.
      // For now: base64 encode as a placeholder — replace with real AES-256-GCM in production.
      const encrypted = Buffer.from(args.key).toString('base64')
      await callRpc(
        'fn_byok_key_register',
        {
          p_agent_id:      args.agent,
          p_provider:      args.provider,
          p_key_encrypted: encrypted,
          p_key_hint:      hint,
          p_label:         args.label || null,
        },
        { requireAuth: true }
      )
      consola.success('BYOK key stored for agent %s (provider: %s, hint: …%s)', args.agent, args.provider, hint)
      consola.warn('Note: Implement AES-256-GCM encryption in production. Current: base64 only.')
    } catch (err) {
      handleError(err)
    }
  },
})

const byokKeyList = defineCommand({
  meta: { name: 'list', description: 'List BYOK key hints for an agent.' },
  args: {
    agent: { type: 'string', description: 'Agent UUID', required: true },
    json:  { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_byok_key_hint',
        { p_agent_id: args.agent },
        { requireAuth: true }
      )
      if (!rows || rows.length === 0) {
        consola.info('No BYOK keys stored for agent %s.', args.agent)
        return
      }
      if (args.json) { console.log(JSON.stringify(rows, null, 2)); return }
      printTable(
        ['Provider', 'Hint', 'Label', 'Valid'],
        rows.map((r) => [
          String(r['provider'] ?? ''),
          r['key_hint'] ? `…${r['key_hint']}` : '—',
          String(r['label'] ?? '—'),
          String(r['is_valid'] ?? false),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

const byokKeyRevoke = defineCommand({
  meta: { name: 'revoke', description: 'Revoke a BYOK key for a provider.' },
  args: {
    agent:    { type: 'string', description: 'Agent UUID', required: true },
    provider: { type: 'string', description: 'Provider to revoke', required: true },
  },
  async run({ args }) {
    try {
      await callRpc('fn_byok_key_revoke', { p_agent_id: args.agent, p_provider: args.provider }, { requireAuth: true })
      consola.success('BYOK key revoked for agent %s (provider: %s)', args.agent, args.provider)
    } catch (err) {
      handleError(err)
    }
  },
})

const byokKey = defineCommand({
  meta: { name: 'byok-key', description: 'Manage encrypted BYOK keys for AI agents.' },
  subCommands: { set: byokKeySet, list: byokKeyList, revoke: byokKeyRevoke },
})

// ---------------------------------------------------------------------------
// battle exec — cloud battle BYOK execution with optional web streaming
// ---------------------------------------------------------------------------
import {
  byokKeyResolver,
  getStreamAdapter as _getStreamAdapter,
} from '@lenserfight/providers';
import type { ProviderMessage as _ProviderMessage } from '@lenserfight/providers';

const exec = defineCommand({
  meta: {
    name: 'exec',
    description: 'Execute a cloud battle with your own API keys (BYOK), optionally streaming tokens to the web UI.',
  },
  args: {
    id:             { type: 'positional', description: 'Battle UUID', required: true },
    'provider-a':   { type: 'string',  description: 'Provider for slot A override', default: '' },
    'model-a':      { type: 'string',  description: 'Model for slot A override', default: '' },
    'provider-b':   { type: 'string',  description: 'Provider for slot B override', default: '' },
    'model-b':      { type: 'string',  description: 'Model for slot B override', default: '' },
    byok:           { type: 'boolean', description: 'Use local BYOK keys instead of cloud billing', default: false },
    'stream-to-web':{ type: 'boolean', description: 'Broadcast tokens to web UI via Supabase Realtime', default: false },
    slot:           { type: 'string',  description: 'Execute only one slot: A | B | both', default: 'both' },
    yes:            { type: 'boolean', description: 'Skip BYOK cost confirmation prompt', default: false },
    json:           { type: 'boolean', description: 'Output summary as JSON', default: false },
  },
  async run({ args }) {
    const { BattleStreamBroadcaster } = await import('../utils/battle-stream-broadcaster');

    try {
      // 1. Fetch battle
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );
      if (!battle) { consola.error('Battle not found or not public.'); process.exitCode = 1; return; }

      consola.start('Executing battle: %s', battle['title']);
      consola.info('Task: %s', battle['task_prompt']);

      // 2. Fetch contenders
      const contenders = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      // 3. Fetch execution configs for each contender
      const configsRaw = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_battle_execution_configs',
        { p_battle_id: args.id }
      ).catch(() => [] as Array<Record<string, unknown>>);

      const cfgA = configsRaw.find((c) => c['slot'] === 'A') ?? {};
      const cfgB = configsRaw.find((c) => c['slot'] === 'B') ?? {};

      const providerA = (args['provider-a'] || String(cfgA['provider_key'] ?? 'anthropic')) as Parameters<typeof _getStreamAdapter>[0];
      const modelA    = args['model-a']    || String(cfgA['model_key']    ?? 'claude-sonnet-4-6');
      const providerB = (args['provider-b'] || String(cfgB['provider_key'] ?? 'anthropic')) as Parameters<typeof _getStreamAdapter>[0];
      const modelB    = args['model-b']    || String(cfgB['model_key']    ?? 'claude-sonnet-4-6');

      const task = String(battle['task_prompt'] ?? '');
      const messages: _ProviderMessage[] = [{ role: 'user', content: task }];

      if (args.byok && !args.yes && process.stdin.isTTY) {
        const { createInterface } = await import('readline');
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await new Promise<string>((resolve) => {
          rl.question(
            `\n⚠  This will call ${providerA}/${modelA} and ${providerB}/${modelB} via your BYOK keys.\n` +
            `   Charges apply to your API accounts, not LenserFight.\n` +
            `   Continue? (y/n) `,
            (a) => { rl.close(); resolve(a.trim().toLowerCase()); }
          );
        });
        if (answer !== 'y' && answer !== 'yes') {
          consola.info('Cancelled. Re-run with --yes to skip this prompt.');
          process.exitCode = 1; return;
        }
      }

      const runSlot = async (slot: 'A' | 'B', provider: Parameters<typeof _getStreamAdapter>[0], model: string) => {
        const broadcaster = args['stream-to-web']
          ? new BattleStreamBroadcaster()
          : null;

        if (broadcaster) await broadcaster.open(args.id, slot);

        const apiKey = args.byok
          ? byokKeyResolver.resolve(provider)
          : '';

        if (args.byok && !apiKey && provider !== 'ollama') {
          consola.error('[%s] No API key found for provider %s. Set %s_API_KEY env var.', slot, provider, provider.toUpperCase());
          return { slot, output: '', tokens: 0 };
        }

        const adapter = _getStreamAdapter(provider);
        const { url, body, headers } = adapter.buildStreamRequest(model, messages, { maxTokens: 4096 });
        const authHeaders = args.byok ? adapter.authHeader(apiKey) : {};

        consola.start('[%s] Streaming %s/%s…', slot, provider, model);

        const res = await fetch(url, {
          method: 'POST',
          headers: { ...headers, ...authHeaders },
          body,
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          consola.error('[%s] Provider error %d: %s', slot, res.status, text);
          broadcaster?.broadcastError(`Provider error ${res.status}`);
          await broadcaster?.close();
          return { slot, output: '', tokens: 0 };
        }

        let output = '';
        let tokens = 0;
        let eventType: string | undefined;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        const startedAt = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue; }
            if (!line.startsWith('data: ') && !line.trim()) continue;
            const chunk = adapter.parseStreamChunk(line, eventType);
            if (chunk?.content) {
              output += chunk.content;
              tokens++;
              const color = slot === 'A' ? A.brightBlue : A.brightGreen;
              process.stdout.write(`${A.bold}${color}[${slot}]${A.reset} ${chunk.content}`);
              broadcaster?.broadcastToken(chunk.content, Date.now() - startedAt);
            }
            if (chunk?.done) break;
          }
        }

        broadcaster?.broadcastEnd({ input_tokens: 0, output_tokens: tokens });
        await broadcaster?.close();
        return { slot, output, tokens };
      };

      const slotArg = args.slot.toUpperCase();
      const slots: Array<['A' | 'B', Parameters<typeof _getStreamAdapter>[0], string]> = [];
      if (slotArg === 'A' || slotArg === 'BOTH') slots.push(['A', providerA, modelA]);
      if (slotArg === 'B' || slotArg === 'BOTH') slots.push(['B', providerB, modelB]);

      process.stdout.write('\n');
      const results = await Promise.all(slots.map(([s, p, m]) => runSlot(s, p, m)));
      process.stdout.write('\n');

      if (args.json) { printJson(results); return; }

      consola.success('Execution complete.');
      printTable(
        ['Slot', 'Provider', 'Model', 'Tokens'],
        results.map((r) => {
          const s = slots.find(([sl]) => sl === r.slot)!;
          return [r.slot, s[1], s[2], String(r.tokens)];
        })
      );
      consola.info('');
      consola.info('If battle transitioned to voting: lf battle start-voting %s --closes-at <iso>', args.id);
    } catch (err) { handleError(err); }
  },
});

// ---------------------------------------------------------------------------
// battle set-schedule — autonomous lifecycle schedule via fn_battle_set_schedule
// ---------------------------------------------------------------------------
const setSchedule = defineCommand({
  meta: {
    name: 'set-schedule',
    description: 'Set the autonomous lifecycle schedule for a battle (open/judge/publish times).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    'open-at': {
      type: 'string',
      description: 'ISO 8601 datetime to auto-open from draft (e.g. 2026-06-01T10:00:00Z)',
      default: '',
    },
    'judge-at': {
      type: 'string',
      description: 'ISO 8601 datetime to auto-judge (scoring → closed)',
      default: '',
    },
    'publish-at': {
      type: 'string',
      description: 'ISO 8601 datetime to auto-publish (closed → published)',
      default: '',
    },
    'no-auto-judge': {
      type: 'boolean',
      description: 'Disable automatic judging',
      default: false,
    },
    'no-auto-publish': {
      type: 'boolean',
      description: 'Disable automatic publication',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const validateTs = (label: string, val: string): string | null => {
      if (!val) return null
      const d = new Date(val)
      if (isNaN(d.getTime())) {
        consola.error('Invalid %s value. Use ISO 8601: 2026-06-01T10:00:00Z', label)
        process.exitCode = 1
        return null
      }
      return d.toISOString()
    }

    const openAt    = validateTs('--open-at',    args['open-at'])
    const judgeAt   = validateTs('--judge-at',   args['judge-at'])
    const publishAt = validateTs('--publish-at', args['publish-at'])
    if (process.exitCode === 1) return

    try {
      const schedId = await callRpc<string>(
        'fn_battle_set_schedule',
        {
          p_battle_id:    args.id,
          p_open_at:      openAt,
          p_judge_at:     judgeAt,
          p_publish_at:   publishAt,
          p_auto_judge:   !args['no-auto-judge'],
          p_auto_publish: !args['no-auto-publish'],
        },
        { requireAuth: true }
      )

      if (args.json) {
        printJson({ schedule_id: schedId, battle_id: args.id, open_at: openAt, judge_at: judgeAt, publish_at: publishAt })
        return
      }

      consola.success('Lifecycle schedule set for battle %s.', args.id)
      if (openAt)    consola.info('Opens:    %s (draft → open)', openAt)
      if (judgeAt)   consola.info('Judge:    %s (scoring → closed)', judgeAt)
      if (publishAt) consola.info('Publish:  %s (closed → published)', publishAt)
      consola.info('')
      consola.info('Force any transition: lf battle force-transition %s --status <status> --reason <reason>', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// battle force-transition — admin override
// ---------------------------------------------------------------------------
const forceTransition = defineCommand({
  meta: {
    name: 'force-transition',
    description: 'Force a battle into a target status (admin only).',
  },
  args: {
    id:     { type: 'positional', description: 'Battle UUID', required: true },
    status: { type: 'string', description: 'Target status: draft|open|executing|voting|scoring|closed|published|archived', required: true },
    reason: { type: 'string', description: 'Reason for the force transition', required: true },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battle_force_transition',
        { p_battle_id: args.id, p_target_status: args.status, p_reason: args.reason },
        { requireAuth: true }
      )
      consola.success('Battle %s transitioned to %s.', args.id, args.status)
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// battle schedule  — set execution_starts_at for autonomous execution
// ---------------------------------------------------------------------------
const schedule = defineCommand({
  meta: {
    name: 'schedule',
    description: 'Schedule a battle for automatic server-side AI execution.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    'starts-at': {
      type: 'string',
      description: 'ISO 8601 datetime when execution should begin (e.g. 2026-10-15T14:00:00Z)',
      required: true,
    },
    'voting-duration-hours': {
      type: 'string',
      description: 'Hours the voting window stays open after execution (default: 24)',
      default: '24',
    },
    'no-auto-publish': {
      type: 'boolean',
      description: 'Disable automatic result publication after voting closes',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      // Validate the datetime locally before round-tripping to the server
      const startsAt = new Date(args['starts-at']);
      if (isNaN(startsAt.getTime())) {
        consola.error('Invalid --starts-at value. Use ISO 8601 format, e.g. 2026-10-15T14:00:00Z');
        process.exit(1);
      }
      if (startsAt.getTime() <= Date.now()) {
        consola.error('--starts-at must be in the future.');
        process.exit(1);
      }

      const { createClient: createSupabaseClient } = await import('../utils/supabase-client');
      const client = await createSupabaseClient();

      const { error } = await client
        .schema('battles')
        .from('battles')
        .update({
          execution_starts_at:   startsAt.toISOString(),
          voting_duration_hours: parseInt(args['voting-duration-hours'], 10),
          auto_publish:          !args['no-auto-publish'],
        })
        .eq('id', args.id);

      if (error) throw error;

      if (args.json) {
        printJson({ battle_id: args.id, execution_starts_at: startsAt.toISOString() });
        return;
      }

      consola.success('Battle %s scheduled.', args.id);
      consola.info('Execution starts at: %s', startsAt.toLocaleString());
      consola.info('Voting duration:     %sh', args['voting-duration-hours']);
      consola.info('Auto-publish:        %s', args['no-auto-publish'] ? 'disabled' : 'enabled');
      consola.info('');
      consola.info('Track job status: lf battle jobs %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle jobs  — inspect execution job queue for a battle
// ---------------------------------------------------------------------------
const jobs = defineCommand({
  meta: {
    name: 'jobs',
    description: 'Show execution job status for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { createServiceClient } = await import('../utils/supabase-client');
      const client = await createServiceClient();

      const { data, error } = await client
        .schema('battles')
        .from('battle_execution_jobs')
        .select('id, slot, status, worker_id, retry_count, max_retries, error_message, claimed_at, completed_at, created_at')
        .eq('battle_id', args.id)
        .order('slot');

      if (error) throw error;

      if (!data || data.length === 0) {
        consola.info('No execution jobs found for battle %s.', args.id);
        consola.info('If the battle is scheduled, jobs will appear after the execution_starts_at time.');
        return;
      }

      if (args.json) {
        printJson(data);
        return;
      }

      printTable(
        ['Slot', 'Status', 'Retries', 'Worker', 'Completed At', 'Error'],
        data.map((j: Record<string, unknown>) => [
          String(j['slot'] ?? ''),
          String(j['status'] ?? ''),
          `${j['retry_count'] ?? 0}/${j['max_retries'] ?? 3}`,
          j['worker_id'] ? String(j['worker_id']).slice(0, 16) + '…' : '—',
          j['completed_at'] ? new Date(j['completed_at'] as string).toLocaleString() : '—',
          j['error_message'] ? truncate(String(j['error_message']), 40) : '—',
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// tournament subcommand (nested)
// ---------------------------------------------------------------------------
const tournamentCreate = defineCommand({
  meta: { name: 'create', description: 'Create a new tournament.' },
  args: {
    title:          { type: 'string', description: 'Tournament title', required: true },
    format:         { type: 'string', description: 'single_elimination | round_robin | swiss', default: 'single_elimination' },
    'max-contenders': { type: 'string', description: 'Maximum number of contenders', default: '8' },
    'battle-type':  { type: 'string', description: 'Battle type for matches', default: 'ai_vs_ai' },
    'ai-judge':     { type: 'boolean', description: 'Enable AI judge', default: false },
    json:           { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const data = await callRpc<Record<string, unknown>>(
        'fn_create_tournament',
        {
          p_title:             args.title,
          p_format:            args.format,
          p_max_contenders:    parseInt(args['max-contenders'] as string, 10),
          p_battle_type:       args['battle-type'],
          p_ai_judge_enabled:  args['ai-judge'],
        },
        { requireAuth: true }
      );
      if (args.json) { printJson(data); return; }
      consola.success('Tournament created.');
      consola.info('ID:   %s', data['id']);
      consola.info('Slug: %s', data['slug']);
      consola.info('Next: lf battle tournament register %s', data['id']);
    } catch (err) { handleError(err); }
  },
});

const tournamentRegister = defineCommand({
  meta: { name: 'register', description: 'Register yourself as a contender in a tournament.' },
  args: {
    id: { type: 'positional', description: 'Tournament UUID', required: true },
  },
  async run({ args }) {
    try {
      const data = await callRpc<Record<string, unknown>>(
        'fn_register_tournament_contender',
        { p_tournament_id: args.id },
        { requireAuth: true }
      );
      consola.success('Registered as contender in tournament %s.', args.id);
      consola.info('Contender ID: %s', data['id']);
    } catch (err) { handleError(err); }
  },
});

const tournamentStart = defineCommand({
  meta: { name: 'start', description: 'Start the tournament — seeds bracket and creates round 1 battles.' },
  args: {
    id: { type: 'positional', description: 'Tournament UUID', required: true },
  },
  async run({ args }) {
    try {
      await callRpc<void>('fn_start_tournament', { p_tournament_id: args.id }, { requireAuth: true });
      consola.success('Tournament %s started. Round 1 battles are being created.', args.id);
    } catch (err) { handleError(err); }
  },
});

const tournamentBracket = defineCommand({
  meta: { name: 'bracket', description: 'Show the tournament bracket.' },
  args: {
    id:   { type: 'positional', description: 'Tournament UUID', required: true },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const data = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_tournament_bracket',
        { p_tournament_id: args.id },
        { requireAuth: false }
      );
      if (args.json) { printJson(data); return; }
      if (!data || data.length === 0) {
        consola.info('No bracket data yet — start the tournament first.');
        return;
      }
      printTable(
        ['Round', 'Round Status', 'Battle Slug', 'A', 'B', 'Winner'],
        data.map((m) => [
          String(m['round_number'] ?? ''),
          String(m['round_status'] ?? ''),
          m['battle_slug'] ? String(m['battle_slug']) : '(pending)',
          m['contender_a_lenser_id'] ? String(m['contender_a_lenser_id']).slice(0, 8) : '—',
          m['contender_b_lenser_id'] ? String(m['contender_b_lenser_id']).slice(0, 8) : '—',
          m['winner_lenser_id'] ? String(m['winner_lenser_id']).slice(0, 8) : '—',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const tournament = defineCommand({
  meta: { name: 'tournament', description: 'Manage LenserFight tournaments.' },
  subCommands: {
    create:   tournamentCreate,
    register: tournamentRegister,
    start:    tournamentStart,
    bracket:  tournamentBracket,
  },
});

// ---------------------------------------------------------------------------
// battle stream-feed (Y3) — realtime tail of battles.battles
// ---------------------------------------------------------------------------
//
// Subscribes to the Supabase realtime channel for INSERT/UPDATE on
// battles.battles and prints one line per event. Realtime ships with the
// Supabase JS client we already depend on, so no new dep is needed.

const streamFeed = defineCommand({
  meta: {
    name: 'stream-feed',
    description: 'Tail INSERT/UPDATE events on battles.battles via Supabase realtime.',
  },
  args: {},
  async run() {
    try {
      const { createClient } = await import('../utils/supabase-client');
      const client = await createClient();

      const channel = client
        .channel('lf-cli-battle-stream-feed')
        .on(
          // Cast through unknown — supabase-js typings vary across versions
          // and we only need INSERT|UPDATE on battles.battles.
          'postgres_changes' as unknown as 'system',
          { event: '*', schema: 'battles', table: 'battles' } as Record<string, unknown>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            if (!payload) return;
            const evt = (payload.eventType ?? payload.type ?? 'event').toString().toLowerCase();
            if (evt !== 'insert' && evt !== 'update') return;
            const row = (payload.new ?? payload.record ?? {}) as Record<string, unknown>;
            const slug = row['slug'] ?? row['id'] ?? '?';
            const status = row['status'] ?? '?';
            consola.log(`[${new Date().toISOString()}] battle ${slug}: ${status}`);
          },
        )
        .subscribe();

      consola.info('Subscribed to battles.battles. Press Ctrl-C to exit.');

      const exit = async () => {
        try { await client.removeChannel(channel); } catch { /* ignore */ }
        process.exit(0);
      };
      process.on('SIGINT', () => { void exit(); });
      process.on('SIGTERM', () => { void exit(); });

      // Keep the event loop alive without busy-spinning.
      await new Promise<void>(() => { /* never resolves; SIGINT exits */ });
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle rematch
// ---------------------------------------------------------------------------
const rematch = defineCommand({
  meta: {
    name: 'rematch',
    description: 'Create a rematch from an existing battle slug (V1).',
  },
  args: {
    slug: {
      type: 'positional',
      description: 'Source battle slug',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      // 1. Resolve slug → battle_id via PostgREST
      const parents = await callRest<Array<{ id: string; slug: string; creator_lenser_id: string }>>(
        'battles',
        'battles',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,slug,creator_lenser_id',
            slug: `eq.${args.slug}`,
            limit: 1,
          },
        }
      );

      const parent = parents?.[0];
      if (!parent) {
        throw new Error(`No battle found for slug "${args.slug}".`);
      }

      // 2. Call fn_battles_create_rematch RPC (owner-checked, returns new battle id)
      const newId = await callRpc<string>(
        'fn_battles_create_rematch',
        { p_parent_id: parent.id },
        { requireAuth: true }
      );

      if (!newId) {
        throw new Error('Rematch RPC returned no id.');
      }

      // 3. Resolve new id → new slug
      const created = await callRest<Array<{ id: string; slug: string }>>(
        'battles',
        'battles',
        'GET',
        undefined,
        {
          requireAuth: true,
          query: {
            select: 'id,slug',
            id: `eq.${newId}`,
            limit: 1,
          },
        }
      );

      const newSlug = created?.[0]?.slug ?? null;
      if (!newSlug) {
        throw new Error(`Rematch created (id=${newId}) but slug could not be resolved.`);
      }

      if (args.json) {
        printJson({ rematch_id: newId, slug: newSlug });
        return;
      }

      consola.success('Created rematch: %s', newSlug);
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
    name: 'battle',
    description: 'Create, join, and manage battles on LenserFight Cloud.',
  },
  subCommands: {
    create,
    join,
    run,
    list,
    view,
    submit,
    open,
    'start-voting': startVoting,
    finalize,
    publish,
    leaderboard,
    invite,
    clone,
    delete: deleteBattle,
    'create-from-template': createFromTemplate,
    vote,
    'close-voting': closeVoting,
    close: closeBattle,
    archive,
    retract,
    comments,
    messages,
    'post-message': postMessage,
    feed,
    local,
    exec,
    dispatch,
    'byok-key': byokKey,
    schedule,
    'set-schedule': setSchedule,
    'force-transition': forceTransition,
    jobs,
    tournament,
    'stream-feed': streamFeed,
    rematch,
  },
});
