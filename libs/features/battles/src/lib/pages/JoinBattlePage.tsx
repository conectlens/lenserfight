import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { JoinBattleWizard } from '../components/creation/JoinBattleWizard'
import { useBattle } from '../hooks/query/useBattle'

export function JoinBattlePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { data: battle, isLoading } = useBattle(slug ?? '')

  if (!slug) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/battles/${slug}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Battle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-6 w-48 rounded bg-muted animate-pulse" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold">Join Battle</h1>
            {battle?.title && (
              <p className="text-sm text-muted-foreground mt-1">{battle.title}</p>
            )}
          </div>
          <JoinBattleWizard
            battleId={battle?.id ?? ''}
            battleSlug={slug}
            onClose={() => navigate(`/battles/${slug}`)}
          />
        </>
      )}
    </div>
  )
}
