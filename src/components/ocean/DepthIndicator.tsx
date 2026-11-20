import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion'
import MotionText from './MotionText'
import { DEPTH_ZONES, MAX_SCORE, getZone } from '@/lib/depth'

interface Props {
  score: number
  /** 'vertical' sits at the side of the play area; 'compact' is a single-line readout. */
  variant?: 'vertical' | 'compact'
  className?: string
  /** Live depth in metres. When supplied the readout follows it frame by frame (during a dive). */
  depthMV?: MotionValue<number>
}

const formatMeters = (depth: number) => `${Math.round(depth).toLocaleString()}m`
const formatZone = (depth: number) => getZone(depth / 10).name

export default function DepthIndicator({ score, variant = 'vertical', className = '', depthMV }: Props) {
  // Fallback: follow the score with a spring when no live depth is supplied.
  const local = useMotionValue(score * 10)
  useEffect(() => {
    if (depthMV) return
    const controls = animate(local, score * 10, { type: 'spring', stiffness: 80, damping: 18 })
    return () => controls.stop()
  }, [score, depthMV, local])
  const depth = depthMV ?? local

  const progress = useTransform(depth, (d) => Math.min(1, Math.max(0, d / 10 / MAX_SCORE)))
  const fill = useTransform(progress, (p) => `${p * 100}%`)
  const marker = useTransform(progress, (p) => `calc(${p * 100}% - 6px)`)

  if (variant === 'compact') {
    return (
      <div data-testid="depth-compact" className={`pixel-text text-[10px] text-sonar ${className}`}>
        <MotionText value={depth} format={formatMeters} />{' '}
        <span className="text-slate-300">
          · <MotionText value={depth} format={formatZone} />
        </span>
      </div>
    )
  }

  return (
    <div className={`flex h-full w-16 flex-col items-center gap-2 ${className}`}>
      <div className="pixel-text text-[9px] text-sonar">
        <MotionText value={depth} format={formatMeters} />
      </div>
      <div className="pixel-border relative w-4 flex-1 bg-black/50">
        {/* zone ticks */}
        {DEPTH_ZONES.slice(1).map((z) => (
          <div
            key={z.id}
            className="absolute inset-x-0 h-0.5 bg-white/40"
            style={{ top: `${(z.minScore / MAX_SCORE) * 100}%` }}
            title={z.name}
          />
        ))}
        <motion.div className="absolute inset-x-0 top-0 bg-sonar/60" style={{ height: fill }} />
        <motion.div
          className="absolute left-1/2 h-3 w-6 -translate-x-1/2 bg-gold shadow-pixel-sm"
          style={{ top: marker }}
        />
      </div>
      <div className="pixel-text w-full text-center text-[8px] leading-tight text-slate-200">
        <MotionText value={depth} format={formatZone} />
      </div>
    </div>
  )
}
