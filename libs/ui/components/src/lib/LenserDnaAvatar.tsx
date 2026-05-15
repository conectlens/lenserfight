import React, { useMemo } from 'react'

export type LenserType = 'ai' | 'human'
export type AntennaTip = 'star' | 'heart' | 'ring' | 'orbit' | 'broadcast'
export type SmileStyle = 'neutral' | 'curved' | 'sharp' | 'wide'

export type HairStyle = 'bald' | 'bob' | 'long' | 'pixie' | 'pigtails'
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'blue'

export interface LenserDnaAvatarConfig {
  type: LenserType
  coreColor?: string
  antennaTip?: AntennaTip
  smileStyle?: SmileStyle
  skinTone?: string
  eyeColor?: string
  hairStyle?: HairStyle
  hairColor?: HairColor
  seed?: string
}

export interface LenserDnaAvatarProps extends LenserDnaAvatarConfig {
  size?: number
  className?: string
  alt?: string
}

// ── Seed hashing ─────────────────────────────────────────────────────────────

function hashSeed(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i)
  return Math.abs(h)
}

// ── Skin tone palette ─────────────────────────────────────────────────────────

const SKIN_TONES = [
  { base: '#FDDBB4', dark: '#e8b88a', darker: '#c49060', light: '#fff4e0' },
  { base: '#F4C48B', dark: '#d8a060', darker: '#b07840', light: '#fad8a0' },
  { base: '#D4956A', dark: '#b07040', darker: '#8a5030', light: '#e8b080' },
  { base: '#C27B4A', dark: '#9a5830', darker: '#703820', light: '#d89060' },
  { base: '#8B4A2E', dark: '#6a3020', darker: '#4a1810', light: '#a86040' },
  { base: '#4A2615', dark: '#2e1209', darker: '#180804', light: '#6a3820' },
] as const

const HAIR_COLORS = {
  black: '#1A1A1A',
  brown: '#4B2C20',
  blonde: '#E1B871',
  red: '#A53D25',
  blue: '#2C66C7',
} as const

const EYE_COLORS = ['#6B3A2A', '#7B6830', '#3a6a9a', '#3a7a4a', '#7a7a8a']
const AI_CORE_COLORS = ['#00C896', '#FF63B8', '#2DA8FF', '#FF9500']

// ── Antenna tip SVG fragments ─────────────────────────────────────────────────

function antennaTipSvg(tip: AntennaTip, coreColor: string, uid: string): string {
  switch (tip) {
    case 'heart':
      return `<path d="M100,18 C100,18 91,12 91,8 C91,5.2 93,3 95.5,3 C97.1,3 98.6,4.1 100,5.4 C101.4,4.1 102.9,3 104.5,3 C107,3 109,5.2 109,8 C109,12 100,18 100,18Z" fill="${coreColor}" filter="url(#cglow-${uid})"/>`

    case 'ring':
      return `<circle cx="100" cy="12" r="6.5" fill="none" stroke="${coreColor}" stroke-width="2.5"/>
<circle cx="100" cy="12" r="2.5" fill="${coreColor}" filter="url(#cglow-${uid})"/>`

    case 'orbit':
      return `<ellipse cx="100" cy="12" rx="8.5" ry="3.5" fill="none" stroke="${coreColor}" stroke-width="1.8" transform="rotate(-35 100 12)"/>
<circle cx="100" cy="12" r="2.5" fill="${coreColor}" filter="url(#cglow-${uid})"/>`

    case 'broadcast':
      return `<path d="M95,16 Q100,10 105,16" stroke="${coreColor}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M91,19.5 Q100,7 109,19.5" stroke="${coreColor}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.55"/>
<circle cx="100" cy="18" r="2.2" fill="${coreColor}" filter="url(#cglow-${uid})"/>`

    case 'star':
    default:
      return `<circle cx="100" cy="12" r="5.5" fill="#ffde59" filter="url(#cglow-${uid})"/>
<circle cx="100" cy="12" r="2.5" fill="#ffffa0"/>`
  }
}

