import { useQuery } from '@tanstack/react-query'
import { lensesService } from '@lenserfight/data/repositories'
import { ToolRecord } from '@lenserfight/types'

const STALE_TIME = 10 * 60 * 1000 // tools are static; 10 min stale time

export function useTools(category?: string): {
  tools: ToolRecord[]
  isLoading: boolean
  textToolId: string | undefined
} {
  const { data, isLoading } = useQuery({
    queryKey: ['tools', category ?? 'all'],
    queryFn: () => lensesService.getTools(category),
    staleTime: STALE_TIME,
  })

  const tools = data ?? []
  const textToolId = tools.find((t) => t.key === 'text')?.id

  return { tools, isLoading, textToolId }
}
