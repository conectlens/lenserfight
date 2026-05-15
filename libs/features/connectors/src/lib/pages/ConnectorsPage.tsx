import { HelpButton, Alert, Button } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/providers'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'
import { Construction, ExternalLink, Plus, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

const CONNECTORS_DOCS_PATH = '/how-to/contributors/connectors-feature-contribution'
const ADAPTER_GUIDE_PATH = '/how-to/contributors/connector-sdk-getting-started'
const CONNECTORS_UNDER_CONSTRUCTION_MESSAGE =
  'We are building a unified connector interface for local and cloud AI providers. This feature is open for contribution — anyone can help ship it.'

export const ConnectorsPage: React.FC = () => {
  const { setPageTitle } = useUI()
  const [showPlannedAlert, setShowPlannedAlert] = useState(false)

  useEffect(() => {
    setPageTitle('Connectors')
    return () => setPageTitle(null)
  }, [setPageTitle])

  const handleAddClick = () => {
    setShowPlannedAlert(true)
    toast.custom(
      (t) => (
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-amber-500/20 bg-white/95 dark:bg-greyscale-900/95 backdrop-blur-xl shadow-2xl w-[340px] animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm border border-amber-100 dark:border-amber-800/30">
                <Construction size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-greyscale-900 dark:text-greyscale-50 leading-tight">
                  Connectors is under construction
                </h3>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">
                  Development Mode
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(t)}
              className="p-1.5 rounded-lg hover:bg-greyscale-100 dark:hover:bg-greyscale-800 text-greyscale-400 dark:text-greyscale-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-greyscale-600 dark:text-greyscale-400 leading-relaxed">
            {CONNECTORS_UNDER_CONSTRUCTION_MESSAGE}
          </p>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-4 pt-1">
              <a
                href={ADAPTER_GUIDE_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-greyscale-500 dark:text-greyscale-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 decoration-greyscale-200 dark:decoration-greyscale-800 transition-all"
                onClick={() => toast.dismiss(t)}
              >
                Adapter SDK guide
              </a>
              <div className="w-1 h-1 rounded-full bg-greyscale-200 dark:bg-greyscale-800" />
              <a
                href={CONNECTORS_DOCS_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-greyscale-500 dark:text-greyscale-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 decoration-greyscale-200 dark:decoration-greyscale-800 transition-all"
                onClick={() => toast.dismiss(t)}
              >
                Contribution guide
              </a>
            </div>
          </div>
        </div>
      ),
      { duration: 8000 }
    )
  }

  return (
    <div className="flex flex-col items-center min-h-full p-6 max-w-4xl mx-auto w-full gap-8">
      {/* Under construction hero */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-3 text-greyscale-300 dark:text-greyscale-700 select-none">
        <Construction size={64} strokeWidth={1} className="opacity-30 mb-2" />
        <p className="text-base font-semibold text-greyscale-500 dark:text-greyscale-500">Under Construction</p>
        <p className="text-sm text-greyscale-400 dark:text-greyscale-600">Connector management for AI Lensers is being built. Want to help?</p>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddClick}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-greyscale-200 bg-white px-4 py-2.5 text-sm font-semibold text-greyscale-800 shadow-neu-1 hover:border-primary-yellow-500/60 hover:text-primary-yellow-700 dark:border-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-100 dark:hover:text-primary-yellow-400"
        >
          <Plus size={16} />
          Add connector
        </Button>
        <p className="text-xs text-greyscale-400 dark:text-greyscale-600">
          Connect Ollama, LM Studio, OpenAI, Anthropic, and more.
        </p>
      </div>

      {/* Planned Alert - triggered on click */}
      {showPlannedAlert && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <Alert
            variant="warning"
            title="Connectors is Under Construction"
            onDismiss={() => setShowPlannedAlert(false)}
          >
            <div className="flex flex-col gap-3">
              <p>{CONNECTORS_UNDER_CONSTRUCTION_MESSAGE}</p>
              <a
                href={CONNECTORS_DOCS_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                Read the contribution guide
                <ExternalLink size={12} className="opacity-70" />
              </a>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Interested in contributing?</span>
                <HelpButton
                  path={CONNECTORS_DOCS_PATH}
                  label="Contribution guide"
                />
              </div>
            </div>
          </Alert>
        </div>
      )}

      {/* Footer help link */}
      <div className="mt-4 flex items-center gap-4 text-greyscale-400">
        <div className="h-px w-12 bg-greyscale-100 dark:bg-greyscale-800" />
        <HelpButton path={CONNECTORS_DOCS_PATH} label="Help build this" className="opacity-50 hover:opacity-100" />
        <div className="h-px w-12 bg-greyscale-100 dark:bg-greyscale-800" />
      </div>
    </div>
  )
}
