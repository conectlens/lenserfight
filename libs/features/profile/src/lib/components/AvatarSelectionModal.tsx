import { micah, openPeeps, pixelArt, toonHead } from '@dicebear/collection'
import { createAvatar } from '@dicebear/core'
import {
  LENSER_DNA_CHARACTERS,
  LENSER_SKIN_TONES,
  createLenserDnaAvatarUri,
} from '@lenserfight/ui/components'
import { Tabs, TabList, Tab, TabPanel } from '@lenserfight/ui/layout'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Trash2 } from 'lucide-react'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface AvatarSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string | null) => void
  isLoading: boolean
  currentUrl?: string | null
  lenserType?: 'ai' | 'human'
}

// 200 diverse seeds for rich variety
const ALL_SEEDS = [
  'Felix','Aneka','Zack','Sarah','Buster','Molly','Pepper','Willow','Garfield','Salem',
  'Luna','Shadow','Max','Chloe','Jack','Bella','Rocky','Daisy','Buddy','Lily',
  'Charlie','Lucy','Cooper','Coco','Bear','Sophie','Teddy','Sadie','Duke','Bailey',
  'Amber','Archie','Ash','Atlas','Aurora','Axel','Azure','Blaze','Bloom','Blue',
  'Bolt','Breeze','Briar','Brook','Bruno','Buck','Cairo','Canyon','Carbon','Cedar',
  'Chase','Chess','Chip','Chrome','Cipher','Clay','Cliff','Cobalt','Cole','Comet',
  'Coral','Crest','Cricket','Crimson','Cruz','Crystal','Cyan','Dagger','Dale','Dapper',
  'Dash','Dawn','Dex','Diego','Dino','Diva','Dixon','Dodge','Domino','Dora',
  'Drake','Drew','Drifter','Echo','Edge','Elara','Elm','Ember','Emmet','Enigma',
  'Envy','Epic','Era','Ethan','Ether','Evan','Ezra','Fable','Falcon','Fawn',
  'Fern','Fiero','Finch','Flare','Flash','Fleet','Flint','Floyd','Flynn','Foam',
  'Forge','Fox','Fray','Frost','Fury','Galaxy','Gale','Garnet','Ghost','Gizmo',
  'Glacier','Glen','Glimmer','Glitch','Glow','Granite','Grapple','Grayson','Grit','Grove',
  'Halo','Hamish','Harbor','Harley','Hawk','Hazel','Heath','Hero','Hex','Hiro',
  'Holden','Hollow','Homer','Hondo','Hops','Hudson','Hugo','Hunter','Hydra','Icon',
  'Iggy','Ike','Indie','Indigo','Ion','Iris','Iron','Ivan','Ivory','Ivy',
  'Jace','Jade','Jagger','Jasper','Jay','Jett','Jinx','Joel','Jonas','Juno',
  'Kael','Kai','Karma','Keen','Kian','Kilo','Knox','Kodex','Koda','Kova',
  'Lark','Laser','Latch','Lava','Levi','Link','Lion','Loki','Lotus','Lux',
]

const PAGE_SIZE = 30

const DICEBEAR_STYLES = [
  { id: 'pixel-art',  label: 'Pixel Art',  collection: pixelArt },
  { id: 'open-peeps', label: 'Open Peeps', collection: openPeeps },
  { id: 'micah',      label: 'Micah',      collection: micah },
  { id: 'toon-head',  label: 'Toon Head',  collection: toonHead },
] as const

type DicebearStyleId = (typeof DICEBEAR_STYLES)[number]['id']
type StyleId = 'lenser-dna' | DicebearStyleId

// ── Lenser DNA avatar options ─────────────────────────────────────────────────

const AI_CORE_COLORS = ['#00C896', '#FF63B8', '#2DA8FF', '#FF9500']

function buildAiOptions(): string[] {
  // First 4: official characters with exact DNA
  const official = LENSER_DNA_CHARACTERS.map((c) =>
    createLenserDnaAvatarUri({
      type: 'ai',
      coreColor: c.coreColor,
      antennaTip: c.antennaTip,
      smileStyle: c.smileStyle,
      seed: c.id,
    })
  )
  // 16 more variations from seed list
  const variations = ALL_SEEDS.slice(0, 16).map((seed, i) =>
    createLenserDnaAvatarUri({
      type: 'ai',
      coreColor: AI_CORE_COLORS[i % AI_CORE_COLORS.length],
      seed,
    })
  )
  return [...official, ...variations]
}

function buildHumanOptions(): string[] {
  // 6 skin tones × 4 core colors = 24 options
  return LENSER_SKIN_TONES.flatMap((skinTone, si) =>
    AI_CORE_COLORS.map((coreColor, ci) =>
      createLenserDnaAvatarUri({
        type: 'human',
        skinTone,
        coreColor,
        seed: `${si}-${ci}`,
      })
    )
  )
}

