import { useEffect, type ReactNode } from 'react'
import { animate, motion, useTransform } from 'framer-motion'
import OceanBackground from './OceanBackground'
import DivingCharacter from './DivingCharacter'
import DepthIndicator from './DepthIndicator'
import DiveOverlay from './DiveOverlay'
import { useOceanMotion, type OceanMotion } from '@/hooks/useOceanMotion'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { MAX_SCORE } from '@/lib/depth'
import type { DiveSpec } from '@/lib/dive'

interface Props {
  score: number
  children?: ReactNode
  finalDescent?: boolean
  /** Shared depth/camera values. Supply these to keep the header gauge in sync with a dive. */
  motion?: OceanMotion
  /** Active dive animation (a correct answer being rewarded), if any. */
  dive?: DiveSpec | null
  diveAnswerText?: string
  diveTypedText?: string
  onSkipDive?: () => void
  /** Changes when a miss is shown; renders a soft coral ripple behind the cards. */
  missKey?: number
  /** Set false for summary screens where scenery would overlap the text. */
  scene?: boolean
}

/** Framed play area: the ocean follows the live depth, the diver sinks as it grows. */
export default function GameStage({
  score,
  children,
  finalDescent = false,
  motion: shared,
  dive = null,
  diveAnswerText = '',
  diveTypedText,
  onSkipDive,
  missKey,
  scene = true,
}: Props) {
  const reduceMotion = useReducedMotionPreference()
  const own = useOceanMotion(finalDescent ? 0 : score * 10)
  const m = shared ?? own

  // Without a shared controller (e.g. the results screen), animate to the score's depth.
  useEffect(() => {
    if (shared) return
    if (reduceMotion || !finalDescent) {
      own.depth.set(score * 10)
      return
    }
    const controls = animate(own.depth, score * 10, { duration: 2.4, delay: 0.2, ease: 'easeInOut' })
    return () => controls.stop()
  }, [score, shared, finalDescent, reduceMotion, own.depth])

  const diverTop = useTransform(m.depth, (d) => `${Math.min(1, Math.max(0, d / 10 / MAX_SCORE)) * 55}%`)

  return (
    <div className="pixel-border relative flex min-h-[360px] flex-col gap-3 overflow-hidden p-3 sm:min-h-[420px] sm:p-4 md:min-h-[460px] md:flex-row [@media(max-height:520px)]:min-h-[300px]">
      <OceanBackground score={score} fixed={false} motion={m} scene={scene} />

      {missKey !== undefined && !reduceMotion && (
        <motion.div
          key={missKey}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-12 z-[1] flex justify-center"
        >
          <motion.span
            className="block h-24 w-24 rounded-full border-4 border-coral/70"
            initial={{ scale: 0.35, opacity: 0.85 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 1.05, ease: 'easeOut' }}
          />
        </motion.div>
      )}

      <div
        className={`relative z-10 min-w-0 flex-1 space-y-3 sm:space-y-4 ${
          dive ? 'pointer-events-none invisible opacity-0 transition-[opacity,visibility] duration-200' : ''
        }`}
      >
        {children}
      </div>

      <div className="relative z-10 hidden w-20 flex-col items-center md:flex">
        <motion.div
          className="absolute"
          style={{ top: diverTop }}
          animate={{ opacity: dive ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <DivingCharacter pixel={4} />
        </motion.div>
        <DepthIndicator score={score} depthMV={m.depth} className="mt-auto h-full w-full pt-0" />
      </div>

      {dive && (
        <DiveOverlay
          key={dive.key}
          spec={dive}
          motion={m}
          answerText={diveAnswerText}
          typedText={diveTypedText}
          onSkip={onSkipDive ?? (() => undefined)}
        />
      )}
    </div>
  )
}
