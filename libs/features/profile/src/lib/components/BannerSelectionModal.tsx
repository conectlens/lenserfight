import { createAvatar } from '@dicebear/core'
import { shapes } from '@dicebear/collection'
import { Trash2 } from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback } from 'react'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'

interface BannerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | null) => void
  isLoading: boolean
  currentUrl?: string | null
}

// 200 abstract seeds producing distinct geometric compositions
const ALL_BANNER_SEEDS = [
  'aurora','nebula','prism','vortex','zenith','cobalt','ember','frost','helix','indigo',
  'jade','krypton','lumen','mosaic','onyx','quasar','radiant','solar','tidal','ultra',
  'vapor','warp','xenon','yellow','zephyr','abyss','blaze','crimson','delta','echo',
  'flare','gamma','haze','ionic','jolt','karma','lava','mirage','nova','orbit',
  'peak','quartz','rift','surge','terra','umbra','vivid','wave','xeno','yield',
  'azimuth','beacon','cascade','dusk','equinox','fathom','gravity','haven','illume','jewel',
  'kinetic','lattice','maelstrom','nocturn','oasis','parallax','quill','rupture','strata','tempest',
  'utopia','vertex','whirl','xylem','yonder','zenon','achroma','bliss','cyan','dune',
  'electra','fern','glow','hue','iris','jasper','kelp','lime','mint','noir',
  'opal','pearl','quince','rose','sage','teal','umber','viridian','wheat','xylo',
  'alabaster','beryl','cerise','dove','ecru','fallow','gesso','hoar','ivory','jet',
  'khaki','lapis','mallow','neem','ochre','puce','russet','sepia','taupe','umber2',
  'viole','weld','xanth','yarrow','zin','acacia','birch','cedar','dusk2','elm',
  'fir','grove','hazel','ilex','juniper','koa','larch','maple','neem2','oak',
  'pine','quince2','rowan','spruce','teak','ulmus','vine','walnut','xeric','yew',
  'aeon','brine','cavern','drift','eddy','fjord','gorge','hollow','inlet','jetty',
  'kelp2','ledge','mist','narrows','outcrop','plateau','rapids','shoal','tarn','undine',
  'vale','wisp','xyster','yore','zeal','alpha','beta','gamma2','delta2','epsilon',
  'zeta','eta','theta','iota','kappa','lambda','mu','nu','xi','omicron',
  'pi','rho','sigma','tau','upsilon','phi','chi','psi','omega','aleph',
]

const PAGE_SIZE = 20

export const BannerSelectionModal: React.FC<BannerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentUrl,
}) => {
  const [selected, setSelected] = useState<string | null>(null)
  const [uris, setUris] = useState<string[]>([])
  const [loadedCount, setLoadedCount] = useState(0)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(currentUrl || null)
      setUris([])
      setLoadedCount(0)
    }
  }, [isOpen, currentUrl])

  // Generate the next batch whenever loadedCount advances
  useEffect(() => {
    if (!isOpen) return
    const seeds = ALL_BANNER_SEEDS.slice(loadedCount, loadedCount + PAGE_SIZE)
    if (seeds.length === 0) return

    const id = requestIdleCallback(
      () => {
        const batch = seeds.map((seed) =>
          createAvatar(shapes, { seed, size: 400 }).toDataUri()
        )
        setUris((prev) => [...prev, ...batch])
      },
      { timeout: 400 }
    )
    return () => cancelIdleCallback(id)
  }, [isOpen, loadedCount])

  const hasMore = loadedCount + PAGE_SIZE < ALL_BANNER_SEEDS.length

  // Attach IntersectionObserver to the sentinel after each batch renders
  useEffect(() => {
    if (!hasMore || uris.length === 0) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Advance by how many we've actually rendered
          setLoadedCount(uris.length)
        }
      },
      { root: scrollRef.current, threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, uris.length])

  const handleConfirm = useCallback(() => onSelect(selected), [onSelect, selected])

  const handleRemove = useCallback(() => {
    if (window.confirm('Are you sure you want to remove your header image?')) onSelect(null)
  }, [onSelect])

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Choose a Header Image"
      maxWidth="max-w-2xl"
      footer={
        <ModalFooter
          leftButton={{ label: <><Trash2 size={16} /> Remove</>, onClick: handleRemove, variant: 'danger' }}
          rightButtons={[{ label: 'Cancel', onClick: onClose, disabled: isLoading, variant: 'secondary' }]}
          primaryButton={{ label: 'Save', onClick: handleConfirm, isLoading }}
        />
      }
    >
      <div ref={scrollRef} className="max-h-[480px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          {uris.map((uri, i) => (
            <button
              key={i}
              onClick={() => setSelected(uri)}
              className={`
                relative aspect-video rounded-xl overflow-hidden border-2 transition-all w-full
                ${selected === uri
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
              `}
            >
              <img
                src={uri}
                alt="Banner option"
                loading="lazy"
                className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800"
              />
              {selected === uri && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                  <div className="bg-white rounded-full p-1 shadow-sm">
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-6">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
              Loading more…
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
