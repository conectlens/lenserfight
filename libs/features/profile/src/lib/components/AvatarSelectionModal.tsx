import { createAvatar } from '@dicebear/core'
import { micah, openPeeps, pixelArt, toonHead } from '@dicebear/collection'
import { Trash2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Tabs, TabList, Tab, TabPanel } from '@lenserfight/ui/layout'

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

const AVATAR_STYLES = [
  { id: 'pixel-art', label: 'Pixel Art', collection: pixelArt },
  { id: 'open-peeps', label: 'Open Peeps', collection: openPeeps },
  { id: 'micah', label: 'Micah', collection: micah },
  { id: 'toon-head', label: 'Toon Head', collection: toonHead },
] as const

type StyleId = (typeof AVATAR_STYLES)[number]['id']

const PRESETS_BY_STYLE = Object.fromEntries(
  AVATAR_STYLES.map(({ id, collection }) => [
    id,
    SEEDS.map((seed) => createAvatar(collection, { seed }).toDataUri()),
  ])
) as Record<StyleId, string[]>

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentUrl,
}) => {
  const [selected, setSelected] = useState<string | null>(null)
  const [activeStyle, setActiveStyle] = useState<StyleId>('pixel-art')

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
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Choose your Lenser"
      maxWidth="max-w-2xl"
      footer={
        <ModalFooter
          leftButton={{ label: <><Trash2 size={16} /> Remove</>, onClick: handleRemove, variant: 'danger' }}
          rightButtons={[{ label: 'Cancel', onClick: onClose, disabled: isLoading, variant: 'secondary' }]}
          primaryButton={{ label: 'Save', onClick: handleConfirm, isLoading }}
        />
      }
    >
      <Tabs value={activeStyle} onChange={(id) => setActiveStyle(id as StyleId)}>
        <TabList variant="pills" className="mb-4">
          {AVATAR_STYLES.map(({ id, label }) => (
            <Tab key={id} id={id}>{label}</Tab>
          ))}
        </TabList>
        {AVATAR_STYLES.map(({ id }) => (
          <TabPanel key={id} id={id}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {PRESETS_BY_STYLE[id].map((uri) => (
                <button
                  key={uri}
                  onClick={() => setSelected(uri)}
                  className={`
                      relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1 group
                      ${selected === uri ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
                  `}
                >
                  <img
                    src={uri}
                    alt="Avatar option"
                    className="w-full h-full object-cover rounded-full bg-gray-50 dark:bg-gray-700"
                  />
                </button>
              ))}
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </Dialog>
  )
}
