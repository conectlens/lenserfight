import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminRepository } from '@lenserfight/data/repositories'
import { useLenserOptional } from '@lenserfight/features/profile'
import { SEOHead } from '@lenserfight/ui/components'

import { DLQPanel } from '../components/display/DLQPanel'
import { ExecutionQueuePanel } from '../components/display/ExecutionQueuePanel'
import { StuckBattlesPanel } from '../components/display/StuckBattlesPanel'
import { WorkerHealthPanel } from '../components/display/WorkerHealthPanel'

export function AdminDashboardPage() {
  const lenserCtx = useLenserOptional()
  const lenser = lenserCtx?.lenser
  const qc = useQueryClient()
  const [retryingId, setRetryingId] = useState<string | null>(null)

  if (lenserCtx && !lenser?.is_super_admin) {
    return <Navigate to="/" replace />
  }

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['admin', 'worker-health'],
    queryFn: () => adminRepository.getWorkerHealth(),
    refetchInterval: 10_000,
    enabled: !!lenser?.is_super_admin,
  })

  const { data: dlqEntries = [], isLoading: dlqLoading } = useQuery({
    queryKey: ['admin', 'dlq'],
    queryFn: () => adminRepository.getDLQEntries(true),
    refetchInterval: 30_000,
    enabled: !!lenser?.is_super_admin,
  })

  const { data: stuckBattles = [], isLoading: stuckLoading } = useQuery({
    queryKey: ['admin', 'stuck-battles'],
    queryFn: () => adminRepository.getStuckBattles(30),
    refetchInterval: 60_000,
    enabled: !!lenser?.is_super_admin,
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => adminRepository.retryDLQEntry(id),
    onMutate: (id) => setRetryingId(id),
    onSettled: () => setRetryingId(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'dlq'] }),
  })

  return (
    <>
      <SEOHead title="Admin Dashboard — LenserFight" description="Platform operations" />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-greyscale-100">Admin Dashboard</h1>
          <span className="rounded-full bg-yellow-900/40 px-2.5 py-1 text-xs font-semibold text-yellow-400">
            Super Admin
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorkerHealthPanel workers={workers} isLoading={workersLoading} />
          <DLQPanel
            entries={dlqEntries}
            isLoading={dlqLoading}
            onRetry={(id) => retryMutation.mutate(id)}
            retryingId={retryingId}
          />
          <StuckBattlesPanel battles={stuckBattles} isLoading={stuckLoading} />
          <ExecutionQueuePanel jobs={[]} isLoading={false} />
        </div>
      </div>
    </>
  )
}
