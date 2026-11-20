import { Check } from 'lucide-react'
import { DIFFICULTIES } from '@/lib/difficulty'
import type { QuestionDifficulty } from '@/types'

interface Props {
  value: QuestionDifficulty
  onChange: (difficulty: QuestionDifficulty) => void
  disabled?: boolean
}

export default function DifficultyPicker({ value, onChange, disabled = false }: Props) {
  return (
    <div role="radiogroup" aria-label="Dive difficulty" className="grid gap-2 sm:grid-cols-3">
      {DIFFICULTIES.map((difficulty) => {
        const selected = difficulty.id === value
        return (
          <button
            key={difficulty.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(difficulty.id)}
            className={`pixel-border flex min-h-[104px] flex-col gap-1 p-3 text-left transition-colors ${
              selected ? difficulty.selected : 'border-white/20 bg-ink/60 hover:border-sonar/60'
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className={`pixel-text text-[10px] ${difficulty.color}`}>{difficulty.label}</span>
              {selected && <Check size={16} className={difficulty.color} aria-hidden />}
            </span>
            <span className="pixel-text text-[7px] text-slate-400">{difficulty.tagline}</span>
            <span className="mt-1 text-xs leading-snug text-slate-300">{difficulty.description}</span>
          </button>
        )
      })}
    </div>
  )
}