// ── Smile SVG fragments ───────────────────────────────────────────────────────

function smileSvg(style: SmileStyle): string {
  const stroke = '#1a2b50'
  const sw = 2.6
  const cap = 'round'
  switch (style) {
    case 'curved':
      return `<path d="M90,122 Q100,131 110,122" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="${cap}"/>`
    case 'sharp':
      return `<path d="M88,120 L100,128 L112,120" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="${cap}" stroke-linejoin="round"/>`
    case 'wide':
      return `<path d="M85,121 Q100,136 115,121" stroke="${stroke}" stroke-width="${sw}" fill="none" stroke-linecap="${cap}"/>`
    case 'neutral':
    default:
      return `<line x1="90" y1="123" x2="110" y2="123" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="${cap}"/>`
  }
}

// ── Hair SVG fragments ────────────────────────────────────────────────────────

function hairSvg(style: HairStyle, color: string): string {
  if (style === 'bald') return ''
  
  const fill = color
  const highlight = `<path d="M60,45 Q100,35 130,45" stroke="white" stroke-width="4" fill="none" opacity="0.15" stroke-linecap="round"/>`
  
  switch (style) {
    case 'bob':
      return `
        <!-- Bob hair -->
        <path d="M 28,125 C 28,20 172,20 172,125 C 172,145 152,145 152,125 C 142,80 58,80 48,125 C 48,145 28,145 28,125 Z" fill="${fill}"/>
        ${highlight}
      `
    case 'long':
      return `
        <!-- Long hair front -->
        <path d="M 32,100 C 32,25 168,25 168,100 C 168,120 152,110 152,90 C 132,65 68,65 48,90 C 48,110 32,120 32,100 Z" fill="${fill}"/>
        ${highlight}
      `
    case 'pixie':
      return `
        <!-- Pixie hair -->
        <path d="M 35,95 C 35,15 165,15 165,95 C 165,100 145,80 145,80 C 120,55 80,55 55,80 C 55,80 35,100 35,95 Z" fill="${fill}"/>
        <path d="M 70,30 L 60,10 L 90,25 L 115,5 L 120,25" fill="${fill}"/>
        ${highlight}
      `
    case 'pigtails':
      return `
        <!-- Pigtails -->
        <circle cx="25" cy="80" r="22" fill="${fill}"/>
        <circle cx="175" cy="80" r="22" fill="${fill}"/>
        <path d="M 40,90 C 40,25 160,25 160,90 C 160,105 145,95 145,80 C 125,60 75,60 55,80 C 55,95 40,105 40,90 Z" fill="${fill}"/>
        ${highlight}
      `
    default:
      return ''
  }
}

// ── Core (arc reactor) SVG ────────────────────────────────────────────────────

function coreSvg(coreColor: string, uid: string): string {
  return `<circle cx="100" cy="170" r="13" fill="none" stroke="${coreColor}" stroke-width="1.5" opacity="0.28" filter="url(#cglow-${uid})"/>
<circle cx="100" cy="170" r="9" fill="none" stroke="${coreColor}" stroke-width="1.5" opacity="0.65"/>
<circle cx="100" cy="170" r="5.5" fill="${coreColor}"/>
<circle cx="100" cy="170" r="3" fill="${coreColor}" opacity="0.85" filter="url(#cglow-${uid})"/>`
}

// ── AI head elements ──────────────────────────────────────────────────────────

