export interface WorkflowCanvasShortcut {
  key: string
  commandId: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

const TEXT_EDITING_ROLES = new Set(['textbox', 'searchbox', 'combobox'])

function hasEditableAncestor(element: HTMLElement | null): boolean {
  let current: HTMLElement | null = element
  while (current) {
    if (current.isContentEditable) return true
    if (current.dataset.shortcutsScope === 'text') return true
    if (current.closest?.('.cm-editor,.monaco-editor,[data-shortcuts-scope="text"]')) return true
    const role = current.getAttribute('role')
    if (role && TEXT_EDITING_ROLES.has(role)) return true
    current = current.parentElement
  }
  return false
}

export function shouldSuppressWorkflowCanvasShortcut(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  return hasEditableAncestor(target)
}

export function isModifierPressed(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey
}

function normalizeKey(key: string): string {
  if (key === 'Esc') return 'escape'
  if (key === ' ') return 'space'
  return key.toLowerCase()
}

export function matchesWorkflowCanvasShortcut(event: KeyboardEvent, shortcut: WorkflowCanvasShortcut): boolean {
  const wantsMeta = shortcut.meta ?? false
  const wantsShift = shortcut.shift ?? false
  const wantsAlt = shortcut.alt ?? false
  return (
    normalizeKey(event.key) === normalizeKey(shortcut.key) &&
    isModifierPressed(event) === wantsMeta &&
    event.shiftKey === wantsShift &&
    event.altKey === wantsAlt
  )
}

export function shortcutLabel(shortcut: WorkflowCanvasShortcut): string {
  const parts: string[] = []
  if (shortcut.meta) parts.push('Ctrl/Cmd')
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key)
  return parts.join('+')
}
