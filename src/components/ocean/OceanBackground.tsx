import { useEffect } from 'react'
import { animate, motion, useTransform } from 'framer-motion'
import OceanLayers from './OceanLayers'
import AmbientLife from './AmbientLife'
import { useOceanMotion, type OceanMotion } from '@/hooks/useOceanMotion'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { usePageVisible } from '@/hooks/usePageVisible'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getDarkness, getOceanGradient, getRayStrength } from '@/lib/ocean'

// Fixed positions so bubbles don't jump around on re-render.
const BUBBLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 4 + ((i * 5) % 3) * 4,
  duration: 8 + ((i * 7) % 9),
  delay: (i * 1.3) % 7,
}))

interface Props {
  /** Current score; used when no shared `motion` is supplied. */
  score?: number
  /** Render as a fixed full-screen layer (app shell) or fill the parent. */
  fixed?: boolean
  /** Shared, frame-rate depth + camera values (driven by the dive animation). */
  motion?: OceanMotion
  /** Set false to skip the parallax scenery (keeps water, rays, fish and bubbles). */
  scene?: boolean
}

/**
 * Underwater backdrop. Colour, darkness, sunbeams and scenery are all pure
 * functions of a continuous depth in metres, so crossing a zone boundary is a
 * gradual blend, never a swap.
 */
export default function OceanBackground({ score = 0, fixed = true, motion: shared, scene = true }: Props) {
  const reduceMotion = useReducedMotionPreference()
  const pageVisible = usePageVisible()
  const compact = useMediaQuery('(max-width: 639px)')
  const own = useOceanMotion(score * 10)
  const m = shared ?? own

  // Without a shared controller, ease toward the depth for the current score.
  useEffect(() => {
    if (shared) return
    if (reduceMotion) {
      own.depth.set(score * 10)
      return
    }
    const controls = animate(own.depth, score * 10, { duration: 1.2, ease: 'easeInOut' })
    return () => controls.stop()
  }, [score, shared, own.depth, reduceMotion])

  const gradient = useTransform(m.depth, getOceanGradient)
  const darkness = useTransform(m.depth, getDarkness)
  const vignette = useTransform(darkness, (d) => 0.2 + d * 1.1)
  const rays = useTransform(m.depth, (d) => 0.22 * getRayStrength(d))
  const layers = !fixed

  return (
    <div aria-hidden className={`${fixed ? 'fixed' : 'absolute'} inset-0 -z-10 overflow-hidden bg-ink`}>
      {/* Slight bleed so camera shake never reveals an edge. */}
      <motion.div
        className="absolute -inset-3"
        style={{ scale: m.camScale, x: m.camX, y: m.camY }}
      >
        <motion.div className="absolute inset-0" style={{ background: gradient }} />

        <motion.div
          className="absolute inset-x-0 top-0 h-2/3"
          style={{
            opacity: rays,
            background:
              'repeating-linear-gradient(100deg, transparent 0 40px, rgba(255,255,255,0.5) 40px 56px)',
            maskImage: 'linear-gradient(to bottom, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
          }}
        />

        {layers && scene && (
          <OceanLayers depth={m.depth} animate={!reduceMotion && pageVisible} compact={compact} />
        )}

        <AmbientLife depth={m.depth} animate={!reduceMotion && pageVisible} compact={compact} />

        {pageVisible &&
          !reduceMotion &&
          (compact ? BUBBLES.slice(0, 9) : BUBBLES).map((b, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0 block border-2 border-white/40 bg-white/10"
              style={{ left: `${b.left}%`, width: b.size, height: b.size }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: '-110vh', opacity: [0, 0.8, 0.8, 0] }}
              transition={{ duration: b.duration, delay: b.delay, repeat: Infinity, ease: 'linear' }}
            />
          ))}

        {/* Light fades with depth. */}
        <motion.div className="absolute inset-0 bg-black" style={{ opacity: darkness }} />
        <motion.div
          className="absolute inset-0"
          style={{
            opacity: vignette,
            background: 'radial-gradient(ellipse at 50% 45%, transparent 40%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Pixel seabed strip */}
        <div
          className="absolute inset-x-0 bottom-0 h-6 bg-black/40"
          style={{
            clipPath:
              'polygon(0 40%, 6% 40%, 6% 20%, 14% 20%, 14% 50%, 24% 50%, 24% 10%, 32% 10%, 32% 45%, 50% 45%, 50% 25%, 62% 25%, 62% 55%, 78% 55%, 78% 15%, 88% 15%, 88% 40%, 100% 40%, 100% 100%, 0 100%)',
          }}
        />
      </motion.div>
    </div>
  )
}
