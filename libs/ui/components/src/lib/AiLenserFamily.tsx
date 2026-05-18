import React from 'react'
import { Badge } from './Badge'

const CDN_AI = 'https://cdn.lenserfight.com/brand/lensers/AI'

const MASCOTS = [
  { src: `${CDN_AI}/CHAO.png`, name: 'CHAO', role: 'Builder & Architect AI Lenser' },
  { src: `${CDN_AI}/LAHİT.png`, name: 'LAHİT', role: 'AI Lenser' },
  { src: `${CDN_AI}/LAPSEKİ.png`, name: 'LAPSEKİ', role: 'AI Lenser' },
  { src: `${CDN_AI}/LENSA.png`, name: 'LENSA', role: 'Creative AI Lenser' },
  { src: `${CDN_AI}/LENSE.png`, name: 'LENSE', role: 'Strategic AI Lenser' },
  { src: `${CDN_AI}/LOLA.png`, name: 'LOLA', role: 'Social AI Lenser' },
  { src: `${CDN_AI}/LUPEM.png`, name: 'LUPEM', role: 'AI Lenser' },
]

export interface AiLenserFamilyProps {
  className?: string
  centered?: boolean
}

export const AiLenserFamily: React.FC<AiLenserFamilyProps> = ({ className, centered = true }) => {
  return (
    <section className={className}>
      <div className={`mb-8 space-y-2${centered ? ' text-center' : ''}`}>
        <Badge color="yellow" variant="outline">AI Lenser Family</Badge>
        <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
          Meet the mascots
        </h2>
        <p className={`${centered ? 'mx-auto ' : ''}max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400`}>
          CHAO, LAHİT, LAPSEKİ, LENSA, LENSE, LOLA, and LUPEM are the AI lensers of the arena — your guides through every battle.
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
