import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'
import { useLocale } from '@lenserfight/shared/i18n-locale'
import { MarkdownRenderer } from '@lenserfight/ui/components'
import { Drawer } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'

interface WorkflowNodeDocsPanelProps {
  nodeType: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; body: string }
  | { status: 'missing' }
  | { status: 'error' }

function buildDocsUrl(nodeType: string, locale: string): string {
  return `/docs/${locale}/reference/workflow-nodes/${nodeType}`
}

/**
 * Right-side 320px inline panel rendering a workflow node's reference docs.
 * Markdown body is fetched lazily on first open. Falls back to catalog
 * metadata when the .md file is not yet published (404).
 */
export function WorkflowNodeDocsPanel({
  nodeType,
  open,
  onOpenChange,
}: WorkflowNodeDocsPanelProps) {
  const { locale } = useLocale()
  const entry = getWorkflowNodeCatalogEntry(nodeType)
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })

  useEffect(() => {
    if (!open || !entry) return
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetch(buildDocsUrl(nodeType, locale))
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 404) {
          setFetchState({ status: 'missing' })
          return
        }
        if (!res.ok) {
          setFetchState({ status: 'error' })
          return
        }
        const body = await res.text()
        if (cancelled) return
        setFetchState({ status: 'ready', body })
      })
      .catch(() => {
        if (!cancelled) setFetchState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [open, entry, nodeType, locale])

  if (!entry) return null

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      title={entry.displayName}
      side="right"
      width="w-80"
    >
      <div className="space-y-4 text-sm">
        <div className="text-xs uppercase tracking-wide text-greyscale-500">
          {entry.category.replace(/_/g, ' ')}
        </div>

        <p className="text-greyscale-700 dark:text-greyscale-300">
          {entry.description}
        </p>

        {entry.inputs.length > 0 && (
          <section>
            <h3 className="font-semibold mb-1 text-greyscale-900 dark:text-greyscale-50">
              Inputs
            </h3>
            <ul className="space-y-1">
              {entry.inputs.map((field) => (
                <li key={field.name} className="text-greyscale-700 dark:text-greyscale-300">
                  <code className="text-xs bg-greyscale-100 dark:bg-greyscale-800 px-1 rounded">
                    {field.name}
                  </code>{' '}
                  <span className="text-xs text-greyscale-500">{field.type}</span>
                  {field.required ? <span className="text-xs text-red-500"> *</span> : null}
                  <div className="text-xs text-greyscale-600 dark:text-greyscale-400">
                    {field.description}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {entry.outputs.length > 0 && (
          <section>
            <h3 className="font-semibold mb-1 text-greyscale-900 dark:text-greyscale-50">
              Outputs
            </h3>
            <ul className="space-y-1">
              {entry.outputs.map((field) => (
                <li key={field.name} className="text-greyscale-700 dark:text-greyscale-300">
                  <code className="text-xs bg-greyscale-100 dark:bg-greyscale-800 px-1 rounded">
                    {field.name}
                  </code>{' '}
                  <span className="text-xs text-greyscale-500">{field.type}</span>
                  <div className="text-xs text-greyscale-600 dark:text-greyscale-400">
                    {field.description}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          {fetchState.status === 'loading' && (
            <div className="text-xs text-greyscale-500">Loading documentation…</div>
          )}
          {fetchState.status === 'ready' && <MarkdownRenderer content={fetchState.body} />}
          {fetchState.status === 'missing' && (
            <div className="text-xs text-greyscale-500">
              Full documentation for this node is available at{' '}
              <code className="bg-greyscale-100 dark:bg-greyscale-800 px-1 rounded">
                /reference/workflow-nodes/{nodeType}
              </code>
              .
            </div>
          )}
          {fetchState.status === 'error' && (
            <div className="text-xs text-red-500">Failed to load documentation.</div>
          )}
        </section>
      </div>
    </Drawer>
  )
}
