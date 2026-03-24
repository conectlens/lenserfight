import React, { useRef, useEffect, useState, useCallback } from 'react'
import { LensParam } from '@lenserfight/types'
import { parseContentSegments, detectParamMismatches, type ParamMismatch } from '@lenserfight/utils/text'
import { ParamAutocomplete } from './ParamAutocomplete'
import { ParamEditPopover } from './ParamEditPopover'
import { AlertTriangle, Type, Hash, ToggleLeft, Paperclip, ChevronDown, Link, Calendar, AlignLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

export interface LensContentEditorProps {
  value: string
  onChange: (value: string) => void
  params: LensParam[]
  onParamsChange: (params: LensParam[]) => void
  placeholder?: string
  className?: string
}

export interface LensContentEditorHandle {
  insertParam: (param: LensParam) => void
  focus: () => void
}

// ─── Quick-add param toolbar templates ───────────────────────────────────

interface QuickTemplate {
  label: string
  icon: React.ReactNode
  colorClass: string
  param: LensParam
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    label: 'Text',
    icon: <Type size={12} />,
    colorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    param: { name: 'input', type: 'string', required: true, placeholder: 'Enter text…' },
  },
  {
    label: 'Number',
    icon: <Hash size={12} />,
    colorClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    param: { name: 'count', type: 'number', required: false, min: 1, max: 100, default: '10' },
  },
  {
    label: 'Toggle',
    icon: <ToggleLeft size={12} />,
    colorClass: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    param: { name: 'enabled', type: 'boolean', required: false, default: 'false' },
  },
  {
    label: 'File',
    icon: <Paperclip size={12} />,
    colorClass: 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400',
    param: { name: 'attachment', type: 'string', required: false, description: 'Upload a file' },
  },
  {
    label: 'Select',
    icon: <ChevronDown size={12} />,
    colorClass: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    param: {
      name: 'option',
      type: 'select',
      required: true,
      options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }],
    },
  },
  {
    label: 'URL',
    icon: <Link size={12} />,
    colorClass: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    param: { name: 'url', type: 'string', required: false, placeholder: 'https://…' },
  },
  {
    label: 'Date',
    icon: <Calendar size={12} />,
    colorClass: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    param: { name: 'date', type: 'string', required: false, placeholder: 'YYYY-MM-DD' },
  },
  {
    label: 'Long Text',
    icon: <AlignLeft size={12} />,
    colorClass: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    param: { name: 'description', type: 'string', required: false, placeholder: 'Enter description…' },
  },
]

function uniquifyName(baseName: string, existing: LensParam[]): string {
  const names = new Set(existing.map((p) => p.name))
  if (!names.has(baseName)) return baseName
  let i = 2
  while (names.has(`${baseName}_${i}`)) i++
  return `${baseName}_${i}`
}

// ─── Chip color config ────────────────────────────────────────────────────

const CHIP_CLASSES: Record<string, string> = {
  string:      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  number:      'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  boolean:     'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  select:      'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
  multiselect: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
  array:       'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
}

const DEFAULT_CHIP = CHIP_CLASSES.string

// ─── Component ────────────────────────────────────────────────────────────

