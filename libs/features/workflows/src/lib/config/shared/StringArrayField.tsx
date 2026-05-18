/**
 * StringArrayField — user-friendly input for JSON string arrays.
 *
 * Replaces raw JSON textarea for fields like labels, assignees, attendees,
 * error codes, tool names, etc. Users enter comma-separated values;
 * the component serializes to/from JSON arrays.
 */

import { Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { Plus, X } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

export interface StringArrayFieldProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: boolean
  placeholder?: string
  itemPlaceholder?: string
}

function parseArray(raw: string): string[] {
  if (!raw.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    // fall through
  }
  // Fallback: treat as comma-separated
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function serializeArray(items: string[]): string {
  const clean = items.filter((s) => s.trim())
  if (clean.length === 0) return ''
  return JSON.stringify(clean)
}

export function StringArrayField({
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Add items...',
  itemPlaceholder = 'Item',
}: StringArrayFieldProps) {
  const [items, setItems] = useState<string[]>(() => parseArray(value))

  const sync = useCallback(
    (next: string[]) => {
      setItems(next)
      onChange(serializeArray(next))
    },
    [onChange],
  )

  const addItem = () => sync([...items, ''])
  const removeItem = (idx: number) => sync(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, val: string) => {
    const next = [...items]
    next[idx] = val
    sync(next)
  }

  return (
    <div className="space-y-1.5" onBlur={onBlur}>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Input
            value={item}
            onChange={(e) => updateItem(idx, e.target.value)}
            placeholder={`${itemPlaceholder} ${idx + 1}`}
            className="text-xs !h-7 flex-1"
            error={error}
          />
          <button
            type="button"
            onClick={() => removeItem(idx)}
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
        onClick={addItem}
        className="!h-6 gap-1 text-[10px] text-greyscale-400"
      >
        <Plus size={10} /> {items.length === 0 ? placeholder : 'Add'}
      </Button>
      {/* Compact preview */}
      {items.filter(Boolean).length > 0 && (
        <p className="text-[9px] text-greyscale-400 font-mono truncate">
          [{items.filter(Boolean).map((s) => `"${s}"`).join(', ')}]
        </p>
      )}
    </div>
  )
}
