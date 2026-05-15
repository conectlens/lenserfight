import { HelpButton, Card, Alert, Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { useUI } from '@lenserfight/ui/providers'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'
import {
  ArrowUp,
  Construction,
  Mic,
  Paperclip,
  ChevronDown,
  FileText,
  ExternalLink,
  Image as LucideImage,
  X
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

const CHAT_DOCS_PATH = '/how-to/contributors/chat-feature-contribution'
const CHAINABIT_CHAO_URL = 'https://app.chainabit.com/chao'
const CHAT_UNDER_CONSTRUCTION_MESSAGE =
  'We are building a powerful multi-agent chat interface. This feature is open for contribution — anyone can help ship it.'

function ChainabitIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <div 
      className={`rounded-md shrink-0 overflow-hidden flex items-center justify-center bg-white border border-greyscale-100 dark:border-greyscale-800 shadow-sm ${className}`} 
      style={{ width: size, height: size }}
    >
      <img
        src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png"
        width={size}
        height={size}
        alt=""
        className="w-full h-full object-contain"
      />
    </div>
  )
}

export const ChatPage: React.FC = () => {
  const { setPageTitle } = useUI()
  const [showPlannedAlert, setShowPlannedAlert] = useState(false)

  useEffect(() => {
    setPageTitle('Chat')
    return () => setPageTitle(null)
  }, [setPageTitle])

  const handleComposerClick = () => {
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
                  Chat is under construction
                </h3>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase tracking-wider">
                  Development Mode
                </p>
              </div>
            </div>
            <button
              onClick={() => toast.dismiss(t)}
              className="p-1.5 rounded-lg hover:bg-greyscale-100 dark:hover:bg-greyscale-800 text-greyscale-400 dark:text-greyscale-500 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-sm text-greyscale-600 dark:text-greyscale-400 leading-relaxed">
            {CHAT_UNDER_CONSTRUCTION_MESSAGE}
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={CHAINABIT_CHAO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-2 w-full rounded-xl bg-primary-yellow-500 px-4 py-2.5 text-sm font-bold text-greyscale-900 hover:bg-primary-yellow-400 transition-all shadow-md shadow-primary-yellow-500/20 active:scale-[0.98]"
              onClick={() => toast.dismiss(t)}
            >
              <div className="flex items-center gap-2.5">
                <ChainabitIcon size={20} />
                <span>Try Chainabit Chao</span>
              </div>
              <ExternalLink size={14} className="opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <div className="flex items-center justify-center gap-4 pt-1">
              <a
                href={`${DOCS_BASE_URL}/en${CHAT_DOCS_PATH}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-greyscale-500 dark:text-greyscale-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 decoration-greyscale-200 dark:decoration-greyscale-800 transition-all"
                onClick={() => toast.dismiss(t)}
              >
                Contribution guide
              </a>
              <div className="w-1 h-1 rounded-full bg-greyscale-200 dark:bg-greyscale-800" />
              <a
                href={`${DOCS_BASE_URL}/en/how-to/contributors/development-setup`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-greyscale-500 dark:text-greyscale-400 hover:text-amber-600 dark:hover:text-amber-400 underline underline-offset-4 decoration-greyscale-200 dark:decoration-greyscale-800 transition-all"
                onClick={() => toast.dismiss(t)}
              >
                Dev setup
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
        <p className="text-sm text-greyscale-400 dark:text-greyscale-600">Multi-agent chat is being built. Want to help?</p>

        {/* Chainabit Chao redirect — available right now */}
        <a
          href={CHAINABIT_CHAO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-greyscale-200 bg-white px-4 py-2.5 text-sm font-semibold text-greyscale-800 shadow-neu-1 hover:border-primary-yellow-500/60 hover:text-primary-yellow-700 dark:border-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-100 dark:hover:text-primary-yellow-400 transition-colors select-text"
        >
          <ChainabitIcon size={20} />
          <span>Talk with Chainabit Chao now</span>
          <ExternalLink size={14} className="opacity-60" />
        </a>
        <p className="text-xs text-greyscale-400 dark:text-greyscale-600">
          Available today via our partner Chainabit.
        </p>
      </div>

      {/* Planned Alert - Triggered on click */}
      {showPlannedAlert && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <Alert
            variant="warning"
            title="Chat is Under Construction"
            onDismiss={() => setShowPlannedAlert(false)}
          >
            <div className="flex flex-col gap-3">
              <p>{CHAT_UNDER_CONSTRUCTION_MESSAGE}</p>
              <a
                href={CHAINABIT_CHAO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              >
                <ChainabitIcon size={14} />
                Talk with Chainabit Chao now
                <ExternalLink size={12} className="opacity-70" />
              </a>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Interested in contributing?</span>
                <HelpButton
                  path={CHAT_DOCS_PATH}
                  label="Contribution guide"
                />
              </div>
            </div>
          </Alert>
        </div>
      )}

      <div className="w-full flex flex-col gap-4">
        {/* Temp Attachment Previews (from image.png) */}
        <div className="flex gap-3 self-start ml-2">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-greyscale-800 border border-greyscale-100 dark:border-greyscale-700 flex items-center justify-center shadow-sm overflow-hidden group hover:border-primary-yellow-500/50 transition-colors">
             <LucideImage size={24} className="text-greyscale-400 group-hover:text-primary-yellow-600 transition-colors" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-greyscale-800 border border-greyscale-100 dark:border-greyscale-700 flex items-center justify-center shadow-sm group hover:border-primary-yellow-500/50 transition-colors">
             <FileText size={24} className="text-greyscale-400 group-hover:text-primary-yellow-600 transition-colors" />
          </div>
        </div>

        {/* Chat Composer Bar */}
        <Card 
          className="w-full p-2 pr-2 pl-4 flex items-center gap-3 relative cursor-pointer hover:border-greyscale-300 dark:hover:border-greyscale-600 transition-all shadow-neu-1 group"
          onClick={handleComposerClick}
        >
          {/* Model Selector Dropdown Placeholder */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-greyscale-100 dark:border-greyscale-700 bg-greyscale-25 dark:bg-greyscale-900 text-sm font-semibold text-greyscale-700 dark:text-greyscale-300">
            GPT-4o <ChevronDown size={16} className="text-greyscale-400" />
          </div>

          {/* Main Input Field - Disabled */}
          <div className="flex-1">
            <Input 
              placeholder="Type a message..." 
              className="border-none shadow-none bg-transparent py-2 focus:ring-0 cursor-pointer" 
              disabled 
            />
          </div>

          {/* Utility Icons */}
          <div className="flex items-center gap-4 text-greyscale-400 px-2">
            <LucideImage size={20} className="hover:text-greyscale-600 dark:hover:text-greyscale-200 transition-colors" />
            <Mic size={20} className="hover:text-greyscale-600 dark:hover:text-greyscale-200 transition-colors" />
            <Paperclip size={20} className="hover:text-greyscale-600 dark:hover:text-greyscale-200 transition-colors" />
          </div>

          {/* Send Action Button */}
          <Button 
            variant="primary"
            className="w-11 h-11 p-0 rounded-xl shadow-none"
            disabled
          >
            <ArrowUp size={24} strokeWidth={2.5} />
          </Button>

          {/* Transparent Overlay to ensure click capture on disabled elements */}
          <div className="absolute inset-0 z-10" />
        </Card>
      </div>
      
      {/* Footer Docs Link */}
      <div className="mt-4 flex items-center gap-4 text-greyscale-400">
        <div className="h-px w-12 bg-greyscale-100 dark:bg-greyscale-800" />
        <HelpButton path={CHAT_DOCS_PATH} label="Help build this" className="opacity-50 hover:opacity-100" />
        <div className="h-px w-12 bg-greyscale-100 dark:bg-greyscale-800" />
      </div>
    </div>
  )
}