// ── Lenser DNA panel ──────────────────────────────────────────────────────────

const LenserDnaPanel: React.FC<{
  lenserType: 'ai' | 'human'
  selected: string | null
  onSelect: (uri: string) => void
}> = ({ lenserType, selected, onSelect }) => {
  const uris = useMemo(
    () => (lenserType === 'ai' ? buildAiOptions() : buildHumanOptions()),
    [lenserType]
  )

  return (
    <div className="space-y-3">
      {lenserType === 'ai' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          First four are the official AI Lensers — LENSO, LENSA, LENSE, LOLA.
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {uris.map((uri, i) => (
          <button
            key={i}
            onClick={() => onSelect(uri)}
            className={`
              relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1
              ${selected === uri
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
            `}
            title={lenserType === 'ai' && i < 4
              ? ['LENSO', 'LENSA', 'LENSE', 'LOLA'][i]
              : `Lenser DNA variant ${i + 1}`}
          >
            <img
              src={uri}
              alt={lenserType === 'ai' && i < 4
                ? `${['LENSO', 'LENSA', 'LENSE', 'LOLA'][i]} AI Lenser`
                : 'Lenser DNA avatar'}
              className="w-full h-full object-cover rounded-full bg-gray-50 dark:bg-gray-700"
            />
            {lenserType === 'ai' && i < 4 && (
              <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-black tracking-widest bg-black/40 text-white py-0.5 rounded-b-full">
                {['LENSO', 'LENSA', 'LENSE', 'LOLA'][i]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Dicebear infinite scroll panel ───────────────────────────────────────────

function useInfiniteAvatars(styleId: DicebearStyleId) {
  const collection = useMemo(
    () => DICEBEAR_STYLES.find((s) => s.id === styleId)!.collection,
    [styleId]
  )
  const [page, setPage] = useState(1)
  const [uris, setUris] = useState<string[]>([])
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPage(1)
    setUris([])
  }, [styleId])

  useEffect(() => {
    const start = (page - 1) * PAGE_SIZE
    const seeds = ALL_SEEDS.slice(start, start + PAGE_SIZE)
    if (seeds.length === 0) return

    const id = requestIdleCallback(
      () => {
        const batch = seeds.map((seed) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          createAvatar(collection as any, { seed }).toDataUri()
        )
        setUris((prev) => [...prev, ...batch])
      },
      { timeout: 300 }
    )
    return () => cancelIdleCallback(id)
  }, [page, collection])

  const hasMore = page * PAGE_SIZE < ALL_SEEDS.length

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setPage((p) => p + 1) },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, uris.length])

  return { uris, hasMore, sentinelRef }
}

const DicebearAvatarPanel: React.FC<{
  styleId: DicebearStyleId
  selected: string | null
  onSelect: (uri: string) => void
}> = ({ styleId, selected, onSelect }) => {
  const { uris, hasMore, sentinelRef } = useInfiniteAvatars(styleId)

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {uris.map((uri) => (
        <button
          key={uri}
          onClick={() => onSelect(uri)}
          className={`
            relative aspect-square rounded-full overflow-hidden border-2 transition-all p-1 group
            ${selected === uri
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'}
          `}
        >
          <img
            src={uri}
            alt="Avatar option"
            loading="lazy"
            className="w-full h-full object-cover rounded-full bg-gray-50 dark:bg-gray-700"
          />
        </button>
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="col-span-full flex justify-center py-4">
          <span className="text-sm text-gray-400">Loading more…</span>
        </div>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isLoading,
  currentUrl,
  lenserType = 'human',
}) => {
  const [selected, setSelected] = useState<string | null>(null)
  const [activeStyle, setActiveStyle] = useState<StyleId>('lenser-dna')

  useEffect(() => {
    if (isOpen) setSelected(currentUrl || null)
  }, [isOpen, currentUrl])

  const handleConfirm = useCallback(() => onSelect(selected), [onSelect, selected])

  const handleRemove = useCallback(() => {
    if (window.confirm('Are you sure you want to remove your avatar?')) onSelect(null)
  }, [onSelect])

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
          <Tab id="lenser-dna">Lenser DNA</Tab>
          {DICEBEAR_STYLES.map(({ id, label }) => (
            <Tab key={id} id={id}>{label}</Tab>
          ))}
        </TabList>

        <TabPanel id="lenser-dna">
          <div className="max-h-[420px] overflow-y-auto pr-1">
            <LenserDnaPanel
              lenserType={lenserType}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        </TabPanel>

        {DICEBEAR_STYLES.map(({ id }) => (
          <TabPanel key={id} id={id}>
            <div className="max-h-[420px] overflow-y-auto pr-1">
              <DicebearAvatarPanel styleId={id} selected={selected} onSelect={setSelected} />
            </div>
          </TabPanel>
        ))}
      </Tabs>
    </Dialog>
  )
}
