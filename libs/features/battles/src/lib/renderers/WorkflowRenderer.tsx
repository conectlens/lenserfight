import React from 'react'
import { GitBranch } from 'lucide-react'
import { motion } from 'framer-motion'

import type { BattleContentRenderer } from '../types/battle-renderer.types'
import { WorkflowSubmissionViewer } from '../components/submission/WorkflowSubmissionViewer'

const WorkflowIdleAnimation: React.FC = () => (
  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-3 p-6">
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      className="flex items-center justify-center"
    >
      <GitBranch size={32} className="text-greyscale-600" />
    </motion.div>
    {/* Animated dashed-line DAG silhouette */}
    <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
      <motion.circle cx="10" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-greyscale-700"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
      />
      <motion.circle cx="40" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-greyscale-700"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
      />
      <motion.circle cx="40" cy="30" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-greyscale-700"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
      />
      <motion.circle cx="70" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="1.5"
        className="text-greyscale-700"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
      />
      <line x1="15" y1="20" x2="35" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-greyscale-800" />
      <line x1="15" y1="20" x2="35" y2="28" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-greyscale-800" />
      <line x1="45" y1="12" x2="65" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-greyscale-800" />
      <line x1="45" y1="28" x2="65" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" className="text-greyscale-800" />
    </svg>
    <p className="text-xs text-greyscale-600">Workflow submission</p>
  </div>
)

export const WorkflowRenderer: BattleContentRenderer = {
  contentType: 'workflow',
  SubmissionRenderer: WorkflowSubmissionViewer,
  IdleAnimation: WorkflowIdleAnimation,
  voteStyle: 'ab_choice',
}
