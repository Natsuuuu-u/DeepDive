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
    <div className="mb-3 flex items-center gap-2 sm:mb-4 sm:gap-3">
      <Link
        to={backTo}
        className="pixel-text inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 border-2 border-[#0b2a3d] bg-ink/70 text-[10px] text-slate-200 shadow-pixel-sm hover:text-sonar sm:w-auto sm:border-0 sm:bg-transparent sm:px-1 sm:shadow-none"
        aria-label={backTo === '/archive' ? 'Back to archive' : 'Back to home'}
      >
        <ArrowLeft size={18} className="sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Surface</span>
      </Link>
      <div className="min-w-0 flex-1 text-center">
        <div className="pixel-text truncate text-[10px] text-sonar sm:text-xs">{title}</div>
        <DepthIndicator score={score} depthMV={motion?.depth} variant="compact" className="mt-1 truncate" />
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div
          className="pixel-text flex items-center gap-1.5 text-[11px] text-gold sm:text-xs"
          aria-label={`Score ${score}`}
        >
          <Trophy size={16} aria-hidden />
          {motion ? <MotionText value={motion.depth} format={(d) => String(Math.round(d / 10))} /> : score}
        </div>
        {menu}
      </div>
    </div>
  )
}
