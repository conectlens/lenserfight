import React, { useEffect, useRef, useId } from 'react'

let initialized = false

async function getMermaid() {
  const { default: mermaid } = await import('mermaid')
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
    initialized = true
  }
  return mermaid
}

interface MermaidDiagramProps {
  chart: string
  className?: string
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, className }) => {
  const rawId = useId()
  // mermaid IDs must start with a letter and contain no colons
  const id = `md${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    getMermaid().then((mermaid) => {
      if (cancelled || !containerRef.current) return
      mermaid
        .render(id, chart)
        .then(({ svg }) => {
          if (!cancelled && containerRef.current) containerRef.current.innerHTML = svg
        })
        .catch(() => {
          if (!cancelled && containerRef.current) containerRef.current.textContent = chart
        })
    })
    return () => {
      cancelled = true
    }
  }, [chart, id])

  return <div ref={containerRef} className={className} />
}
