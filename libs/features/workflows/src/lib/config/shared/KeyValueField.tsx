/**
 * KeyValueField — user-friendly input for JSON key-value objects.
 *
 * Replaces raw JSON textarea for fields like HTTP headers, rename mappings,
 * RPC params, glossaries, etc. Users add/remove key-value pairs;
 * the component serializes to/from JSON objects.
 */

import { Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { Plus, X } from 'lucide-react'
import React, { useCallback, useState } from 'react'

export interface KeyValueFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: boolean
  keyPlaceholder?: string
  valuePlaceholder?: string
  /** Allow {{expression}} syntax in values */
  expressionAware?: boolean
}

interface KVPair {
  key: string
  value: string
}

function parsePairs(raw: string): KVPair[] {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }))
    }
  } catch {
    // fall through
  }
  return []
}

function serializePairs(pairs: KVPair[]): string {
  const obj: Record<string, string> = {}
  for (const p of pairs) {
    if (p.key.trim()) obj[p.key] = p.value
  }
  if (Object.keys(obj).length === 0) return ''
  return JSON.stringify(obj, null, 2)
}

export function KeyValueField({
  value,
  onChange,
  onBlur,
  error,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueFieldProps) {
  const [pairs, setPairs] = useState<KVPair[]>(() => parsePairs(value))

  const sync = useCallback(
    (next: KVPair[]) => {
      setPairs(next)
      onChange(serializePairs(next))
    },
    [onChange],
  )

  const addPair = () => sync([...pairs, { key: '', value: '' }])
  const removePair = (idx: number) => sync(pairs.filter((_, i) => i !== idx))
  const updatePair = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...pairs]
    next[idx] = { ...next[idx], [field]: val }
    sync(next)
  }

  return (
    <div className="space-y-1.5" onBlur={onBlur}>
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Input
            value={pair.key}
            onChange={(e) => updatePair(idx, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="text-xs !h-7 flex-1 font-mono"
            error={error}
          />
          <span className="text-[10px] text-greyscale-400 flex-shrink-0">:</span>
          <Input
            value={pair.value}
            onChange={(e) => updatePair(idx, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="text-xs !h-7 flex-1"
            error={error}
          />
          <button
            type="button"
            onClick={() => removePair(idx)}
            className="p-0.5 text-greyscale-400 hover:text-status-red flex-shrink-0"
            title="Remove"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={addPair}
        className="!h-6 gap-1 text-[10px] text-greyscale-400"
      >
        <Plus size={10} /> {pairs.length === 0 ? 'Add pair' : 'Add'}
      </Button>
    </div>
  )
}
