import { Badge, Button } from '@lenserfight/ui/components'
import { Copy, Plus, Trash2 } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useBattleWebhookSubscriptions, useSubscribeBattleWebhook, useRevokeBattleWebhook } from './hooks/useBattleWebhooks'

const EVENT_TYPES = [
  { value: 'status_change', label: 'Status change' },
  { value: 'vote_cast',     label: 'Vote cast' },
  { value: 'result_ready',  label: 'Result ready' },
]

interface BattleWebhookSubscriptionsProps {
  battleId: string
}

export function BattleWebhookSubscriptions({ battleId }: BattleWebhookSubscriptionsProps) {
  const { data: subs, refetch } = useBattleWebhookSubscriptions(battleId)
  const { mutate: subscribe, isPending: isSubscribing } = useSubscribeBattleWebhook()
  const { mutate: revoke }  = useRevokeBattleWebhook()

  const [url, setUrl]               = useState('')
  const [events, setEvents]         = useState<string[]>(['status_change'])
  const [revealedSecret, setSecret] = useState<Record<string, string>>({})
  const [showForm, setShowForm]     = useState(false)

  const toggleEvent = (val: string) => {
    setEvents((prev) =>
      prev.includes(val) ? prev.filter((e) => e !== val) : [...prev, val]
    )
  }

  const handleAdd = useCallback(() => {
    if (!url || events.length === 0) return
    subscribe(
      { battleId, webhookUrl: url, eventTypes: events },
      {
        onSuccess: () => {
          setUrl('')
          setEvents(['status_change'])
          setShowForm(false)
          refetch()
        },
      }
    )
  }, [battleId, url, events, subscribe, refetch])

  const handleRevoke = (subId: string) => {
    revoke(subId, { onSuccess: () => refetch() })
  }

  const handleCopy = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret).catch(() => undefined)
    setSecret((prev) => ({ ...prev, [id]: secret }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-text">Webhook Subscriptions</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add webhook
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-surface-border p-4 space-y-3 bg-surface-raised">
          <div>
            <label className="block text-xs font-medium text-surface-text-muted mb-1">Webhook URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-text-muted mb-1">Events</label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <label key={et.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={events.includes(et.value)}
                    onChange={() => toggleEvent(et.value)}
                    className="h-3.5 w-3.5 accent-accent-primary"
                  />
                  {et.label}
                </label>
              ))}
            </div>
          </div>
          <Button size="sm" variant="primary" onClick={handleAdd} disabled={isSubscribing || !url}>
            {isSubscribing ? 'Creating…' : 'Create subscription'}
          </Button>
        </div>
      )}

      {(!subs || subs.length === 0) && !showForm && (
        <p className="text-sm text-surface-text-muted">No webhook subscriptions yet.</p>
      )}

      {subs && subs.length > 0 && (
        <div className="space-y-2">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-raised px-4 py-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium text-surface-text truncate">{sub.webhook_url}</div>
                <div className="flex flex-wrap gap-1">
                  {sub.event_types.map((et: string) => (
                    <Badge key={et} color="blue" variant="outline" className="text-[10px]">{et}</Badge>
                  ))}
                </div>
                {sub.revoked_at && (
                  <Badge color="gray" variant="outline" className="text-[10px]">Revoked</Badge>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {!sub.revoked_at && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(sub.id, sub.secret_hmac ?? '')}
                      title="Copy HMAC secret"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(sub.id)}
                      title="Revoke subscription"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
