import type { QuestionDifficulty } from '@/types'

export interface DifficultyDefinition {
  id: QuestionDifficulty
  /** Shown in the UI ("Normal", not "medium"). */
  label: string
  tagline: string
  description: string
  /** Tailwind text colour for the label/chip. */
  color: string
  /** Tailwind border/background classes for the selected card. */
  selected: string
}

export const DIFFICULTIES: DifficultyDefinition[] = [
  {
    id: 'easy',
    label: 'Easy',
    tagline: 'Calm shallows',
    description: 'Familiar facts and everyday general knowledge. A gentle first descent.',
    color: 'text-kelp',
    selected: 'border-kelp bg-kelp/10',
  },
  {
    id: 'medium',
    label: 'Normal',
    tagline: 'Open water',
    description: 'A balanced expedition: recognisable questions mixed with tougher ones.',
    color: 'text-sonar',
    selected: 'border-sonar bg-sonar/10',
  },
  {
    id: 'hard',
    label: 'Hard',
    tagline: 'The deep',
    description: 'Obscure facts, niche knowledge and deeper cuts for experienced divers.',
    color: 'text-coral',
    selected: 'border-coral bg-coral/10',
  },
]

export const DEFAULT_DIFFICULTY: QuestionDifficulty = 'medium'

export function isQuestionDifficulty(value: unknown): value is QuestionDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

export function getDifficulty(id: QuestionDifficulty | undefined): DifficultyDefinition {
  return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[1]
}

export function getDifficultyLabel(id: QuestionDifficulty | undefined): string {
  return getDifficulty(id).label
}
