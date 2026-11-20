import { useState } from 'react'
import { Anchor, ChevronRight } from 'lucide-react'
import CategoryPicker from './CategoryPicker'
import DifficultyPicker from './DifficultyPicker'
import PixelButton from '@/components/ui/PixelButton'
import PixelPanel from '@/components/ui/PixelPanel'
import { ALL_CATEGORIES_ID, getCategoryLabel } from '@/lib/categories'
import { getDifficulty } from '@/lib/difficulty'
import { isCategoryPlayable, getDifficultyQuestionPoolSize } from '@/lib/questions'
import {
  loadCategoryPreference,
  loadDifficultyPreference,
  saveCategoryPreference,
  saveDifficultyPreference,
} from '@/lib/storage'
import type { GameMode, QuestionDifficulty } from '@/types'

interface Props {
  mode: GameMode
  title: string
  blurb: string
  note: string
  onStart: (difficulty: QuestionDifficulty, category: string) => void
}

export default function DifficultyLobby({ mode, title, blurb, note, onStart }: Props) {
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(loadDifficultyPreference)
  const [category, setCategory] = useState<string>(loadCategoryPreference)
  const selected = getDifficulty(difficulty)
  const categoryPlayable = isCategoryPlayable(difficulty, category)
  // If the chosen category has no full set at this difficulty, fall back safely.
  const effectiveCategory = categoryPlayable ? category : ALL_CATEGORIES_ID
  const categoryCount = getDifficultyQuestionPoolSize(difficulty, category)

  const start = () => {
    saveDifficultyPreference(difficulty)
    saveCategoryPreference(effectiveCategory)
    onStart(difficulty, effectiveCategory)
  }

  return (
    <div className="space-y-4">
      <header className="mx-auto max-w-xl rounded border border-white/10 bg-ink/55 px-3 py-3 text-center backdrop-blur-sm sm:px-4">
        <h1 className="pixel-text text-base leading-relaxed text-white sm:text-xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-200">{blurb}</p>
        <p className="mt-1 text-xs text-slate-300">{note}</p>
      </header>

      <PixelPanel className="space-y-4 p-3 sm:p-4">
        <div>
          <h2 className="pixel-text text-[10px] text-gold">1 · Choose your descent</h2>
          <p className="mt-2 text-xs text-slate-300">
            Difficulty changes which questions you get. Answer rarity still decides your points.
          </p>
        </div>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />
        <p className={`text-xs ${selected.color}`}>
          {selected.label}: {selected.tagline.toLowerCase()} — {selected.description}
        </p>
      </PixelPanel>

      <PixelPanel className="space-y-4 p-3 sm:p-4">
        <div>
          <h2 className="pixel-text text-[10px] text-gold">2 · Choose your waters</h2>
          <p className="mt-2 text-xs text-slate-300">
            Every question stays inside the category you pick. Categories with fewer than seven
            questions on this difficulty cannot be dived.
          </p>
        </div>
        <CategoryPicker difficulty={difficulty} value={effectiveCategory} onChange={setCategory} />
        {!categoryPlayable && (
          <p className="text-xs text-coral">
            {getCategoryLabel(category)} only has {categoryCount} {categoryCount === 1 ? 'question' : 'questions'}{' '}
            on {selected.label} — All Categories will be used instead.
          </p>
        )}
        <p className="text-xs text-slate-400">
          Selected: <span className="text-slate-200">{getCategoryLabel(effectiveCategory)}</span> ·{' '}
          {getDifficultyQuestionPoolSize(difficulty, effectiveCategory)} questions available.
        </p>
        <PixelButton
          onClick={start}
          icon={<Anchor size={14} />}
          className="min-h-[48px] w-full sm:w-auto"
        >
          {mode === 'daily' ? 'Begin today’s dive' : 'Begin the dive'}
          <ChevronRight size={14} />
        </PixelButton>
      </PixelPanel>

      <p className="text-center text-xs text-slate-400">
        You can change difficulty and category before any new dive. An active dive keeps its selections.
      </p>
    </div>
  )
}
