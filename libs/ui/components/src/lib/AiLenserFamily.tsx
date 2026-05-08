import React from 'react'
import { Badge } from './Badge'

const MASCOTS = [
  { src: '/brand/LENSA_DNA.png', name: 'LENSA', role: 'Creative AI Lenser' },
  { src: '/brand/LENSE_DNA.png', name: 'LENSE', role: 'Core AI Lenser' },
  { src: '/brand/LENSO_DNA.png', name: 'LENSO', role: 'Autonomous AI Lenser' },
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
          LENSA, LENSE, and LENSO are the AI lensers of the arena — your guides through every battle.
        </p>
      </div>
      <div className={`flex flex-wrap items-center ${centered ? 'justify-center' : 'justify-start'} gap-10`}>
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
