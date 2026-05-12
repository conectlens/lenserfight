import { supabase } from '@lenserfight/data/supabase'
import { useMutation, useQuery } from '@tanstack/react-query'

interface WebhookSubscription {
  id: string
  battle_id: string
  owner_id: string
  webhook_url: string
  event_types: string[]
  secret_hmac: string
  created_at: string
  revoked_at: string | null
}

export function useBattleWebhookSubscriptions(battleId: string) {
  return useQuery<WebhookSubscription[]>({
    queryKey: ['battle-webhooks', battleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_event_subscriptions')
        .select('*')
        .eq('battle_id', battleId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as WebhookSubscription[]
    },
    staleTime: 1000 * 30,
  })
}

export function useSubscribeBattleWebhook() {
  return useMutation({
    mutationFn: async ({
      battleId,
      webhookUrl,
      eventTypes,
    }: {
      battleId: string
      webhookUrl: string
      eventTypes: string[]
    }) => {
      const { error } = await supabase.rpc('fn_battles_subscribe_webhook', {
        p_battle_id:   battleId,
        p_webhook_url: webhookUrl,
        p_event_types: eventTypes,
      })
      if (error) throw error
    },
  })
}

export function useRevokeBattleWebhook() {
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('battle_event_subscriptions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', subscriptionId)
      if (error) throw error
    },
  })
}
