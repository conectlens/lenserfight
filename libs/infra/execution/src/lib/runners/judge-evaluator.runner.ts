/**
 * JudgeEvaluatorRunner — LenserFight-native battle-scoring node.
 *
 * GRASP Information Expert: knows how to compare two upstream outputs
 * against a rubric and emit a structured verdict.
 *
 * This is the LenserFight differentiator — no other workflow tool has a
 * built-in competitive evaluation node.
 *
 * Config schema (nodeConfig):
 *   rubric?: string — evaluation criteria (free-text, shown to downstream)
 *   comparisonMode?: 'pairwise' | 'absolute' — default 'pairwise'
 *   sourceNodeIds?: [string, string] — explicit pair to compare
 *     (defaults to first two upstream outputs)
 *   maxScore?: number — max score per entry (default: 10)
 *
 * Output (data):
 *   winner: string — nodeId of the winning entry (or 'tie')
 *   scores: Array<{ nodeId: string; score: number; reasoning: string }>
 *   rubric: string — the rubric used
 *   comparisonMode: string
 *
 * Note: This runner does NOT call an LLM. It structures the comparison
 * envelope for a downstream Lens node to perform the actual judging.
 * For self-contained judging, wire: [Lens A] + [Lens B] → [Judge] → [Lens Judge]
 *
 * Security: no code execution, no provider call.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export interface JudgeScore {
  nodeId: string
  label: string
  content: string
}

export class JudgeEvaluatorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'judge_evaluator'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const rubric = (ctx.nodeConfig['rubric'] as string) ?? 'Evaluate quality, relevance, and clarity.'
    const comparisonMode = (ctx.nodeConfig['comparisonMode'] as string) ?? 'pairwise'
    const sourceNodeIds = ctx.nodeConfig['sourceNodeIds'] as [string, string] | undefined
    const maxScore = Math.max(1, Math.min(Number(ctx.nodeConfig['maxScore'] ?? 10), 100))

    // Resolve the entries to compare
    const entries: JudgeScore[] = []
    if (sourceNodeIds && Array.isArray(sourceNodeIds)) {
      for (const id of sourceNodeIds) {
        const upstream = ctx.upstreamOutputs.get(id)
        if (upstream) {
          entries.push({ nodeId: id, label: id, content: upstream.text ?? JSON.stringify(upstream.data ?? '') })
        }
      }
    } else {
      // Use first N upstream outputs (pairwise=2, absolute=all)
      const limit = comparisonMode === 'pairwise' ? 2 : ctx.upstreamOutputs.size
      let count = 0
      for (const [id, upstream] of ctx.upstreamOutputs) {
        if (count >= limit) break
        entries.push({ nodeId: id, label: id, content: upstream.text ?? JSON.stringify(upstream.data ?? '') })
        count++
      }
    }

    if (entries.length === 0) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: 'No entries to evaluate', rubric },
          durationMs: 0,
        },
      }
    }

    // Build the structured judge prompt for downstream Lens consumption
    const judgePrompt = buildJudgePrompt(entries, rubric, comparisonMode, maxScore)

    return {
      output: {
        mediaType: 'text',
        text: judgePrompt,
        data: {
          __judge_evaluation: true,
          rubric,
          comparisonMode,
          maxScore,
          entryCount: entries.length,
          entries: entries.map((e) => ({ nodeId: e.nodeId, label: e.label, contentLength: e.content.length })),
        },
        durationMs: 0,
      },
      variableMutations: {
        __judge_rubric: rubric,
        __judge_mode: comparisonMode,
        __judge_entry_count: entries.length,
      },
    }
  }
}

function buildJudgePrompt(
  entries: JudgeScore[],
  rubric: string,
  mode: string,
  maxScore: number,
): string {
  const lines: string[] = [
    `You are a judge evaluating ${entries.length} submission(s).`,
    '',
    `## Evaluation Criteria`,
    rubric,
    '',
    `## Mode: ${mode}`,
    `Score each entry from 0 to ${maxScore}.`,
    '',
  ]

  for (let i = 0; i < entries.length; i++) {
    lines.push(`## Entry ${i + 1} (${entries[i].label})`)
    lines.push(entries[i].content)
    lines.push('')
  }

  lines.push(`## Required Output Format`)
  lines.push(`Respond with ONLY a JSON object:`)
  lines.push(`{`)
  lines.push(`  "winner": "<nodeId of best entry or 'tie'>",`)
  lines.push(`  "scores": [`)
  for (let i = 0; i < entries.length; i++) {
    const comma = i < entries.length - 1 ? ',' : ''
    lines.push(`    { "nodeId": "${entries[i].nodeId}", "score": <0-${maxScore}>, "reasoning": "<brief>" }${comma}`)
  }
  lines.push(`  ]`)
  lines.push(`}`)

  return lines.join('\n')
}
