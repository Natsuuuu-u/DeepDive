import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Binary,
  BookOpen,
  Calculator,
  Check,
  Cpu,
  Dna,
  Film,
  FlaskConical,
  Gamepad2,
  Globe,
  Globe2,
  HeartPulse,
  Landmark,
  Languages,
  LayoutGrid,
  Leaf,
  Map,
  Music,
  Palette,
  Sparkles,
  Star,
  Telescope,
  Trophy,
  Utensils,
  Waves,
  Zap,
} from 'lucide-react'
import { ALL_CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories'
import { getDifficultyQuestionPoolSize } from '@/lib/questions'
import type { QuestionDifficulty } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  all: LayoutGrid,
  'general-knowledge': Globe2,
  science: FlaskConical,
  'biology-animals': Dna,
  geography: Map,
  history: Landmark,
  'astronomy-space': Telescope,
  technology: Cpu,
  'computer-science': Binary,
  mathematics: Calculator,
  literature: BookOpen,
  'movies-tv': Film,
  anime: Sparkles,
  'video-games': Gamepad2,
  music: Music,
  sports: Trophy,
  food: Utensils,
  nature: Leaf,
  'human-body': HeartPulse,
  mythology: Zap,
  language: Languages,
  'famous-people': Star,
  'world-records': Award,
  'countries-cultures': Globe,
  'ocean-marine': Waves,
  'art-architecture': Palette,
}

interface Props {
  difficulty: QuestionDifficulty
  value: string
  onChange: (categoryId: string) => void
  disabled?: boolean
}

export default function CategoryPicker({ difficulty, value, onChange, disabled = false }: Props) {
  return (
    <div role="radiogroup" aria-label="Dive category" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {[ALL_CATEGORIES, ...CATEGORY_GROUPS].map((category) => {
        const selected = category.id === value
        const count = getDifficultyQuestionPoolSize(difficulty, category.id)
        const playable = category.id === ALL_CATEGORIES.id || count >= 7
        const Icon = ICONS[category.id] ?? LayoutGrid
        return (
          <button
            key={category.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled || !playable}
            title={playable ? category.label : `${category.label}: only ${count} questions on this difficulty`}
            onClick={() => onChange(category.id)}
            className={`pixel-border flex min-h-[92px] touch-manipulation flex-col justify-between gap-2 p-2.5 text-left transition-[background-color,border-color,filter] active:brightness-95 ${
              selected
                ? 'border-sonar bg-sonar/10'
                : playable
                  ? 'border-white/20 bg-ink/60 hover:border-sonar/60'
                  : 'border-white/10 bg-ink/40 opacity-55'
            } ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <Icon
                size={16}
                aria-hidden
                className={selected ? 'text-sonar' : playable ? 'text-slate-300' : 'text-slate-500'}
              />
              {selected && <Check size={14} className="text-sonar" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className={`pixel-text block text-[9px] leading-snug ${selected ? 'text-white' : 'text-slate-200'}`}>
                {category.label}
              </span>
              <span className={`mt-1 block text-[11px] ${playable ? 'text-slate-400' : 'text-coral'}`}>
                {count} {count === 1 ? 'question' : 'questions'}
                {!playable && ' · need 7'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
