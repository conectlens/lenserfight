import React from 'react'
import { Dialog } from '@lenserfight/ui/overlays'
import { WaitingListSection } from '@lenserfight/features/waiting-list'

interface WaitingListModalProps {
  isOpen: boolean
  onClose: () => void
}

export const WaitingListModal: React.FC<WaitingListModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Early Access"
      description="Join the waitlist for upcoming features and agentic workflows."
      maxWidth="max-w-lg"
    >
      <WaitingListSection />
    </Dialog>
  )
}