function buildAiHead(cfg: {
  coreColor: string
  antennaTip: AntennaTip
  smileStyle: SmileStyle
  uid: string
}): string {
  const { coreColor, antennaTip, smileStyle, uid } = cfg
  return `
    <!-- Background -->
    <rect width="200" height="200" fill="#ffde59"/>

    <!-- Cape + shoulders -->
    <path d="M42,152 L15,200 L185,200 L158,152 Q100,147 42,152Z" fill="#213f74"/>
    <ellipse cx="50" cy="150" rx="14" ry="6" fill="#1a2b50"/>
    <ellipse cx="150" cy="150" rx="14" ry="6" fill="#1a2b50"/>
    <rect x="60" y="148" width="80" height="7" rx="3" fill="#ffffff" opacity="0.1"/>

    <!-- Left cylindrical ear -->
    <rect x="26" y="89" width="13" height="23" rx="5" fill="#1a2b50" stroke="#213f74" stroke-width="1.5"/>
    <line x1="29.5" y1="97" x2="29.5" y2="106" stroke="#0a1020" stroke-width="1.3"/>
    <circle cx="36" cy="110" r="1.8" fill="#00e880" opacity="0.95"/>

    <!-- Right cylindrical ear -->
    <rect x="161" y="89" width="13" height="23" rx="5" fill="#1a2b50" stroke="#213f74" stroke-width="1.5"/>
    <line x1="170.5" y1="97" x2="170.5" y2="106" stroke="#0a1020" stroke-width="1.3"/>
    <circle cx="164" cy="110" r="1.8" fill="#00e880" opacity="0.95"/>

    <!-- Antenna base socket -->
    <circle cx="100" cy="53" r="5" fill="#0d1828" stroke="#213f74" stroke-width="1.5"/>
    <!-- Antenna stem -->
    <line x1="100" y1="48" x2="100" y2="19" stroke="#18182a" stroke-width="3.2" stroke-linecap="round"/>
    <!-- Antenna tip -->
    ${antennaTipSvg(antennaTip, coreColor, uid)}

    <!-- Head sphere -->
    <circle cx="100" cy="100" r="63" fill="#ffde59" stroke="#1a2b50" stroke-width="1.5"/>
    <!-- Panel seam 10 o'clock -->
    <path d="M61,72 Q56,67 59,62" stroke="#d4b830" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <!-- Panel seam 2 o'clock -->
    <path d="M139,72 Q144,67 141,62" stroke="#d4b830" stroke-width="1.3" fill="none" stroke-linecap="round"/>

    <!-- Lens outer dark surround -->
    <circle cx="100" cy="96" r="30" fill="#080c14"/>
    <circle cx="100" cy="96" r="30" fill="none" stroke="#1e3354" stroke-width="2"/>
    <!-- Ring 4 -->
    <circle cx="100" cy="96" r="25" fill="none" stroke="#1a3050" stroke-width="1.5"/>
    <!-- Ring 3 -->
    <circle cx="100" cy="96" r="20" fill="none" stroke="#2C66C7" stroke-width="1.5"/>
    <!-- Ring 2 -->
    <circle cx="100" cy="96" r="15" fill="none" stroke="#3d7ae0" stroke-width="1.5"/>
    <!-- Aperture blades at ring-2 boundary (45° intercepts) -->
    <line x1="90" y1="85.5" x2="91.5" y2="87" stroke="#2C66C7" stroke-width="1.8"/>
    <line x1="110" y1="85.5" x2="108.5" y2="87" stroke="#2C66C7" stroke-width="1.8"/>
    <line x1="90" y1="106.5" x2="91.5" y2="105" stroke="#2C66C7" stroke-width="1.8"/>
    <line x1="110" y1="106.5" x2="108.5" y2="105" stroke="#2C66C7" stroke-width="1.8"/>
    <!-- Iris -->
    <circle cx="100" cy="96" r="10.5" fill="#0a1830"/>
    <circle cx="100" cy="96" r="7" fill="#172a5a"/>
    <!-- Inner pupil glow -->
    <circle cx="100" cy="96" r="4.5" fill="#2C66C7" opacity="0.9" filter="url(#lglow-${uid})"/>
    <!-- Glint -->
    <circle cx="105" cy="92" r="2" fill="white" opacity="0.3"/>

    <!-- Smile -->
    ${smileSvg(smileStyle)}

    <!-- Chest core -->
    ${coreSvg(coreColor, uid)}`
}

// ── Human head elements ───────────────────────────────────────────────────────

