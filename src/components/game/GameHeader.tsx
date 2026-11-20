import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import DepthIndicator from '@/components/ocean/DepthIndicator'
import MotionText from '@/components/ocean/MotionText'
import type { OceanMotion } from '@/hooks/useOceanMotion'

interface Props {
  title: string
  score: number
  backTo?: string
  /** Live depth; when supplied the score and depth tick up during a dive. */
  motion?: OceanMotion
  /** In-game menu control, shown next to the score. */
  menu?: ReactNode
}

export default function GameHeader({ title, score, backTo = '/', motion, menu }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <Link
        to={backTo}
        className="pixel-text inline-flex items-center gap-2 text-[10px] text-slate-200 hover:text-sonar"
        aria-label="Back to home"
      >
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Surface</span>
      </Link>
      <div className="text-center">
        <div className="pixel-text text-xs text-sonar">{title}</div>
        <DepthIndicator score={score} depthMV={motion?.depth} variant="compact" className="mt-1" />
      </div>
      <div className="flex items-center gap-2">
        <div className="pixel-text flex items-center gap-2 text-xs text-gold" aria-label={`Score ${score}`}>
          <Trophy size={16} />
          {motion ? <MotionText value={motion.depth} format={(d) => String(Math.round(d / 10))} /> : score}
        </div>
        {menu}
      </div>
    </div>
  )
}
