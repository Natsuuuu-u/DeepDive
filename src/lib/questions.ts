import { QUESTION_DATABASE } from '@/data/questionDatabase'
import { GAME_QUESTION_COUNT } from '@/lib/gameConstants'
import { normalize } from '@/lib/answers'
import { getLocalDateKey } from '@/lib/daily'
import { RARITY_TIERS } from '@/lib/rarity'
import { DEFAULT_DIFFICULTY } from '@/lib/difficulty'
import { ALL_CATEGORIES_ID, getCategoryBankNames, getCategoryLabel } from '@/lib/categories'
import type { AcceptedAnswer, Question, QuestionDifficulty } from '@/types'

export const ALL_QUESTIONS: Question[] = QUESTION_DATABASE
export const CATEGORIES = Array.from(new Set(ALL_QUESTIONS.map((question) => question.category))).sort()

/**
 * How strongly each difficulty favours each question tag. Repeating a question
 * in the weighted list makes it more likely to be drawn first, but selection is
 * always without replacement, so a dive never contains the same question twice.
 *
 * Normal is a balanced mix of familiar and harder questions; Hard leans heavily
 * on obscure questions while still allowing tougher medium ones so the pool
 * never runs dry.
 */
export const DIFFICULTY_QUESTION_WEIGHTS: Record<
  QuestionDifficulty,
  Partial<Record<QuestionDifficulty, number>>
> = {
  easy: { easy: 1 },
  medium: { easy: 1, medium: 2 },
  hard: { medium: 1, hard: 3 },
}

function matchesCategory(question: Question, categoryId: string): boolean {
  const bankNames = getCategoryBankNames(categoryId)
  return bankNames === null || bankNames.includes(question.category)
}

/** Unique questions that can appear at a difficulty, optionally limited to one category group. */
export function getDifficultyQuestionPool(
  difficulty: QuestionDifficulty,
  categoryId: string = ALL_CATEGORIES_ID,
): Question[] {
  const weights = DIFFICULTY_QUESTION_WEIGHTS[difficulty]
  return ALL_QUESTIONS.filter(
    (question) => (weights[question.difficulty] ?? 0) > 0 && matchesCategory(question, categoryId),
  )
}

export function getDifficultyQuestionPoolSize(
  difficulty: QuestionDifficulty,
  categoryId: string = ALL_CATEGORIES_ID,
): number {
  return getDifficultyQuestionPool(difficulty, categoryId).length
}

/** True when the category offers a full dive at this difficulty. */
export function isCategoryPlayable(
  difficulty: QuestionDifficulty,
  categoryId: string,
  count = GAME_QUESTION_COUNT,
): boolean {
  return categoryId === ALL_CATEGORIES_ID ||
    getDifficultyQuestionPoolSize(difficulty, categoryId) >= count
}

export const REQUIRED_CATEGORIES = [
  'Geography',
  'Animals',
  'Nature',
  'Food and Drinks',
  'Movies',
  'Television',
  'Music',
  'Sports',
  'History',
  'Science',
  'Technology',
  'General Knowledge',
  'Everyday Objects',
  'Space and Astronomy',
  'Mythology',
  'Biology',
  'Human Body',
  'Ocean and Marine Life',
  'Computer Science',
  'Mathematics',
  'Inventions and Discoveries',
  'Video Games',
  'Literature and Books',
  'Anime and Manga',
  'Language and Vocabulary',
  'Famous People',
  'World Records',
  'Countries and Cultures',
  'Art and Architecture',
] as const

export interface QuestionDataValidation {
  valid: boolean
  errors: string[]
}

export function getAllQuestions(): Question[] {
  return ALL_QUESTIONS
}

export function getQuestionsByCategory(category: string): Question[] {
  return ALL_QUESTIONS.filter((question) => question.category === category)
}

export function findQuestionById(id: string): Question | undefined {
  return ALL_QUESTIONS.find((question) => question.id === id)
}

export function getLegacyQuestionPlaceholder(id: string): Question {
  return {
    id,
    category: 'Archived version',
    prompt: 'Original question data from this legacy game is unavailable.',
    difficulty: 'medium',
    fact: '',
    answers: [],
  }
}

export function getAcceptedAnswers(questionId: string): AcceptedAnswer[] {
  return findQuestionById(questionId)?.answers ?? []
}

export function getAcceptedAnswersAfterGame(questionId: string): AcceptedAnswer[] {
  return getAcceptedAnswers(questionId)
}

export function findDuplicateAnswers(answers: readonly AcceptedAnswer[]): string[] {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const answer of answers) {
    const variantsForAnswer = new Set<string>()
    for (const candidate of [answer.text, ...(answer.aliases ?? [])]) {
      const normalized = normalize(candidate)
      if (variantsForAnswer.has(normalized)) continue
      variantsForAnswer.add(normalized)
      if (seen.has(normalized)) duplicates.push(candidate)
      else seen.add(normalized)
    }
  }
  return duplicates
}

