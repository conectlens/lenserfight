import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useQuery } from '@tanstack/react-query'

// fn_get_battles_feed (the public feed) always excludes draft/open/executing —
// correct for a public feed, but a creator otherwise has no way to see their
// own battles before they reach voting. This pulls just those pre-publish
// statuses via the creator-scoped fn_get_my_battles, client-filtered to the
// ones the public feed would never show, so the two lists never duplicate.
const PRE_PUBLIC_STATUSES = new Set(['draft', 'open', 'executing'])

export const useMyUnpublishedBattles = () => {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: queryKeys.battles.mine(),
    queryFn: async () => {
      const rows = await battlesService.getMyBattles(undefined, 50)
      return rows.filter((b) => PRE_PUBLIC_STATUSES.has(b.status))
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30,
  })
}
