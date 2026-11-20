import { getTier } from '@/lib/rarity'
import type { AcceptedAnswer, Question, QuestionDifficulty, RarityTierId } from '@/types'

export type AnswerRow = [text: string, tier: RarityTierId, aliases?: string[]]
export type QuestionRow = [
  prompt: string,
  difficulty: QuestionDifficulty,
  fact: string,
  answers: AnswerRow[],
]

/**
 * Extra accepted answers and extra aliases for an existing question.
 * `answers` are appended to the question's original list; `aliases` adds
 * recognised spellings/names to an answer that already exists (keyed by its text).
 */
export interface AnswerExpansion {
  answers?: AnswerRow[]
  aliases?: Record<string, string[]>
}

/** Keyed by full question id, e.g. `geo_001`. Unknown ids throw at import time. */
export type QuestionExpansions = Record<string, AnswerExpansion>

export function buildQuestionGroup(
  prefix: string,
  category: string,
  rows: QuestionRow[],
  expansions: QuestionExpansions = {},
): Question[] {
  const questions = rows.map(([prompt, difficulty, fact, answerRows], index) => {
    const id = `${prefix}_${String(index + 1).padStart(3, '0')}`
    const expansion = expansions[id]
    const answerAliases = expansion?.aliases ?? {}
    const missing = Object.keys(answerAliases).filter(
      (text) => !answerRows.some(([rowText]) => rowText === text),
    )
    if (missing.length > 0) {
      throw new Error(`${id}: alias expansion refers to unknown answers: ${missing.join(', ')}`)
    }
    const base = answerRows.map(([text, tier, aliases]): AcceptedAnswer => ({
      text,
      aliases: [...(aliases ?? []), ...(answerAliases[text] ?? [])],
      tier,
      points: getTier(tier).points,
    }))
    const extra = (expansion?.answers ?? []).map(([text, tier, aliases]): AcceptedAnswer => ({
      text,
      aliases,
      tier,
      points: getTier(tier).points,
    }))
    return {
      id,
      category,
      prompt,
      difficulty,
      fact,
      answers: [...base, ...extra],
    }
  })

  const ids = new Set(questions.map((question) => question.id))
  const unknown = Object.keys(expansions).filter(
    (id) => id.startsWith(`${prefix}_`) && !ids.has(id),
  )
  if (unknown.length > 0) {
    throw new Error(`Unknown expansion ids for ${prefix}: ${unknown.join(', ')}`)
  }
  return questions
}
