import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import DivingCharacter from '@/components/ocean/DivingCharacter'
import PixelButton from '@/components/ui/PixelButton'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { getDifficulty } from '@/lib/difficulty'
import { getIntroDurationMs } from '@/lib/intro'
import type { GameMode, QuestionDifficulty } from '@/types'

const MODE_COPY: Record<GameMode, { kicker: string; subtitle: string }> = {
  daily: { kicker: 'Daily Dive', subtitle: 'Today’s challenge · one scored attempt' },
  unlimited: { kicker: 'Unlimited Dive', subtitle: 'Seven questions · as many dives as you like' },
  practice: { kicker: 'Practice Dive', subtitle: 'Archived challenge · no streak impact' },
}

// Fixed positions so bubbles don't jump around between renders.
const BUBBLES = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 29 + 7) % 100,
  size: 3 + ((i * 3) % 4) * 3,
  duration: 2.8 + ((i * 5) % 5) * 0.55,
  delay: ((i * 7) % 9) * 0.24,
}))

interface Props {
  mode: GameMode
  difficulty: QuestionDifficulty
  categoryLabel: string
  onSkip: () => void
}

/** Short cinematic descent shown before the first question of a dive. */
export default function DiveIntro({ mode, difficulty, categoryLabel, onSkip }: Props) {
  const reduceMotion = useReducedMotionPreference()
  const info = getDifficulty(difficulty)
  const copy = MODE_COPY[mode]
  const durationMs = getIntroDurationMs(reduceMotion)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.kicker}, ${info.label} difficulty, ${categoryLabel}. Diving in.`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-ink px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.3 }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% -15%, #0ea5e9 0%, #0c4a6e 30%, #071a2b 62%, #030d16 100%)',
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-2/3"
        initial={{ opacity: reduceMotion ? 0.22 : 0.1 }}
        animate={{ opacity: 0.32 }}
        transition={{ duration: reduceMotion ? 0 : 2.2 }}
        style={{
          background:
            'repeating-linear-gradient(104deg, transparent 0 46px, rgba(255,255,255,0.45) 46px 62px)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      {!reduceMotion &&
        BUBBLES.map((bubble, index) => (
          <motion.span
            aria-hidden
            key={index}
            className="absolute bottom-0 block border-2 border-white/40 bg-white/10"
            style={{ left: `${bubble.left}%`, width: bubble.size, height: bubble.size }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: '-105vh', opacity: [0, 0.85, 0.85, 0] }}
            transition={{
              duration: bubble.duration,
              delay: bubble.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}

      {/* The whole scene drifts down, as if the camera is following the diver. */}
      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
        initial={reduceMotion ? false : { y: -18, scale: 1 }}
        animate={reduceMotion ? undefined : { y: 14, scale: 1.03 }}
        transition={{ duration: durationMs / 1000, ease: 'easeInOut' }}
      >
        <motion.div
          className="mb-6"
          initial={reduceMotion ? false : { y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 1.2, ease: 'easeOut' }}
        >
          <DivingCharacter pixel={7} />
        </motion.div>

        <motion.p
          className="pixel-text text-[10px] text-sonar"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.35, duration: 0.4 }}
        >
          {copy.kicker}
        </motion.p>

        <motion.h1
          className={`pixel-text mt-4 text-xl sm:text-2xl ${info.color}`}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.55, type: 'spring', stiffness: 160, damping: 14 }}
        >
          {info.label} dive
        </motion.h1>

        <motion.p
          className="pixel-text mt-3 text-[8px] text-slate-300"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.4 }}
        >
          {categoryLabel} · {copy.subtitle}
        </motion.p>

        <motion.div
          className="mt-8 flex flex-col items-center gap-2 text-slate-300"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 1.4, duration: 0.4 }}
        >
          <span className="pixel-text text-[8px] text-gold">Preparing the descent</span>
          {!reduceMotion && (
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown size={16} aria-hidden />
            </motion.span>
          )}
        </motion.div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 pb-6">
        <div className="h-1 w-40 overflow-hidden bg-white/10" aria-hidden>
          <motion.div
            className="h-full bg-sonar"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: durationMs / 1000, ease: 'linear' }}
          />
        </div>
        <PixelButton variant="secondary" onClick={onSkip}>
          Skip intro
        </PixelButton>
      </div>
    </motion.div>
  )
}
