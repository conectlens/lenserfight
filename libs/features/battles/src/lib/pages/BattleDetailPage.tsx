import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { queryKeys } from '@lenserfight/data/cache'
import { useAuth } from '@lenserfight/features/auth'
import {
  ArtifactLifecycleMenu,
} from '@lenserfight/features/artifact-lifecycle'
import { useLenser } from '@lenserfight/features/profile'
import { useShareContext } from '@lenserfight/features/share'
import { useBattle } from '../hooks/query/useBattle'
import { ImmersiveArenaView } from '../components/arena/ImmersiveArenaView'

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lenser } = useLenser()
  const { data: battle } = useBattle(slug)
  const { setShareConfig } = useShareContext()
  const isOwner = !!(
    user &&
    battle?.creator_lenser_id &&
    lenser?.id &&
    battle.creator_lenser_id === lenser.id
  )

  useEffect(() => {
    if (battle) {
      setShareConfig({
        title: battle.title,
        resourceType: 'battle',
        resourceId: battle.id,
        slug: battle.slug,
      })
    }
    return () => setShareConfig(null)
  }, [battle, setShareConfig])

  // Battle head/meta is owned by the ImmersiveArenaView → BattleSEOHead → SEOHead
  // path (correct moon host + DiscussionForumPosting JSON-LD). Rendering PageMeta
  // here too would double-tag the document head.
  return (
    <>
      {isOwner && battle?.id && (
        <div className="fixed top-16 right-4 z-40">
          <ArtifactLifecycleMenu
            type="battle"
            id={battle.id}
            extraInvalidateKeys={[
              queryKeys.battles.detail(slug ?? ''),
              queryKeys.battles.feed(),
            ]}
            onDeleted={() => navigate('/battles')}
          />
        </div>
      )}
      <ImmersiveArenaView slug={slug ?? ''} />
    </>
  )
}
