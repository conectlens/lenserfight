import { HelpButton, Card, Alert, Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { useUI } from '@lenserfight/ui/providers'
import { 
  ArrowUp, 
  ImageIcon, 
  Mic, 
  Paperclip, 
  ChevronDown,
  FileText,
  Image as LucideImage
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

export const ChatPage: React.FC = () => {
  const { setPageTitle } = useUI()
  const [showPlannedAlert, setShowPlannedAlert] = useState(false)

  useEffect(() => {
    setPageTitle('Chat')
    return () => setPageTitle(null)
  }, [setPageTitle])

  const handleComposerClick = () => {
    setShowPlannedAlert(true)
    toast.info("Chat is coming soon!")
  }

  return (
    <div className="flex flex-col items-center min-h-full p-6 max-w-4xl mx-auto w-full gap-8">
      {/* Space for Chat History */}
      <div className="flex-1 w-full flex flex-col items-center justify-center text-greyscale-300 dark:text-greyscale-700 select-none">
        <LucideImage size={64} strokeWidth={1} className="opacity-20 mb-4" />
        <p className="text-sm font-medium">Chat history will appear here</p>
      </div>

      {/* Planned Alert - Triggered on click */}
      {showPlannedAlert && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          <Alert 
            variant="warning" 
            title="Chat Page is Planned" 
            onDismiss={() => setShowPlannedAlert(false)}
          >
            <div className="flex flex-col gap-3">
              <p>
                We are building a powerful multi-agent chat interface. This feature is currently in the planning phase.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Interested in contributing?</span>
                <HelpButton 
                  path="/reference/automation/markdown-objects" 
                  label="Review Docs" 
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
        <HelpButton path="/introduction" label="System Architecture" className="opacity-50 hover:opacity-100" />
        <div className="h-px w-12 bg-greyscale-100 dark:bg-greyscale-800" />
      </div>
    </div>
  )
}
