import { Timer as TimerIcon } from 'lucide-react'

interface Props {
  secondsLeft: number
  totalSeconds: number
  className?: string
}

export default function Timer({ secondsLeft, totalSeconds, className = '' }: Props) {
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0
  const urgent = secondsLeft < 10
  const bar = urgent ? 'bg-coral' : 'bg-kelp'

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="timer"
      aria-label={`${secondsLeft} seconds left`}
      aria-live="polite"
    >
      <TimerIcon className={urgent ? 'text-coral' : 'text-sonar'} size={18} aria-hidden />
      <div className="pixel-border h-4 flex-1 bg-black/50">
        <div
          className={`h-full ${bar} transition-[width] duration-1000 ease-linear`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={`pixel-text w-10 text-right text-xs ${urgent ? 'text-coral' : 'text-white'}`}>
        {secondsLeft}s
      </span>
    </div>
  )
}
