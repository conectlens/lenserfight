import React, { useRef, useEffect, useState, useCallback } from 'react'
import { CreateVersionParamInput, ToolRecord } from '@lenserfight/types'
import { parseContentSegments, detectParamMismatches, type ParamMismatch } from '@lenserfight/utils/text'
import { ParamAutocomplete } from './ParamAutocomplete'
import { ToolPickerDropdown } from './ToolPickerDropdown'
import { AlertTriangle, Type, Hash, ToggleLeft, Paperclip, ChevronDown, Link, Calendar, AlignLeft } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

export interface LensContentEditorProps {
  value: string
  onChange: (value: string) => void
  versionParams: CreateVersionParamInput[]
  onVersionParamsChange: (params: CreateVersionParamInput[]) => void
  tools: ToolRecord[]
  placeholder?: string
  className?: string
}

export interface LensContentEditorHandle {
  insertParam: (label: string, toolId: string) => void
  focus: () => void
}

// ─── Quick-add param toolbar templates ───────────────────────────────────

interface QuickTemplate {
  label: string
  icon: React.ReactNode
  colorClass: string
  toolKey: string
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { label: 'Text',      icon: <Type size={12} />,        colorClass: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',     toolKey: 'text' },
  { label: 'Number',    icon: <Hash size={12} />,        colorClass: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', toolKey: 'number' },
  { label: 'Toggle',    icon: <ToggleLeft size={12} />,  colorClass: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', toolKey: 'boolean' },
  { label: 'File',      icon: <Paperclip size={12} />,   colorClass: 'bg-slate-50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400', toolKey: 'file' },
  { label: 'Select',    icon: <ChevronDown size={12} />, colorClass: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',     toolKey: 'select' },
  { label: 'URL',       icon: <Link size={12} />,        colorClass: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400', toolKey: 'url' },
  { label: 'Date',      icon: <Calendar size={12} />,    colorClass: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',     toolKey: 'date' },
  { label: 'Long Text', icon: <AlignLeft size={12} />,   colorClass: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400', toolKey: 'textarea' },
]

function uniquifyLabel(base: string, existing: CreateVersionParamInput[]): string {
  const names = new Set(existing.map((p) => p.label))
  if (!names.has(base)) return base
  let i = 2
  while (names.has(`${base}_${i}`)) i++
  return `${base}_${i}`
}

// ─── Chip color from tool.color or tool.type ──────────────────────────────

const TYPE_CHIP_CLASSES: Record<string, string> = {
  text:      'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',
  textarea:  'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
  number:    'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  integer:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  float:     'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  decimal:   'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',
  boolean:   'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700',
  select:    'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700',
  url:       'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
  date:      'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  datetime:  'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700',
  file:      'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  json:      'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700',
}
const DEFAULT_CHIP_CLASS = TYPE_CHIP_CLASSES.text

// ─── Component ────────────────────────────────────────────────────────────

export const LensContentEditor = React.forwardRef<LensContentEditorHandle, LensContentEditorProps>(
  ({ value, onChange, versionParams, onVersionParamsChange, tools, placeholder, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const lastKnownValue = useRef('')
    const isTypingParam = useRef(false)
    const internalDragName = useRef<string | null>(null)

    // Autocomplete state
    const [autocomplete, setAutocomplete] = useState<{
      query: string
      position: { top: number; left: number }
    } | null>(null)

    // Tool picker state (replaces ParamEditPopover)
    const [toolPicker, setToolPicker] = useState<{
      paramLabel: string
      rect: DOMRect
    } | null>(null)

    // Mismatch state
    const [mismatches, setMismatches] = useState<ParamMismatch>({ orphanedInContent: [], orphanedInParams: [] })

    // ─── Helpers ──────────────────────────────────────────────────────

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

    const getChipClasses = useCallback((paramLabel: string): string => {
      const vp = versionParams.find((p) => p.label === paramLabel)
      if (vp?.toolId) {
        const tool = tools.find((t) => t.id === vp.toolId)
        if (tool) return TYPE_CHIP_CLASSES[tool.type] ?? DEFAULT_CHIP_CLASS
      }
      return DEFAULT_CHIP_CLASS
    }, [versionParams, tools])

    // ─── Create chip DOM element ──────────────────────────────────────

    const createChipElement = useCallback((paramLabel: string): HTMLSpanElement => {
      const chipColors = getChipClasses(paramLabel)
      const vp = versionParams.find((p) => p.label === paramLabel)
      const tool = vp?.toolId ? tools.find((t) => t.id === vp.toolId) : null
      const isRequired = tool?.required !== false

      const chip = document.createElement('span')
      chip.contentEditable = 'false'
      chip.setAttribute('data-param', paramLabel)
      chip.className = `inline-flex items-center px-1.5 py-0.5 rounded-md font-mono text-xs font-medium select-none align-middle whitespace-nowrap border mx-0.5 ${chipColors} ${isRequired ? '' : 'border-dashed'} cursor-pointer`
      chip.textContent = `[[${paramLabel}]]`
      chip.title = `${paramLabel}${tool ? ` (${tool.label ?? tool.key})` : ''} — right-click to change tool`

      const openPicker = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        setToolPicker({ paramLabel, rect: chip.getBoundingClientRect() })
      }

      chip.addEventListener('dblclick', openPicker)
      chip.addEventListener('contextmenu', openPicker)

      chip.draggable = true
      chip.addEventListener('dragstart', (e) => {
        const de = e as DragEvent
        de.dataTransfer?.setData('text/plain', `[[${paramLabel}]]`)
        if (de.dataTransfer) de.dataTransfer.effectAllowed = 'move'
        internalDragName.current = paramLabel
      })
      chip.addEventListener('dragend', () => {
        internalDragName.current = null
      })

      return chip
    }, [versionParams, tools, getChipClasses])

    // ─── Hydration: value → DOM ───────────────────────────────────────

    const hydrate = useCallback(() => {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''
      const normalizedValue = value.replace(/\{\{(\w+)\}\}/g, '[[$1]]')
      const segments = parseContentSegments(normalizedValue)
      segments.forEach((seg) => {
        if (seg.type === 'text') {
          if (seg.content) containerRef.current?.appendChild(document.createTextNode(seg.content))
        } else if (seg.type === 'param') {
          containerRef.current?.appendChild(createChipElement(seg.name))
        }
      })
      lastKnownValue.current = normalizedValue
    }, [value, createChipElement])

    useEffect(() => {
      if (!containerRef.current) return
      if (value === '' && containerRef.current.textContent !== '') {
        containerRef.current.innerHTML = ''
        lastKnownValue.current = ''
        return
      }
      if (value !== lastKnownValue.current) hydrate()
    }, [value, hydrate])

    useEffect(() => {
      // Build a LensParam-compatible mismatch check using labels
      const pseudoParams = versionParams.map((p) => ({
        name: p.label,
        type: 'string' as const,
        required: true,
      }))
      setMismatches(detectParamMismatches(value, pseudoParams))
    }, [value, versionParams])

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
            text += `[[${el.getAttribute('data-param')}]]`
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
      if (isTypingParam.current) {
        setAutocomplete(null)
        isTypingParam.current = false
      }
      serializeContent()
    }, [serializeContent])

    // ─── Insert param chip ────────────────────────────────────────────

    const insertParamByLabel = useCallback((paramLabel: string, toolId: string) => {
      if (!containerRef.current) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        const chip = createChipElement(paramLabel)
        containerRef.current.appendChild(chip)
        containerRef.current.appendChild(document.createTextNode('\u00A0'))
        serializeContent()
        return
      }

      const range = selection.getRangeAt(0)
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

      const chip = createChipElement(paramLabel)
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

    const handleQuickAdd = useCallback((tpl: QuickTemplate) => {
      const tool = tools.find((t) => t.key === tpl.toolKey)
      const toolId = tool?.id ?? ''
      const uniqueLabel = uniquifyLabel(tpl.toolKey, versionParams)
      onVersionParamsChange([...versionParams, { label: uniqueLabel, toolId }])
      insertParamByLabel(uniqueLabel, toolId)
      containerRef.current?.focus()
    }, [tools, versionParams, onVersionParamsChange, insertParamByLabel])

    // ─── Autocomplete handlers ────────────────────────────────────────

    const handleAutocompleteSelect = useCallback((name: string) => {
      const existing = versionParams.find((p) => p.label === name)
      const toolId = existing?.toolId ?? tools.find((t) => t.key === 'text')?.id ?? ''
      insertParamByLabel(name, toolId)
    }, [versionParams, tools, insertParamByLabel])

    const handleCreateNew = useCallback((name: string) => {
      const toolId = tools.find((t) => t.key === 'text')?.id ?? ''
      onVersionParamsChange([...versionParams, { label: name, toolId }])
      insertParamByLabel(name, toolId)
    }, [versionParams, tools, onVersionParamsChange, insertParamByLabel])

    // ─── Tool picker handler ───────────────────────────────────────────

    const handleToolSelect = useCallback((toolId: string) => {
      if (!toolPicker) return
      const updated = versionParams.map((p) =>
        p.label === toolPicker.paramLabel ? { ...p, toolId } : p
      )
      onVersionParamsChange(updated)
      setToolPicker(null)
      // Force chip re-render by resetting hydration
      requestAnimationFrame(() => {
        if (containerRef.current) {
          lastKnownValue.current = ''
          hydrate()
        }
      })
    }, [toolPicker, versionParams, onVersionParamsChange, hydrate])

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

    // ─── Drop handler ─────────────────────────────────────────────────

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('text/plain')
      const match = raw.match(/^\[\[(\w+)\]\]$/)
      if (!match) return

      const paramLabel = match[1]
      const isInternal = internalDragName.current === paramLabel

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
        const wkDoc = document as Document & { caretRangeFromPoint?: (x: number, y: number) => Range | null }
        const range = wkDoc.caretRangeFromPoint?.(e.clientX, e.clientY)
        if (range) { sel.removeAllRanges(); sel.addRange(range) }
      }

      if (isInternal && containerRef.current) {
        const existing = containerRef.current.querySelector(`[data-param="${paramLabel}"]`)
        existing?.parentNode?.removeChild(existing)
      }

      const existingVp = versionParams.find((p) => p.label === paramLabel)
      const toolId = existingVp?.toolId ?? tools.find((t) => t.key === 'text')?.id ?? ''

      if (!existingVp) {
        onVersionParamsChange([...versionParams, { label: paramLabel, toolId }])
      }

      insertParamByLabel(paramLabel, toolId)
      internalDragName.current = null
    }, [versionParams, tools, onVersionParamsChange, insertParamByLabel])

    // ─── Imperative handle ────────────────────────────────────────────

    React.useImperativeHandle(ref, () => ({
      insertParam: (label: string, toolId: string) => insertParamByLabel(label, toolId),
      focus: () => containerRef.current?.focus(),
    }))

    // ─── Render ───────────────────────────────────────────────────────

    // Build a simple pseudo-param array for autocomplete (just labels)
    const pseudoParamsForAutocomplete = versionParams.map((p) => ({
      name: p.label,
      type: 'string' as const,
      required: true,
    }))

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
                <span>Undefined: {mismatches.orphanedInContent.map((n) => `[[${n}]]`).join(', ')}</span>
              )}
              {mismatches.orphanedInContent.length > 0 && mismatches.orphanedInParams.length > 0 && ' | '}
              {mismatches.orphanedInParams.length > 0 && (
                <span>Unused: {mismatches.orphanedInParams.join(', ')}</span>
              )}
            </div>
          </div>
        )}

        {/* Autocomplete dropdown */}
        {autocomplete && (
          <ParamAutocomplete
            params={pseudoParamsForAutocomplete}
            query={autocomplete.query}
            position={autocomplete.position}
            onSelect={(p) => handleAutocompleteSelect(p.name)}
            onCreateNew={handleCreateNew}
            onClose={() => { setAutocomplete(null); isTypingParam.current = false }}
          />
        )}

        {/* Tool picker popover — opened on chip right-click / double-click */}
        {toolPicker && (
          <ToolPickerDropdown
            paramLabel={toolPicker.paramLabel}
            currentToolId={versionParams.find((p) => p.label === toolPicker.paramLabel)?.toolId}
            tools={tools}
            anchorRect={toolPicker.rect}
            onSelect={handleToolSelect}
            onClose={() => setToolPicker(null)}
          />
        )}
      </div>
    )
  }
)
