import { motion } from 'framer-motion'
import { useSettings } from '@/context/SettingsContext'

/**
 * Pixel sprite defined as text rows. Each character maps to a colour.
 * Swap the SPRITE grid later (or add frames) without touching callers.
 */
const PALETTE: Record<string, string> = {
  H: '#facc15', // helmet
  h: '#ca8a04', // helmet shade
  G: '#67e8f9', // glass
  g: '#0e7490', // glass shade
  S: '#0ea5e9', // suit
  s: '#0369a1', // suit shade
  T: '#94a3b8', // air tank
  F: '#fb7185', // fins
}

const SPRITE = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '.HHGGGGGGHH.',
  '.HHGgGGgGHH.',
  '.HHGGGGGGHh.',
  '..HHHHHHHh..',
  '...hhhhhh...',
  '.TTSSSSSSS..',
  '.TTSSSSSSSS.',
  '.TTSSssSSSS.',
  '..TSSSSSSS..',
  '...SSSSSS...',
  '...SS..SS...',
  '..FFF..FFF..',
]

interface Props {
  /** Rendered pixel size per sprite cell. */
  pixel?: number
  /** Gentle bobbing animation. */
  bob?: boolean
  className?: string
}

export default function DivingCharacter({ pixel = 6, bob = true, className = '' }: Props) {
  const { settings } = useSettings()
  const rows = SPRITE.length
  const cols = SPRITE[0].length
  const animate = bob && !settings.reduceMotion

  return (
    <motion.svg
      role="img"
      aria-label="Diver"
      width={cols * pixel}
      height={rows * pixel}
      viewBox={`0 0 ${cols} ${rows}`}
      shapeRendering="crispEdges"
      className={className}
      animate={animate ? { y: [0, -6, 0] } : undefined}
      transition={animate ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {SPRITE.flatMap((row, y) =>
        row.split('').map((ch, x) =>
          ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[ch]} />,
        ),
      )}
    </motion.svg>
  )
}