export function findDuplicateQuestions(questions: readonly Question[]): string[] {
  const ids = new Set<string>()
  const prompts = new Set<string>()
  const duplicates: string[] = []
  for (const question of questions) {
    const promptKey = `${normalize(question.category)}|${normalize(question.prompt)}`
    if (ids.has(question.id)) duplicates.push(`ID ${question.id}`)
    if (prompts.has(promptKey)) duplicates.push(`Prompt "${question.prompt}"`)
    ids.add(question.id)
    prompts.add(promptKey)
  }
  return duplicates
}

export function validateQuestionData(data: unknown): QuestionDataValidation {
  const errors: string[] = []
  if (!Array.isArray(data)) return { valid: false, errors: ['Question data must be an array.'] }

  const ids = new Set<string>()
  const prompts = new Set<string>()
  for (const [index, value] of data.entries()) {
    if (!value || typeof value !== 'object') {
      errors.push(`Question at index ${index} must be an object.`)
      continue
    }

    const question = value as Partial<Question>
    const label = typeof question.id === 'string' ? question.id : `index ${index}`
    if (typeof question.id !== 'string' || !question.id.trim()) errors.push(`${label}: missing ID.`)
    else if (ids.has(question.id)) errors.push(`${label}: duplicate question ID.`)
    if (typeof question.category !== 'string' || !question.category.trim()) {
      errors.push(`${label}: missing category.`)
    }
    if (typeof question.prompt !== 'string' || !question.prompt.trim()) {
      errors.push(`${label}: missing question text.`)
    } else {
      const categoryKey = typeof question.category === 'string' ? normalize(question.category) : ''
      const promptKey = `${categoryKey}|${normalize(question.prompt)}`
      if (prompts.has(promptKey)) errors.push(`${label}: duplicate question text.`)
      prompts.add(promptKey)
    }
    if (!['easy', 'medium', 'hard'].includes(question.difficulty as QuestionDifficulty)) {
      errors.push(`${label}: invalid difficulty.`)
    }
    if (typeof question.fact !== 'string' || !question.fact.trim()) errors.push(`${label}: missing fact.`)
    if (!Array.isArray(question.answers) || question.answers.length === 0) {
      errors.push(`${label}: at least one accepted answer is required.`)
      continue
    }

    const seenAnswers = new Set<string>()
    for (const answerValue of question.answers) {
      if (!answerValue || typeof answerValue !== 'object') {
        errors.push(`${label}: accepted answer must be an object.`)
        continue
      }
      const answer = answerValue as Partial<AcceptedAnswer>
      if (typeof answer.text !== 'string' || !answer.text.trim()) {
        errors.push(`${label}: accepted answer is missing its text.`)
        continue
      }
      const tier = RARITY_TIERS.find((candidate) => candidate.id === answer.tier)
      if (!tier) errors.push(`${label}: "${answer.text}" has an invalid rarity tier.`)
      if (typeof answer.points !== 'number' || !Number.isFinite(answer.points)) {
        errors.push(`${label}: "${answer.text}" is missing a point value.`)
      } else if (tier && answer.points !== tier.points) {
        errors.push(`${label}: "${answer.text}" points do not match its rarity tier.`)
      }
      if (answer.aliases !== undefined && (
        !Array.isArray(answer.aliases) || answer.aliases.some((alias) => typeof alias !== 'string')
      )) {
        errors.push(`${label}: "${answer.text}" has invalid aliases.`)
        continue
      }
      const variantsForAnswer = new Set<string>()
      for (const candidate of [answer.text, ...(answer.aliases ?? [])]) {
        const key = normalize(candidate)
        if (variantsForAnswer.has(key)) continue
        variantsForAnswer.add(key)
        if (!key) errors.push(`${label}: "${answer.text}" has an empty answer variant.`)
        else if (seenAnswers.has(key)) errors.push(`${label}: duplicate answer variant "${candidate}".`)
        else seenAnswers.add(key)
      }
    }
    if (typeof question.id === 'string') ids.add(question.id)
  }

  return { valid: errors.length === 0, errors }
}

function shuffle<T>(values: T[], random: () => number): T[] {
  for (let index = values.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[values[index], values[other]] = [values[other], values[index]]
  }
  return values
}

function weightedQuestionList(candidates: readonly Question[], difficulty: QuestionDifficulty): Question[] {
  const weights = DIFFICULTY_QUESTION_WEIGHTS[difficulty]
  const weighted: Question[] = []
  for (const question of candidates) {
    const weight = weights[question.difficulty] ?? 0
    for (let copy = 0; copy < weight; copy++) weighted.push(question)
  }
  return weighted
}

