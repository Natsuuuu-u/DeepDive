import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FastForward, Star } from 'lucide-react'
import DivingCharacter from './DivingCharacter'
import MotionText from './MotionText'
import PixelSprite from './PixelSprite'
import { DiveParticles } from './diveParticles'
import type { SpriteKey } from './spriteArt'
import type { OceanMotion } from '@/hooks/useOceanMotion'
import { DIVE_TIERS, getDiveFrame, type DiveFrame, type DivePhase, type DiveSpec } from '@/lib/dive'
import { ZONE_GLOW, getZoneIdAtDepth } from '@/lib/ocean'
import { getZone } from '@/lib/depth'
import { getTier } from '@/lib/rarity'
import type { DepthZone, RarityTierId } from '@/types'

/** Width reserved on the right for the depth gauge column (matches GameStage). */
const GAUGE_PX = 104

const TIER_HEX: Record<RarityTierId, string> = {
  plankton: '#cbd5e1',
  'too-clever': '#7dd3fc',
  schooler: '#4ade80',
  rare: '#facc15',
  'deep-cut': '#fb923c',
  'one-in-a-krillion': '#fb7185',
}

const ZONE_CREATURE: Record<DepthZone['id'], SpriteKey> = {
  sunlit: 'fishOrange',
  twilight: 'jelly',
  midnight: 'angler',
  abyss: 'viper',
  hadal: 'dumbo',
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

interface Props {
  spec: DiveSpec
  motion: OceanMotion
  answerText: string
  /** What the player typed, when their spelling was corrected. */
  typedText?: string
  onSkip: () => void
}

export default function DiveOverlay({ spec, motion: ocean, answerText, typedText, onSkip }: Props) {
  const tier = getTier(spec.tierId)
  const cfg = DIVE_TIERS[spec.tierId]
  const hex = TIER_HEX[spec.tierId]
  const reduce = spec.reduceMotion
  const special = cfg.level === 6
  const toDepth = spec.toScore * 10

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const diverRef = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const tintRef = useRef<HTMLDivElement>(null)
  const mountedAt = useRef(Date.now())

  const [phase, setPhase] = useState<DivePhase>(() => getDiveFrame(spec, Date.now()).phase)
  const [zoneId, setZoneId] = useState<DepthZone['id']>(() => getZoneIdAtDepth(getDiveFrame(spec, Date.now()).depth))

  /* ----------------------------- animation loop ----------------------------- */
  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const particles = new DiveParticles(canvas)
    let width = 0
    let height = 0
    const measure = () => {
      const rect = root.getBoundingClientRect()
      width = rect.width
      height = rect.height
      particles.resize(width, height)
    }
    measure()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    observer?.observe(root)

    let raf = 0
    let last = performance.now()
    let prevPhase: DivePhase | null = null
    let prevZone: DepthZone['id'] | null = null

    const centreX = () => (width - GAUGE_PX) / 2
    const helmetY = (frameY: number) => frameY + 14

    const onEnter = (next: DivePhase, y: number) => {
      if (reduce) return
      const cx = centreX()
      const cy = helmetY(y)
      if (next === 'confirm' && special) {
        particles.burst(cx, cy + 30, 46, { speed: 1.5 })
        particles.burst(cx, cy + 30, 42, { sparks: true, speed: 1.6 })
      } else if (next === 'prepare') {
        particles.burst(cx, cy, 4 + cfg.level * 3)
      } else if (next === 'descend') {
        particles.burst(cx, cy, 6 + cfg.level * 5, { speed: 1.2 })
      } else if (next === 'arrive') {
        if (special) particles.burst(cx, cy + 40, 56, { sparks: true, speed: 1.8 })
        else if (cfg.level >= 4) particles.burst(cx, cy + 20, 8 + cfg.level * 2)
      }
    }

    const tick = () => {
      const nowPerf = performance.now()
      const dt = Math.min(0.05, (nowPerf - last) / 1000)
      last = nowPerf

      const f: DiveFrame = getDiveFrame(spec, Date.now())
      ocean.depth.set(f.depth)

      const e = f.elapsedMs
      const base = height * 0.26
      const low = height * 0.5
      const settle = height * 0.33
      const bob = reduce ? 0 : Math.sin(e / 260) * 3
      let y = base
      let rot = 0
      let sx = 1
      let sy = 1

      if (!reduce) {
        switch (f.phase) {
          case 'confirm':
            y = base + bob
            break
          case 'prepare': {
            // Crouch, wobble, wind up.
            const s = Math.sin(f.phaseT * Math.PI)
            y = base + bob + 8 * f.phaseT
            sy = 1 - 0.12 * s
            sx = 1 + 0.08 * s
            rot = Math.sin(f.phaseT * Math.PI * (2 + cfg.level / 2)) * (2 + cfg.level)
            break
          }
          case 'descend':
            y = base + 8 + (low - base - 8) * f.descent
            rot = Math.sin(e / 140) * 3 * f.speed
            sy = 1 + 0.2 * f.speed
            sx = 1 - 0.08 * f.speed
            break
          case 'arrive': {
            const p = easeOutCubic(f.phaseT)
            y = low + (settle - low) * p + bob
            sy = 1 + 0.06 * Math.sin(f.phaseT * Math.PI * 2) * (1 - f.phaseT)
            break
          }
        }
      }
      if (diverRef.current) {
        diverRef.current.style.transform = `translate(-50%, ${y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`
      }

      // Camera: pull in during preparation, shake and zoom with descent speed, settle on arrival.
      if (!reduce) {
        const n1 = (Math.sin(e * 0.071) + Math.sin(e * 0.113 + 1.7)) / 2
        const n2 = (Math.cos(e * 0.067) + Math.sin(e * 0.127 + 0.4)) / 2
        let amp = 0
        let zoomCurve = 0
        if (f.phase === 'prepare') {
          amp = cfg.shake * 0.25 * f.phaseT
          zoomCurve = 0.25 * f.phaseT
        } else if (f.phase === 'descend') {
          amp = cfg.shake * f.speed
          zoomCurve = 0.25 + 0.75 * f.speed
        } else if (f.phase === 'arrive') {
          amp = cfg.shake * 0.2 * (1 - f.phaseT)
          zoomCurve = 0.25 * (1 - f.phaseT)
        }
        const punch = special && f.phase === 'confirm' ? 0.08 * Math.sin(f.phaseT * Math.PI) : 0
        ocean.camScale.set(1 + cfg.zoom * zoomCurve + punch)
        ocean.camX.set(n1 * amp)
        ocean.camY.set(n2 * amp)

        // Pressure vignette and bioluminescent tint.
        let vig = 0
        let tint = 0
        if (f.phase === 'prepare') {
          vig = cfg.vignette * 0.35 * f.phaseT
          tint = 0.2 * f.phaseT
        } else if (f.phase === 'descend') {
          vig = cfg.vignette * (0.35 + 0.65 * f.speed)
          tint = 0.25 + 0.5 * f.speed
        } else if (f.phase === 'arrive') {
          vig = cfg.vignette * 0.35 * (1 - f.phaseT)
          tint = 0.1 + 0.25 * (1 - f.phaseT)
        }
        if (vignetteRef.current) vignetteRef.current.style.opacity = String(vig)
        if (tintRef.current) tintRef.current.style.opacity = cfg.level >= 5 ? String(tint) : '0'
      }

      const zone = getZoneIdAtDepth(f.depth)
      if (zone !== prevZone) {
        prevZone = zone
        setZoneId(zone)
        if (tintRef.current) {
          const glow = ZONE_GLOW[zone]
          tintRef.current.style.background = `radial-gradient(circle at 50% 62%, ${glow}55 0%, transparent 65%)`
        }
      }

      if (f.phase !== prevPhase) {
        prevPhase = f.phase
        setPhase(f.phase)
        onEnter(f.phase, y)
      }

      if (!reduce) {
        particles.step(dt, f, cfg, {
          emitterX: centreX(),
          emitterY: helmetY(y),
          glowColor: ZONE_GLOW[zone === 'sunlit' ? 'twilight' : zone],
        })
        particles.render()
      }

      if (f.elapsedMs < spec.durationMs) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
      particles.clear()
      ocean.camScale.set(1)
      ocean.camX.set(0)
      ocean.camY.set(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, ocean])

  /* ---------------------------------- skip ---------------------------------- */
  const skip = () => {
    // Ignore taps within the first moments so a double-tap on "Dive" can't skip.
    if (Date.now() - mountedAt.current < 600) return
    onSkip()
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSkip])

  const hudVisible = phase !== 'confirm'
  const arrived = phase === 'arrive'
  const creature: SpriteKey = special ? 'krill' : ZONE_CREATURE[zoneId]

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      data-testid="dive-overlay"
      data-phase={phase}
      data-tier={spec.tierId}
    >
      <div aria-hidden className="absolute inset-0">
        <div
          ref={vignetteRef}
          className="absolute inset-0 opacity-0"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(2,6,23,0.92) 100%)' }}
        />
        <div ref={tintRef} className="absolute inset-0 opacity-0 mix-blend-screen" />

        {special && !reduce && (
          <motion.div
            className="absolute left-0 top-[34%] h-[170%] w-[calc(100%-6.5rem)]"
            style={{
              translateY: '-50%',
              background:
                'repeating-conic-gradient(from 0deg at 50% 50%, rgba(253,224,71,0.38) 0deg 7deg, transparent 7deg 22deg)',
              maskImage: 'radial-gradient(circle at 50% 50%, black 5%, transparent 55%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 5%, transparent 55%)',
            }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{
              opacity: phase === 'confirm' || phase === 'prepare' ? 0.9 : phase === 'arrive' ? 0.45 : 0.15,
              rotate: 360,
            }}
            transition={{ opacity: { duration: 0.5 }, rotate: { duration: 14, repeat: Infinity, ease: 'linear' } }}
          />
        )}

        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* Flash on rare+ answers. */}
        {!reduce && cfg.level >= 4 && (
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 35%, ${hex}, transparent 72%)` }}
            initial={{ opacity: special ? 0.85 : cfg.level === 5 ? 0.4 : 0.22 }}
            animate={{ opacity: 0 }}
            transition={{ duration: special ? 1 : 0.7, ease: 'easeOut' }}
          />
        )}

        {/* Shockwave rings for the top tier. */}
        {special && !reduce && (
          <>
            <Ring color={hex} />
            {phase === 'arrive' && <Ring color="#ffffff" />}
          </>
        )}

        {/* Cinematic letterbox bars for the top tier. */}
        {special && !reduce && (
          <>
            <motion.div
              className="absolute inset-x-0 top-0 bg-black"
              initial={{ height: 0 }}
              animate={{ height: phase === 'arrive' ? '0%' : '8%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 bg-black"
              initial={{ height: 0 }}
              animate={{ height: phase === 'arrive' ? '0%' : '8%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </>
        )}
      </div>

      {/* Content column (leaves room for the depth gauge). */}
      <div aria-hidden className="absolute inset-y-0 left-0 right-[6.5rem]">
        {/* Diver */}
        <div ref={diverRef} className="absolute left-1/2 top-0" style={{ willChange: 'transform' }}>
          <div className="origin-top scale-[0.8] sm:scale-100">
            {special && !reduce && (
              <motion.div
                className="absolute -inset-8 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(253,224,71,0.55), transparent 70%)' }}
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <DivingCharacter pixel={6} bob={false} className="relative" />
          </div>
        </div>

        {/* PHASE 1: answer confirmation. */}
        <AnimatePresence>
          {phase === 'confirm' && (
            <motion.div
              key="confirm"
              className="absolute inset-x-0 top-[50%] flex flex-col items-center px-2 text-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -30, scale: 0.8 }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 16 }}
            >
              {special && (
                <p className="pixel-text mb-1 flex items-center gap-2 text-[8px] text-gold sm:text-[10px]">
                  <Star size={12} className="fill-gold" /> Rarity alert <Star size={12} className="fill-gold" />
                </p>
              )}
              <p className="pixel-text flex items-center gap-2 text-[10px] text-kelp sm:text-xs">
                <Check size={16} strokeWidth={4} /> Correct!
              </p>
              <p className="mt-1 max-w-full break-words text-base font-bold text-white drop-shadow sm:text-lg">
                {answerText}
              </p>
              {typedText && (
                <p className="text-[10px] text-sky-300">spelling corrected from “{typedText}”</p>
              )}
              <p
                className={`pixel-text mt-2 text-base sm:text-2xl ${special ? 'bg-gradient-to-r from-gold via-coral to-sonar bg-clip-text text-transparent' : ''}`}
                style={special ? undefined : { color: hex, textShadow: `0 0 14px ${hex}99, 2px 2px 0 rgba(0,0,0,.6)` }}
              >
                {special ? '★ One in a Krillion ★' : tier.label}
              </p>
              <motion.p
                className="pixel-text mt-1 text-lg text-gold sm:text-2xl"
                initial={reduce ? false : { y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: reduce ? 0 : 0.2 }}
              >
                +{spec.points}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PHASES 2-4: depth HUD. */}
        <motion.div
          className={`absolute inset-x-0 flex flex-col items-center text-center ${special && !reduce ? 'top-[10%]' : 'top-[3%]'}`}
          initial={false}
          animate={{ opacity: hudVisible ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <p className="pixel-text text-[8px] text-slate-200 sm:text-[9px]">
            {arrived ? 'Depth reached' : 'Descending'}
          </p>
          <motion.p
            data-testid="dive-depth"
            key={arrived ? 'arrived' : 'moving'}
            className={`pixel-text text-xl sm:text-3xl ${arrived ? 'text-gold' : 'text-sonar'}`}
            initial={arrived && !reduce ? { scale: 1.35 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            <MotionText value={ocean.depth} format={(d) => `${Math.round(d).toLocaleString()}m`} />
          </motion.p>
          <p className="pixel-text mt-1 text-[8px] text-slate-200 sm:text-[10px]"><MotionText value={ocean.depth} format={(d) => getZone(d / 10).name} />
          </p>
        </motion.div>

        {/* PHASE 4: arrival details. */}
        <AnimatePresence>
          {arrived && (
            <motion.div
              key="arrive"
              className="absolute inset-x-0 top-[64%] flex flex-col items-center px-2 text-center"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.15 : 0.35 }}
            >
              <p className="pixel-text text-[10px] sm:text-xs" style={{ color: hex }}>
                {tier.label} · +{spec.points}
              </p>
              <p className="mt-1 text-[11px] text-slate-200">
                {spec.fromScore * 10 !== toDepth
                  ? `+${(toDepth - spec.fromScore * 10).toLocaleString()}m deeper`
                  : 'Holding depth'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone creature showcased on arrival (a golden krill for the top tier). */}
        {arrived && !reduce && (
          <motion.div
            key={`creature-${creature}`}
            className="absolute top-[78%]"
            style={{ filter: special ? 'drop-shadow(0 0 10px #fde047)' : undefined }}
            initial={{ left: '104%' }}
            animate={{ left: '-40%' }}
            transition={{ duration: (cfg.arriveMs * 1.25) / 1000, ease: 'linear' }}
          >
            <PixelSprite sprite={creature} pixel={special ? 7 : 5} />
          </motion.div>
        )}
      </div>

      <button
        type="button"
        onClick={skip}
        className="pixel-text pointer-events-auto absolute bottom-2 right-[7rem] bg-black/60 px-2 py-1 text-[8px] text-slate-200 hover:text-sonar focus-visible:text-sonar"
        aria-label="Skip dive animation"
      >
        <span className="inline-flex items-center gap-1">
          Skip <FastForward size={10} aria-hidden />
        </span>
      </button>
    </div>
  )
}

function Ring({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute left-[calc((100%-6.5rem)/2)] top-[34%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4"
      style={{ borderColor: color }}
      initial={{ scale: 0.2, opacity: 0.9 }}
      animate={{ scale: 6, opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
    />
  )
}
