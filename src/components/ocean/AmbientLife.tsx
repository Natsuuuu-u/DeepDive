import { type CSSProperties } from 'react'
import { useTransform, motion, type MotionValue } from 'framer-motion'
import PixelSprite from './PixelSprite'
import type { SpriteKey } from './spriteArt'
import { getZoneIdAtDepth, ZONE_GLOW } from '@/lib/ocean'

interface SchoolConfig {
  id: string
  sprite: SpriteKey
  top: number
  count: number
  pixel: number
  duration: number
  delay: number
  direction: 1 | -1
  opacity: number
  gap: number
}

// Fixed configurations so the schools never jump between renders.
const SCHOOLS: SchoolConfig[] = [
  { id: 'reef', sprite: 'fishOrange', top: 22, count: 4, pixel: 3, duration: 44, delay: -9, direction: 1, opacity: 0.6, gap: 22 },
  { id: 'silver', sprite: 'fishSilver', top: 52, count: 5, pixel: 3, duration: 66, delay: -34, direction: -1, opacity: 0.45, gap: 26 },
  { id: 'lantern', sprite: 'lanternFish', top: 74, count: 3, pixel: 2, duration: 88, delay: -56, direction: 1, opacity: 0.55, gap: 18 },
]

const SNOW = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 41 + 13) % 100,
  size: 2 + ((i * 2) % 2) * 2,
  duration: 10 + ((i * 3) % 6),
  delay: -((i * 7) % 12),
  drift: ((i * 5) % 40) - 20,
}))

const GLOWS = [
  { left: 12, top: 62, size: 96 },
  { left: 70, top: 28, size: 72 },
  { left: 34, top: 84, size: 64 },
]

interface Props {
  depth: MotionValue<number>
  /** False while reduced motion is requested or the tab is hidden. */
  animate: boolean
}

/**
 * Loose marine life that swims across the page behind the cards. All motion is
 * CSS-driven so it stays cheap; it is simply not rendered when animations are off.
 */
export default function AmbientLife({ depth, animate }: Props) {
  const glowColor = useTransform(depth, (metres) => ZONE_GLOW[getZoneIdAtDepth(metres)])
  const glowOpacity = useTransform(depth, (metres) =>
    Math.min(0.5, Math.max(0, (metres - 350) / 2600)),
  )

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {GLOWS.map((glow, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full blur-2xl"
          style={{
            left: `${glow.left}%`,
            top: `${glow.top}%`,
            width: glow.size,
            height: glow.size,
            backgroundColor: glowColor,
            opacity: glowOpacity,
          }}
        />
      ))}

      {animate &&
        SCHOOLS.map((school) => (
          <div
            key={school.id}
            className="dd-swim absolute flex"
            data-direction={school.direction}
            style={{
              top: `${school.top}%`,
              opacity: school.opacity,
              animationDuration: `${school.duration}s`,
              animationDelay: `${school.delay}s`,
            }}
          >
            {Array.from({ length: school.count }, (_, index) => (
              <span
                key={index}
                style={{
                  marginLeft: index === 0 ? 0 : school.gap,
                  transform: `translateY(${(index % 3) * 9}px)`,
                }}
              >
                <PixelSprite
                  sprite={school.sprite}
                  pixel={school.pixel}
                  flip={school.direction < 0}
                />
              </span>
            ))}
          </div>
        ))}

      {animate &&
        SNOW.map((flake, index) => (
          <span
            key={index}
            className="dd-snow absolute top-0 block rounded-full bg-white/40"
            style={{
              left: `${flake.left}%`,
              width: flake.size,
              height: flake.size,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              '--dd-drift': `${flake.drift}px`,
            } as CSSProperties}
          />
        ))}
    </div>
  )
}
