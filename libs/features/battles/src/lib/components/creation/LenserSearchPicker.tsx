import { Button } from '@lenserfight/ui/components'
import { lenserService } from '@lenserfight/data/repositories'
import type { LenserSearchResult } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { Bot, User, X } from 'lucide-react'
import React, { useRef, useState } from 'react'

export type { LenserSearchResult }

// Handle format: 4–24 lowercase alphanumeric + dots/underscores
const HANDLE_RE = /^[a-z0-9._]{4,24}$/

function isValidHandle(raw: string): boolean {
  const stripped = raw.startsWith('@') ? raw.slice(1) : raw
  return HANDLE_RE.test(stripped.toLowerCase())
}

interface LenserSearchPickerProps {
  slot: 'A' | 'B'
  slotLabel?: string
  value: LenserSearchResult | null
  onChange: (lenser: LenserSearchResult | null) => void
  placeholder?: string
  filterType?: 'human' | 'ai' | 'all'
  /** Short label shown next to the slot badge, e.g. "AI lensers only" */
  filterHint?: string | null
}

const SLOT_COLORS = {
  A: 'bg-primary-yellow-500/15 text-primary-yellow-600',
  B: 'bg-status-yellow/15 text-status-yellow',
}

// Debounce helper that returns a stable timeout ref approach
function useDebouncedQuery(value: string, delay = 400) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function LenserIcon({ type, size = 14 }: { type?: 'human' | 'ai'; size?: number }) {
  return type === 'ai' ? (
    <Bot size={size} className="text-greyscale-400 flex-shrink-0" />
  ) : (
    <User size={size} className="text-greyscale-400 flex-shrink-0" />
  )
}

export function LenserSearchPicker({
  slot,
  slotLabel,
  value,
  onChange,
  placeholder = 'Search by name or @handle…',
  filterType = 'all',
  filterHint,
}: LenserSearchPickerProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebouncedQuery(inputValue)

  // Min 3 chars; strip leading @ for the API (handled server-side too, but guard client-side)
  const queryForFetch = debouncedQuery.length >= 3 ? debouncedQuery : ''

  const { data: rawResults = [], isFetching } = useQuery({
    queryKey: ['lenser-search-for-battle', queryForFetch],
    queryFn: () => lenserService.searchLensers(queryForFetch, 8),
    enabled: queryForFetch.length >= 3 && !value,
    staleTime: 10_000,
  })

  const results =
    filterType === 'all' ? rawResults : rawResults.filter((l) => (l.type ?? 'human') === filterType)

  // Whether the current input looks like a direct @handle invite
  const trimmed = inputValue.trim()
  const strippedHandle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  const showDirectInvite =
    !value &&
    queryForFetch.length >= 3 &&
    isValidHandle(strippedHandle) &&
    !isFetching &&
    results.every((r) => r.handle.toLowerCase() !== strippedHandle.toLowerCase())

  const handleSelect = (lenser: LenserSearchResult) => {
    onChange(lenser)
    setInputValue('')
  }

  const handleDirectInvite = () => {
    onChange({
      id: '',
      handle: strippedHandle.toLowerCase(),
      display_name: '@' + strippedHandle.toLowerCase(),
      avatar_url: null,
      type: filterType !== 'all' ? (filterType === 'ai' ? 'ai' : 'human') : undefined,
      directInvite: true,
    } as LenserSearchResult & { directInvite: true })
    setInputValue('')
  }

  const handleClear = () => {
    onChange(null)
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const slotBadgeClass = SLOT_COLORS[slot]
  const isDirectInviteValue =
    value && (value as LenserSearchResult & { directInvite?: boolean }).directInvite

  return (
    <div className="space-y-2">
      {/* Slot label + optional filter hint */}
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${slotBadgeClass}`}
        >
          {slot}
        </span>
        {slotLabel && (
          <p className="text-xs font-semibold text-greyscale-500 uppercase tracking-wide">
            {slotLabel}
          </p>
        )}
        {filterHint && <span className="ml-auto text-[11px] text-greyscale-400">{filterHint}</span>}
      </div>

      {/* Selected chip or search input */}
      {value ? (
        <div className="flex items-center gap-2 rounded-2xl border border-primary-yellow-500/40 bg-primary-yellow-500/5 px-3 py-2">
          {isDirectInviteValue ? (
            <User size={14} className="text-greyscale-400 flex-shrink-0" />
          ) : (
            <LenserIcon type={value.type} size={14} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                {isDirectInviteValue ? `@${value.handle}` : value.display_name}
              </p>
              {value.type === 'ai' && !isDirectInviteValue && (
                <span className="flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-300">
                  AI
                </span>
              )}
              {isDirectInviteValue && (
                <span className="flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-greyscale-200/60 text-greyscale-500 dark:bg-greyscale-700/40 dark:text-greyscale-400">
                  Direct
                </span>
              )}
            </div>
            {!isDirectInviteValue && (
              <p className="text-xs text-greyscale-400 truncate">@{value.handle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 p-0.5 rounded flex-shrink-0"
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && showDirectInvite) {
              e.preventDefault()
              handleDirectInvite()
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-2.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500/50 focus:border-primary-yellow-500 transition-colors"
          autoComplete="off"
        />
      )}

      {/* Hint */}
      {!value && inputValue.length > 0 && inputValue.length < 3 && (
        <p className="text-xs text-greyscale-400">Type at least 3 characters to search…</p>
      )}

      {/* Dropdown results */}
      {!value && (results.length > 0 || showDirectInvite) && (
        <ul className="rounded-2xl border border-surface-border bg-surface-base divide-y divide-surface-border overflow-hidden">
          {results.map((lenser) => (
            <li key={lenser.id}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => handleSelect(lenser)}
                className="!justify-start !gap-3 !px-3 !py-2.5 !rounded-none !font-normal"
              >
                <LenserIcon type={lenser.type} size={14} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-50 truncate">
                      {lenser.display_name}
                    </p>
                    {lenser.type === 'ai' && (
                      <span className="flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-300">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-greyscale-400 truncate">@{lenser.handle}</p>
                </div>
              </Button>
            </li>
          ))}
          {showDirectInvite && (
            <li>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={handleDirectInvite}
                className="!justify-start !gap-3 !px-3 !py-2.5 !rounded-none !font-normal"
              >
                <User size={14} className="text-greyscale-400 flex-shrink-0" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-50">
                    Invite @{strippedHandle.toLowerCase()}
                  </p>
                  <p className="text-xs text-greyscale-400">Direct invite by handle</p>
                </div>
              </Button>
            </li>
          )}
        </ul>
      )}

      {/* No results */}
      {!value &&
        isFetching === false &&
        queryForFetch.length >= 3 &&
        results.length === 0 &&
        !showDirectInvite && (
          <p className="text-xs text-greyscale-400 py-1">No lensers found for "{inputValue}".</p>
        )}
    </div>
  )
}
