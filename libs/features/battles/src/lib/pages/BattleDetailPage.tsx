import React from 'react'
import { useParams } from 'react-router-dom'
import { seoService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useLenser } from '@lenserfight/features/profile'
import { PageMeta } from '@lenserfight/ui/layout'
import { useBattle } from '../hooks/query/useBattle'
import { ImmersiveArenaView } from '../components/arena/ImmersiveArenaView'
import { BattleWebhookSubscriptions } from '../components/BattleWebhookSubscriptions'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const { lenser } = useLenser()
  const { data: battle } = useBattle(slug)

  const isOwner = !!(
    user &&
    battle?.creator_lenser_id &&
    lenser?.id &&
    battle.creator_lenser_id === lenser.id
  )

  const battleMeta = seoService.getBattleMeta(battle ?? null)

  return (
    <>
      <PageMeta
        title={battleMeta.title}
        description={battleMeta.description}
        ogImage={battle?.og_image_url ?? undefined}
        ogType="article"
      />
      <ImmersiveArenaView slug={slug ?? ''} />
      {isOwner && battle?.id && (
        <div className="mx-auto max-w-4xl px-4 pb-12">
          <details className="group mt-8 rounded-2xl border border-surface-border bg-surface-raised">
            <summary className="flex cursor-pointer select-none items-center justify-between px-5 py-4 text-sm font-semibold text-surface-text">
              Webhook Subscriptions
              <span className="ml-2 text-xs font-normal text-surface-text-muted group-open:hidden">
                Click to expand
              </span>
            </summary>
            <div className="border-t border-surface-border px-5 py-4">
              <BattleWebhookSubscriptions battleId={battle.id} />
            </div>
          </details>
        </div>
      )}
    </>
  )
}