/** Draws unique questions, honouring the difficulty's question weights. */
function pickUniqueQuestions(
  candidates: readonly Question[],
  difficulty: QuestionDifficulty,
  count: number,
  random: () => number,
): Question[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Cannot select ${count} questions.`)
  }
  if (candidates.length < count) {
    throw new Error(`Cannot select ${count} questions from a pool of ${candidates.length}.`)
  }
  const order = shuffle(weightedQuestionList(candidates, difficulty), random)
  const seen = new Set<string>()
  const picked: Question[] = []
  for (const question of order) {
    if (seen.has(question.id)) continue
    seen.add(question.id)
    picked.push(question)
    if (picked.length === count) break
  }
  return picked
}

function questionCandidates(
  difficulty: QuestionDifficulty,
  recentQuestionIds: readonly string[],
  count: number,
  categoryId: string,
): Question[] {
  const pool = getDifficultyQuestionPool(difficulty, categoryId)
  if (pool.length < count) {
    throw new Error(
      `The ${getCategoryLabel(categoryId)} category only has ${pool.length} questions on ${difficulty}; a dive needs ${count}.`,
    )
  }
  const recent = new Set(recentQuestionIds)
  const preferred = pool.filter((question) => !recent.has(question.id))
  return preferred.length >= count ? preferred : pool
}

export function getRandomQuestions(
  count = GAME_QUESTION_COUNT,
  recentQuestionIds: readonly string[] = [],
  difficulty: QuestionDifficulty = DEFAULT_DIFFICULTY,
  categoryId: string = ALL_CATEGORIES_ID,
): Question[] {
  const candidates = questionCandidates(difficulty, recentQuestionIds, count, categoryId)
  return pickUniqueQuestions(candidates, difficulty, count, Math.random)
}

export function getSevenUniqueQuestions(
  recentQuestionIds: readonly string[] = [],
  difficulty: QuestionDifficulty = DEFAULT_DIFFICULTY,
  categoryId: string = ALL_CATEGORIES_ID,
): Question[] {
  const poolSize = getDifficultyQuestionPoolSize(difficulty, categoryId)
  if (poolSize < GAME_QUESTION_COUNT) {
    throw new Error(
      `A ${difficulty} dive in ${getCategoryLabel(categoryId)} needs ${GAME_QUESTION_COUNT} questions, but only ${poolSize} are available.`,
    )
  }
  return getRandomQuestions(GAME_QUESTION_COUNT, recentQuestionIds, difficulty, categoryId)
}

export const todayKey = getLocalDateKey

/**
 * Selects the same repeatable challenge for a given local date, difficulty and
 * category. All Categories keeps its original date+difficulty seed.
 */
export function getDailyQuestions(
  dateKey: string,
  count = GAME_QUESTION_COUNT,
  difficulty: QuestionDifficulty = DEFAULT_DIFFICULTY,
  categoryId: string = ALL_CATEGORIES_ID,
): Question[] {
  const seedKey = categoryId === ALL_CATEGORIES_ID
    ? `${dateKey}:${difficulty}`
    : `${dateKey}:${difficulty}:${categoryId}`
  let seed = 0
  for (const character of seedKey) {
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0
  }
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const candidates = questionCandidates(difficulty, [], count, categoryId)
  return pickUniqueQuestions(candidates, difficulty, count, random)
}

export const QUESTION_DATA_VALIDATION = validateQuestionData(ALL_QUESTIONS)
const categoryCounts = new Map<string, number>()
for (const question of ALL_QUESTIONS) {
  categoryCounts.set(question.category, (categoryCounts.get(question.category) ?? 0) + 1)
}
for (const category of REQUIRED_CATEGORIES) {
  const count = categoryCounts.get(category) ?? 0
  if (count < 10 || count > 20) {
    QUESTION_DATA_VALIDATION.errors.push(`${category} must contain 10–20 questions; found ${count}.`)
  }
}
if (ALL_QUESTIONS.length < 200) {
  QUESTION_DATA_VALIDATION.errors.push(`At least 200 questions are required; found ${ALL_QUESTIONS.length}.`)
}
for (const difficulty of ['easy', 'medium', 'hard'] as const) {
  const poolSize = getDifficultyQuestionPoolSize(difficulty)
  if (poolSize < GAME_QUESTION_COUNT) {
    QUESTION_DATA_VALIDATION.errors.push(
      `The ${difficulty} pool needs at least ${GAME_QUESTION_COUNT} questions; found ${poolSize}.`,
    )
  }
}
if (findDuplicateQuestions(ALL_QUESTIONS).length > 0) {
  QUESTION_DATA_VALIDATION.errors.push('Duplicate question IDs or prompts were found.')
}
if (QUESTION_DATA_VALIDATION.errors.length > 0) {
  QUESTION_DATA_VALIDATION.valid = false
  throw new Error(`Invalid trivia database:\n${QUESTION_DATA_VALIDATION.errors.join('\n')}`)
}
