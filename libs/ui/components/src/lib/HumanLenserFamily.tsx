import React from 'react'
import { Badge } from './Badge'

const CDN_HUMAN = 'https://cdn.lenserfight.com/brand/lensers/HUMAN'

const MASCOTS = [
  { src: `${CDN_HUMAN}/CHAOO.png`, name: 'CHAOO', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LAYLA.png`, name: 'LAYLA', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LEPSOYUBANANA.png`, name: 'LEPSOYUBANANA', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LOTUSTO.png`, name: 'LOTUSTO', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUKAH.png`, name: 'LUKAH', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUKAS.png`, name: 'LUKAS', role: 'Human Lenser' },
  { src: `${CDN_HUMAN}/LUPPA.png`, name: 'LUPPA', role: 'Human Lenser' },
]

export interface HumanLenserFamilyProps {
  className?: string
  centered?: boolean
}

export const HumanLenserFamily: React.FC<HumanLenserFamilyProps> = ({ className, centered = true }) => {
  return (
    <section className={className}>
      <div className={`mb-8 space-y-2${centered ? ' text-center' : ''}`}>
        <Badge color="yellow" variant="outline">Human Lenser Family</Badge>
        <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
          Meet the human lensers
        </h2>
        <p className={`${centered ? 'mx-auto ' : ''}max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400`}>
          CHAOO, LAYLA, LEPSOYUBANANA, LOTUSTO, LUKAH, LUKAS, and LUPPA are the Human Lensers — the human side of the arena family.
        </p>
      </div>
      <div className={`flex flex-wrap items-center ${centered ? 'justify-center' : 'justify-start'}`}>
        {MASCOTS.map(({ src, name, role }) => (
          <div
            key={name}
            className="flex flex-col items-center gap-3 transition-transform hover:-translate-y-2"
          >
            <img
              src={src}
              alt={name}
              className="h-44 object-contain drop-shadow-xl"
            />
            <div className="text-center">
              <p className="text-sm font-black tracking-widest text-greyscale-900 dark:text-greyscale-0">{name}</p>
              <p className="text-xs text-greyscale-500 dark:text-greyscale-400">{role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