function buildHumanHead(cfg: {
  coreColor: string
  skinTone: (typeof SKIN_TONES)[number]
  eyeColor: string
  hairStyle: HairStyle
  hairColor: string
  uid: string
}): string {
  const { coreColor, skinTone, eyeColor, hairStyle, hairColor, uid } = cfg
  const { base, dark, darker, light } = skinTone

  return `
    <!-- Background -->
    <rect width="200" height="200" fill="${base}"/>

    <!-- Back hair (for long styles) -->
    ${hairStyle === 'long' ? `<path d="M 37,100 C 37,240 163,240 163,100 Z" fill="${hairColor}"/>` : ''}

    <!-- Cape + shoulders -->
    <path d="M42,152 L15,200 L185,200 L158,152 Q100,147 42,152Z" fill="#213f74"/>
    <ellipse cx="50" cy="150" rx="14" ry="6" fill="#1a2b50"/>
    <ellipse cx="150" cy="150" rx="14" ry="6" fill="#1a2b50"/>

    <!-- Left ear (soft oval) -->
    <ellipse cx="36" cy="100" rx="9" ry="14" fill="${dark}"/>
    <ellipse cx="34" cy="99" rx="5" ry="8" fill="${light}" opacity="0.45"/>

    <!-- Right ear -->
    <ellipse cx="164" cy="100" rx="9" ry="14" fill="${dark}"/>
    <ellipse cx="166" cy="99" rx="5" ry="8" fill="${light}" opacity="0.45"/>

    <!-- Head sphere (skin tone) -->
    <circle cx="100" cy="100" r="63" fill="${base}" stroke="${dark}" stroke-width="1.5"/>

    <!-- Hair -->
    ${hairSvg(hairStyle, hairColor)}

    <!-- Left eyebrow -->
    <path d="M74,84 Q83,79 92,82" stroke="${darker}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.75"/>
    <!-- Right eyebrow -->
    <path d="M108,82 Q117,79 126,84" stroke="${darker}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.75"/>

    <!-- Left eye: sclera -->
    <ellipse cx="83" cy="93" rx="11.5" ry="9.5" fill="white"/>
    <ellipse cx="83" cy="93" rx="11.5" ry="9.5" fill="none" stroke="${dark}" stroke-width="0.9" opacity="0.5"/>
    <!-- Left iris -->
    <circle cx="83" cy="94" r="6.5" fill="${eyeColor}"/>
    <!-- Left pupil -->
    <circle cx="83" cy="94" r="3.8" fill="#111"/>
    <!-- Left glint -->
    <circle cx="85.5" cy="92" r="1.8" fill="white" opacity="0.7"/>

    <!-- Right eye: sclera -->
    <ellipse cx="117" cy="93" rx="11.5" ry="9.5" fill="white"/>
    <ellipse cx="117" cy="93" rx="11.5" ry="9.5" fill="none" stroke="${dark}" stroke-width="0.9" opacity="0.5"/>
    <!-- Right iris -->
    <circle cx="117" cy="94" r="6.5" fill="${eyeColor}"/>
    <!-- Right pupil -->
    <circle cx="117" cy="94" r="3.8" fill="#111"/>
    <!-- Right glint -->
    <circle cx="119.5" cy="92" r="1.8" fill="white" opacity="0.7"/>

    <!-- Nose (two subtle nostrils) -->
    <circle cx="97.5" cy="110" r="2.2" fill="${darker}" opacity="0.45"/>
    <circle cx="102.5" cy="110" r="2.2" fill="${darker}" opacity="0.45"/>

    <!-- Smile -->
    <path d="M87,123 Q100,134 113,123" stroke="${darker}" stroke-width="2.6" fill="none" stroke-linecap="round"/>

    <!-- Chest core (shared heart — same as AI) -->
    ${coreSvg(coreColor, uid)}`
}

// ── Full SVG builder ──────────────────────────────────────────────────────────

