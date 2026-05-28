import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'

interface ChainNode {
  id: string
  label: string
  isCurrent: boolean
  href: string
}

interface WorkflowRunChainProps {
  currentRunId: string
}

export function WorkflowRunChain({ currentRunId }: WorkflowRunChainProps) {
  const { data: chain } = useQuery<ChainNode[]>({
    queryKey: ['workflow-run-chain', currentRunId],
    queryFn: async () => {
      // Fetch parent chain
      const { data: parentLinks } = await supabase
        .from('workflow_run_chains')
        .select('parent_run_id, child_run_id')
        .eq('child_run_id', currentRunId)
        .limit(1)

      // Fetch children chain
      const { data: childLinks } = await supabase
        .from('workflow_run_chains')
        .select('parent_run_id, child_run_id')
        .eq('parent_run_id', currentRunId)
        .limit(5)

      const nodes: ChainNode[] = []

      if (parentLinks && parentLinks.length > 0) {
        const parentId = parentLinks[0].parent_run_id as string
        nodes.push({
          id:        parentId,
          label:     `Parent run (${parentId.slice(0, 6)}…)`,
          isCurrent: false,
          href:      `/workflows/runs/${parentId}`,
        })
      }

      nodes.push({
        id:        currentRunId,
        label:     `This run (${currentRunId.slice(0, 6)}…)`,
        isCurrent: true,
        href:      `/workflows/runs/${currentRunId}`,
      })

      for (const link of childLinks ?? []) {
        const childId = link.child_run_id as string
        nodes.push({
          id:        childId,
          label:     `Child run (${childId.slice(0, 6)}…)`,
          isCurrent: false,
          href:      `/workflows/runs/${childId}`,
        })
      }

      return nodes
    },
    staleTime: 1000 * 60,
  })

  if (!chain || chain.length <= 1) return null

  return (
    <nav aria-label="Run chain" className="flex items-center flex-wrap gap-1 text-sm">
      {chain.map((node, i) => (
        <React.Fragment key={node.id}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-surface-text-muted shrink-0" />}
          {node.isCurrent ? (
            <span className="font-semibold text-surface-text">{node.label}</span>
          ) : (
            <Link
              to={node.href}
              className="text-accent-primary hover:underline"
            >
              {node.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
