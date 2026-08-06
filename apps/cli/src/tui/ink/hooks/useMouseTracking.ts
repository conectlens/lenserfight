import { useEffect, useRef } from 'react'

export interface MouseClickEvent {
  x: number
  y: number
  button: number
}

const MOUSE_ENABLE = '\x1b[?1000h\x1b[?1006h'
const MOUSE_DISABLE = '\x1b[?1000l\x1b[?1006l'
// eslint-disable-next-line no-control-regex -- SGR mouse reports are only distinguishable by their ESC prefix.
const SGR_MOUSE_RE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g

/**
 * Best-effort SGR mouse click support. Scope is click-to-select/dismiss only
 * (no drag/scroll). Deliberately disabled while `enabled` is false — callers
 * turn it off while a text-entry field (command palette, filter box) has
 * focus, since an unrecognized mouse escape sequence could otherwise leak
 * into Ink's own key parser as garbage characters.
 */
export function useMouseTracking(enabled: boolean, onClick: (event: MouseClickEvent) => void): void {
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    if (!enabled || !process.stdin.isTTY) return

    process.stdout.write(MOUSE_ENABLE)

    const handleData = (buf: Buffer | string) => {
      const text = buf.toString()
      SGR_MOUSE_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = SGR_MOUSE_RE.exec(text))) {
        const [, button, x, y, kind] = match
        if (kind === 'm') continue
        onClickRef.current({ x: Number(x), y: Number(y), button: Number(button) })
      }
    }

    process.stdin.on('data', handleData)
    return () => {
      process.stdin.off('data', handleData)
      process.stdout.write(MOUSE_DISABLE)
    }
  }, [enabled])
}