function buildSvg(cfg: LenserDnaAvatarConfig, uid: string): string {
  const {
    type,
    seed = 'default',
    coreColor: cfgCore,
    antennaTip: cfgTip,
    smileStyle: cfgSmile,
    skinTone: cfgSkin,
    eyeColor: cfgEye,
    hairStyle: cfgHair,
    hairColor: cfgHairColor,
  } = cfg

  const h = hashSeed(seed)

  const coreColor = cfgCore ?? AI_CORE_COLORS[h % AI_CORE_COLORS.length]
  const antennaTip: AntennaTip = cfgTip ?? (['star', 'heart', 'ring', 'orbit', 'broadcast'][h % 5] as AntennaTip)
  const smileStyle: SmileStyle = cfgSmile ?? (['neutral', 'curved', 'sharp', 'wide'][h % 4] as SmileStyle)
  const skinToneObj = cfgSkin
    ? SKIN_TONES.find((t) => t.base === cfgSkin) ?? SKIN_TONES[h % SKIN_TONES.length]
    : SKIN_TONES[h % SKIN_TONES.length]
  const eyeColor = cfgEye ?? EYE_COLORS[h % EYE_COLORS.length]
  
  const hairStyle: HairStyle = cfgHair ?? (['bald', 'bob', 'long', 'pixie', 'pigtails'][h % 5] as HairStyle)
  const hairColorNames = Object.keys(HAIR_COLORS) as HairColor[]
  const hairColor = cfgHairColor ? HAIR_COLORS[cfgHairColor] : HAIR_COLORS[hairColorNames[h % hairColorNames.length]]

  const body =
    type === 'ai'
      ? buildAiHead({ coreColor, antennaTip, smileStyle, uid })
      : buildHumanHead({ coreColor, skinTone: skinToneObj, eyeColor, hairStyle, hairColor, uid })

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <clipPath id="clip-${uid}">
      <circle cx="100" cy="100" r="99"/>
    </clipPath>
    <filter id="cglow-${uid}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <filter id="lglow-${uid}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g clip-path="url(#clip-${uid})">
    ${body}
  </g>
  <circle cx="100" cy="100" r="97.5" fill="none" stroke="#213f74" stroke-width="2.5" opacity="0.25"/>
</svg>`
}

// ── Public API ────────────────────────────────────────────────────────────────

let _uidCounter = 0

export function createLenserDnaAvatarUri(cfg: LenserDnaAvatarConfig): string {
  const uid = `ld${(_uidCounter++ & 0xffff).toString(36)}`
  const svg = buildSvg(cfg, uid)
  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  } catch {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }
}

export const LENSER_DNA_CHARACTERS = [
  { id: 'LENSO', coreColor: '#00C896', antennaTip: 'orbit'     as AntennaTip, smileStyle: 'neutral' as SmileStyle },
  { id: 'LENSA', coreColor: '#FF63B8', antennaTip: 'heart'     as AntennaTip, smileStyle: 'curved'  as SmileStyle },
  { id: 'LENSE', coreColor: '#2DA8FF', antennaTip: 'ring'      as AntennaTip, smileStyle: 'sharp'   as SmileStyle },
  { id: 'LOLA',  coreColor: '#FF9500', antennaTip: 'broadcast' as AntennaTip, smileStyle: 'wide'    as SmileStyle },
] as const

export const LENSER_SKIN_TONES = SKIN_TONES.map((t) => t.base)

// ── React component ───────────────────────────────────────────────────────────

export const LenserDnaAvatar: React.FC<LenserDnaAvatarProps> = ({
  size = 200,
  className,
  alt,
  ...cfg
}) => {
  const uri = useMemo(() => createLenserDnaAvatarUri(cfg), [
    cfg.type,
    cfg.coreColor,
    cfg.antennaTip,
    cfg.smileStyle,
    cfg.skinTone,
    cfg.eyeColor,
    cfg.hairStyle,
    cfg.hairColor,
    cfg.seed,
  ])

  return (
    <img
      src={uri}
      width={size}
      height={size}
      className={className}
      alt={alt ?? `${cfg.type === 'ai' ? 'AI' : 'Human'} Lenser avatar`}
    />
  )
}