export const LensContentEditor = React.forwardRef<LensContentEditorHandle, LensContentEditorProps>(
  ({ value, onChange, params, onParamsChange, placeholder, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastKnownValue = useRef('')
    const isTypingParam = useRef(false)
    // Track which param name (if any) started a drag from within this editor
    const internalDragName = useRef<string | null>(null)

    // Autocomplete state
    const [autocomplete, setAutocomplete] = useState<{
      query: string
      position: { top: number; left: number }
    } | null>(null)

    // Edit popover state
    const [editTarget, setEditTarget] = useState<{
      param: LensParam
      paramIndex: number
      rect: DOMRect
    } | null>(null)

    // Mismatch state
    const [mismatches, setMismatches] = useState<ParamMismatch>({ orphanedInContent: [], orphanedInParams: [] })

    // ─── Caret coordinates ────────────────────────────────────────────

    const getCaretCoordinates = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return { top: 0, left: 0, height: 20 }

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0 && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        return { top: containerRect.top + 10, left: containerRect.left + 10, height: 20 }
      }

      return { top: rect.top, left: rect.left, height: rect.height }
    }

    // ─── Create chip DOM element ──────────────────────────────────────

    const createChipElement = useCallback((paramName: string): HTMLSpanElement => {
      const param = params.find((p) => p.name === paramName)
      const chipColors = CHIP_CLASSES[param?.type ?? 'string'] ?? DEFAULT_CHIP
      const isRequired = param?.required !== false

      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.setAttribute('data-param', paramName)
      chip.className = `inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-xs font-medium select-none align-middle whitespace-nowrap border mx-0.5 ${chipColors} ${isRequired ? '' : 'border-dashed'} cursor-pointer`
      chip.textContent = `[[${paramName}]]`
      chip.title = `${paramName} (${param?.type ?? 'string'}${isRequired ? ', required' : ', optional'})`

      const openPopover = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        if (!param) return
        const idx = params.findIndex((p) => p.name === paramName)
        if (idx === -1) return
        setEditTarget({ param, paramIndex: idx, rect: chip.getBoundingClientRect() })
      }

      chip.addEventListener('click', openPopover)
      chip.addEventListener('dblclick', openPopover)
      chip.addEventListener('contextmenu', openPopover)

      // Make chips draggable so they can be reordered within the editor
      chip.draggable = true
      chip.addEventListener('dragstart', (e) => {
        const de = e as DragEvent
        de.dataTransfer?.setData('text/plain', `[[${paramName}]]`)
        if (de.dataTransfer) de.dataTransfer.effectAllowed = 'move'
        internalDragName.current = paramName
      })
      chip.addEventListener('dragend', () => {
        internalDragName.current = null
      })

      return chip
    }, [params])

    // ─── Hydration: value → DOM ───────────────────────────────────────

    const hydrate = useCallback(() => {
      if (!containerRef.current) return

      containerRef.current.innerHTML = ''
      // Shim: migrate any legacy {{param}} syntax that may exist in unsaved/in-flight content
      const normalizedValue = value.replace(/\{\{(\w+)\}\}/g, '[[$1]]')
      const segments = parseContentSegments(normalizedValue)

      segments.forEach((seg) => {
        if (seg.type === 'text') {
          if (seg.content) {
            containerRef.current?.appendChild(document.createTextNode(seg.content))
          }
        } else if (seg.type === 'param') {
          const chip = createChipElement(seg.name)
          containerRef.current?.appendChild(chip)
        }
      })

      lastKnownValue.current = normalizedValue
    }, [value, createChipElement])

    // Hydrate on mount and when value changes externally
    useEffect(() => {
      if (!containerRef.current) return

      // Reset case
      if (value === '' && containerRef.current.textContent !== '') {
        containerRef.current.innerHTML = ''
        lastKnownValue.current = ''
        return
      }

      // Only hydrate if value changed externally (not from our own serialization)
      if (value !== lastKnownValue.current) {
        hydrate()
      }
    }, [value, hydrate])

    // Update mismatches when content or params change
    useEffect(() => {
      setMismatches(detectParamMismatches(value, params))
    }, [value, params])

    // ─── Serialize: DOM → value ───────────────────────────────────────

    const serializeContent = useCallback(() => {
      if (!containerRef.current) return

      let text = ''

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement
          if (el.hasAttribute('data-param')) {
            const name = el.getAttribute('data-param')
            text += `[[${name}]]`
          } else if (el.tagName === 'BR') {
            text += '\n'
          } else if (el.tagName === 'DIV') {
            if (text.length > 0 && !text.endsWith('\n')) text += '\n'
            el.childNodes.forEach(walk)
          } else {
            el.childNodes.forEach(walk)
          }
        }
      }

      containerRef.current.childNodes.forEach(walk)

      const cleanText = text.replace(/^\n+/, '')

      if (lastKnownValue.current !== cleanText) {
        lastKnownValue.current = cleanText
        onChange(cleanText)
      }
    }, [onChange])

    // ─── Handle input (detect @ trigger) ──────────────────────────────

    const handleInput = useCallback(() => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const textNode = range.startContainer

        if (textNode.nodeType === Node.TEXT_NODE) {
          const text = textNode.textContent || ''
          const caretPos = range.startOffset

          // Check for @ trigger
          const lastAt = text.lastIndexOf('@', caretPos - 1)
          if (lastAt !== -1) {
            const isStart = lastAt === 0
            const isPrecededBySpace = !isStart && /[\s\u00A0]/.test(text[lastAt - 1])

            if (isStart || isPrecededBySpace) {
              const query = text.substring(lastAt + 1, caretPos)
              if (!/\s/.test(query)) {
                const coords = getCaretCoordinates()
                setAutocomplete({
                  query,
                  position: { top: coords.top + (coords.height || 20), left: coords.left },
                })
                isTypingParam.current = true
                serializeContent()
                return
              }
            }
          }
        }
      }

      // No trigger active
      if (isTypingParam.current) {
        setAutocomplete(null)
        isTypingParam.current = false
      }

      serializeContent()
    }, [serializeContent])

    // ─── Insert param chip ────────────────────────────────────────────

    const insertParam = useCallback((param: LensParam) => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        // No selection — append at end
        const chip = createChipElement(param.name)
        containerRef.current.appendChild(chip)
        const space = document.createTextNode('\u00A0')
        containerRef.current.appendChild(space)
        serializeContent()
        return
      }

      const range = selection.getRangeAt(0)

      // Delete @query text if present
      const textNode = range.startContainer
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || ''
        const caretPos = range.startOffset
        const lastAt = text.lastIndexOf('@', caretPos - 1)

        if (lastAt !== -1) {
          range.setStart(textNode, lastAt)
          range.setEnd(textNode, caretPos)
          range.deleteContents()
        }
      }

      const chip = createChipElement(param.name)
      range.insertNode(chip)

      const space = document.createTextNode('\u00A0')
      range.setStartAfter(chip)
      range.insertNode(space)

      range.setStartAfter(space)
      range.setEndAfter(space)
      selection.removeAllRanges()
      selection.addRange(range)

      setAutocomplete(null)
      isTypingParam.current = false
      serializeContent()
      containerRef.current.focus()
    }, [createChipElement, serializeContent])

    // ─── Quick-add param from toolbar ─────────────────────────────────

    const handleQuickAdd = useCallback((template: QuickTemplate) => {
      const uniqueName = uniquifyName(template.param.name, params)
      const newParam: LensParam = { ...template.param, name: uniqueName }
      onParamsChange([...params, newParam])
      insertParam(newParam)
      containerRef.current?.focus()
    }, [params, onParamsChange, insertParam])

    // ─── Handle autocomplete selection ────────────────────────────────

    const handleSelect = useCallback((param: LensParam) => {
      insertParam(param)
    }, [insertParam])

    const handleCreateNew = useCallback((name: string) => {
      const newParam: LensParam = { name, type: 'string', required: true }
      onParamsChange([...params, newParam])
      insertParam(newParam)
    }, [params, onParamsChange, insertParam])

    const handleAutocompleteClose = useCallback(() => {
      setAutocomplete(null)
      isTypingParam.current = false
    }, [])

    // ─── Handle param edit ────────────────────────────────────────────

    const handleParamUpdate = useCallback((patch: Partial<LensParam>) => {
      if (!editTarget) return
      const updated = params.map((p, i) =>
        i === editTarget.paramIndex ? { ...p, ...patch } : p
      )
      onParamsChange(updated)
      setEditTarget(null)
      // Re-hydrate to update chip colors/styles
      requestAnimationFrame(() => {
        if (containerRef.current) {
          lastKnownValue.current = '' // Force re-hydration
          hydrate()
        }
      })
    }, [editTarget, params, onParamsChange, hydrate])

    const handleParamRemove = useCallback(() => {
      if (!editTarget) return
      const name = editTarget.param.name
      onParamsChange(params.filter((_, i) => i !== editTarget.paramIndex))
      const newContent = value.replace(new RegExp(`\\[\\[${name}\\]\\]`, 'g'), '')
      onChange(newContent)
      setEditTarget(null)
    }, [editTarget, params, onParamsChange, value, onChange])

    // ─── Keyboard handling ────────────────────────────────────────────

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (autocomplete && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape')) {
        e.preventDefault()
        return
      }

      if (e.key === 'Tab') {
        e.preventDefault()
        document.execCommand('insertText', false, '  ')
      }
    }, [autocomplete])

    // ─── Drop handler (external chips from parameter panel + internal reorder) ──

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('text/plain')
      const match = raw.match(/^\[\[(\w+)\]\]$/)
      if (!match) return

      const paramName = match[1]
      const isInternal = internalDragName.current === paramName

      // Place caret at drop coordinates using modern API with webkit fallback
      const sel = window.getSelection()
      if (sel && (document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint) {
        const pos = (document as Document & { caretPositionFromPoint: (x: number, y: number) => { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(e.clientX, e.clientY)
        if (pos) {
          const range = document.createRange()
          range.setStart(pos.offsetNode, pos.offset)
          range.collapse(true)
          sel.removeAllRanges()
          sel.addRange(range)
        }
      } else if (sel) {
        // Webkit fallback
        const wkDoc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
        const range = wkDoc.caretRangeFromPoint?.(e.clientX, e.clientY)
        if (range) {
          sel.removeAllRanges()
          sel.addRange(range)
        }
      }

      // For internal reorders, remove the original chip first to avoid duplication
      if (isInternal && containerRef.current) {
        const existing = containerRef.current.querySelector(`[data-param="${paramName}"]`)
        existing?.parentNode?.removeChild(existing)
      }

      // Add to params if new
      if (!params.find((p) => p.name === paramName)) {
        const newParam: LensParam = { name: paramName, type: 'string', required: true }
        onParamsChange([...params, newParam])
      }

      const existingParam = params.find((p) => p.name === paramName)
        ?? { name: paramName, type: 'string' as const, required: true }
      insertParam(existingParam)
      internalDragName.current = null
    }, [params, onParamsChange, insertParam])

    // ─── Imperative handle ────────────────────────────────────────────

    React.useImperativeHandle(ref, () => ({
      insertParam,
      focus: () => containerRef.current?.focus(),
    }))

    // ─── Render ───────────────────────────────────────────────────────

    const hasMismatches = mismatches.orphanedInContent.length > 0 || mismatches.orphanedInParams.length > 0

    return (
      <div className="space-y-1">
        {/* Quick-add parameter toolbar */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-1 flex-wrap">
          {QUICK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleQuickAdd(tpl) }}
              title={`Add ${tpl.label} parameter`}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg ${tpl.colorClass} hover:opacity-80 active:scale-95 transition-all`}
            >
              {tpl.icon}
              <span className="text-[9px] font-medium leading-none">{tpl.label}</span>
            </button>
          ))}
          <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 pr-1">
            Type <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">@</kbd> to mention
          </span>
        </div>

        <div
          ref={containerRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
          onDrop={handleDrop}
          className={`w-full px-4 py-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none resize-none transition-all min-h-[200px] whitespace-pre-wrap overflow-y-auto max-h-[420px] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500 empty:before:pointer-events-none ${className}`}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />

        {/* Mismatch warnings */}
        {hasMismatches && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <div>
              {mismatches.orphanedInContent.length > 0 && (
                <span>
                  Undefined: {mismatches.orphanedInContent.map((n) => `[[${n}]]`).join(', ')}
                </span>
              )}
              {mismatches.orphanedInContent.length > 0 && mismatches.orphanedInParams.length > 0 && ' | '}
              {mismatches.orphanedInParams.length > 0 && (
                <span>
                  Unused: {mismatches.orphanedInParams.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Autocomplete dropdown */}
        {autocomplete && (
          <ParamAutocomplete
            params={params}
            query={autocomplete.query}
            position={autocomplete.position}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
            onClose={handleAutocompleteClose}
          />
        )}

        {/* Param edit popover */}
        {editTarget && (
          <ParamEditPopover
            param={editTarget.param}
            onUpdate={handleParamUpdate}
            onRemove={handleParamRemove}
            anchorRect={editTarget.rect}
            onClose={() => setEditTarget(null)}
          />
        )}
      </div>
    )
  }
)
