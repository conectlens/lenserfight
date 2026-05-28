import React from 'react'
import type { BattleContentRenderer, SubmissionRendererProps } from '../types/battle-renderer.types'

interface MetricEntry {
  name: string
  value: number | string
}

const KaggleSubmissionRenderer: React.FC<SubmissionRendererProps> = ({ content, metadata }) => {
  if (!content && !metadata) {
    return (
      <div className="flex items-center justify-center h-full min-h-[120px] text-greyscale-400 text-sm">
        Awaiting challenge submission…
      </div>
    )
  }

  const metrics: MetricEntry[] = (metadata?.metrics as MetricEntry[]) ?? []
  const score = metadata?.score as number | undefined
  const datasetName = metadata?.dataset as string | undefined

  return (
    <div className="flex flex-col gap-4 p-4 h-full min-h-[120px]">
      {/* Score banner */}
      {score != null && (
        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-4 py-2.5">
          <span className="text-xs font-medium text-greyscale-500 uppercase tracking-wider">Score</span>
          <span className="text-2xl font-bold text-primary tabular-nums">
            {typeof score === 'number' ? score.toFixed(4) : score}
          </span>
        </div>
      )}

      {/* Metrics table */}
      {metrics.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-surface-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-raised text-greyscale-500">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">Metric</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.name} className={i % 2 === 0 ? 'bg-surface-base' : 'bg-surface-raised/50'}>
                  <td className="px-3 py-2 font-mono text-xs text-greyscale-700 dark:text-greyscale-300">{m.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-greyscale-900 dark:text-greyscale-100">
                    {typeof m.value === 'number' ? m.value.toFixed(6) : m.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Dataset reference */}
      {datasetName && (
        <div className="text-xs text-greyscale-500">
          Dataset: <span className="font-medium text-greyscale-700 dark:text-greyscale-300">{datasetName}</span>
        </div>
      )}

      {/* Code snippet */}
      {content && (
        <div className="overflow-auto rounded-xl bg-greyscale-950 p-3">
          <pre className="text-xs font-mono text-greyscale-300 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

const KaggleIdleAnimation: React.FC = () => (
  <div className="flex flex-col items-center justify-center gap-3 text-greyscale-400">
    <div className="flex items-end gap-1 h-10">
      {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
        <div
          key={i}
          className="w-3 rounded-t bg-greyscale-700 animate-[chartGrow_1.5s_ease-in-out_infinite_alternate]"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
    <span className="text-xs">Waiting for submission</span>
    <style>{`
      @keyframes chartGrow {
        0% { transform: scaleY(0.5); opacity: 0.5; }
        100% { transform: scaleY(1); opacity: 1; }
      }
    `}</style>
  </div>
)

export const KaggleRenderer: BattleContentRenderer = {
  contentType: 'kaggle' as 'text',
  SubmissionRenderer: KaggleSubmissionRenderer,
  IdleAnimation: KaggleIdleAnimation,
  voteStyle: 'ranked',
}
