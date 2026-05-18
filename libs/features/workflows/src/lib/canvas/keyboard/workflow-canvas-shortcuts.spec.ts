import { describe, expect, it } from 'vitest'

import {
  matchesWorkflowCanvasShortcut,
  shouldSuppressWorkflowCanvasShortcut,
  shortcutLabel,
} from './workflow-canvas-shortcuts'

describe('workflow canvas shortcuts', () => {
  it('suppresses shortcuts inside text editing surfaces', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    const child = document.createElement('span')
    editor.appendChild(child)

    expect(shouldSuppressWorkflowCanvasShortcut(input)).toBe(true)
    expect(shouldSuppressWorkflowCanvasShortcut(textarea)).toBe(true)
    expect(shouldSuppressWorkflowCanvasShortcut(child)).toBe(true)
    expect(shouldSuppressWorkflowCanvasShortcut(document.createElement('button'))).toBe(false)
  })

  it('matches exact modifier combinations', () => {
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
    const shifted = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })

    expect(matchesWorkflowCanvasShortcut(event, { key: 'z', meta: true, commandId: 'history.undo' })).toBe(true)
    expect(matchesWorkflowCanvasShortcut(shifted, { key: 'z', meta: true, commandId: 'history.undo' })).toBe(false)
    expect(matchesWorkflowCanvasShortcut(shifted, { key: 'z', meta: true, shift: true, commandId: 'history.redo' })).toBe(true)
  })

  it('renders shortcut labels', () => {
    expect(shortcutLabel({ key: 'f', meta: true, shift: true, commandId: 'viewport.fitView' })).toBe('Ctrl/Cmd+Shift+F')
  })
})
