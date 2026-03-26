import { Trash2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Button } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'

interface AvatarSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | null) => void
  isLoading: boolean
  currentUrl?: string | null
}

const SEEDS = [
  'Felix',
  'Aneka',
  'Zack',
  'Sarah',
  'Buster',
  'Molly',
  'Pepper',
  'Willow',
  'Garfield',
  'Salem',
  'Luna',
  'Shadow',
  'Max',
  'Chloe',
  'Jack',
  'Bella',
  'Rocky',
  'Daisy',
  'Buddy',
  'Lily',
  'Charlie',
  'Lucy',
  'Cooper',
  'Coco',
  'Bear',
  'Sophie',
  'Teddy',
  'Sadie',
  'Duke',
  'Bailey',
]

const PRESETS = SEEDS.map((seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`)

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentUrl,
}) => {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelected(currentUrl || null)
    }
  }, [isOpen, currentUrl])

  const handleConfirm = () => {
    onSelect(selected)
  }

  const handleRemove = () => {
    if (window.confirm('Are you sure you want to remove your avatar?')) {
      onSelect(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose your Lenser">
      <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mb-6">
          {PRESETS.map((url) => (
            <button
              key={url}
              onClick={() => setSelected(url)}
              className={`
                        relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1 group
                        ${selected === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
                    `}
            >
              <img
                src={url}
                alt="Avatar option"
                className="w-full h-full object-cover rounded-full bg-gray-50 dark:bg-gray-700"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button
          type="button"
          variant="danger"
          onClick={handleRemove}
          title="Remove Avatar"
          className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
        >
          <Trash2 size={16} /> Remove
        </Button>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:w-auto px-4 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} isLoading={isLoading} className="flex-1 sm:w-auto px-6">
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}
