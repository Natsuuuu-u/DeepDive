import type {
  GameMode,
  Question,
  QuestionDifficulty,
  RunRecord,
  SavedGameState,
  Settings,
  Stats,
} from '@/types'
import { getDepthMeters, getZone } from '@/lib/depth'
import { getLocalDateKey, getPreviousLocalDateKey } from '@/lib/daily'
import { findQuestionById, getDailyQuestions } from '@/lib/questions'
import { DEFAULT_DIFFICULTY, isQuestionDifficulty } from '@/lib/difficulty'
import {
  ALL_CATEGORIES_ID,
  isCategoryId,
  normalizeCategoryId,
} from '@/lib/categories'
import { GAME_QUESTION_COUNT } from '@/lib/gameConstants'
import {
  deriveAchievementUnlocks,
  emptyRarityCounts,
  getHighestRarity,
  getLongestDailyStreak,
  RARITY_ORDER,
} from '@/lib/progression'
import { getTier } from '@/lib/rarity'

const PREFIX = 'ddt:v1:'

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  runs: `${PREFIX}runs`,
  stats: `${PREFIX}stats`,
  difficulty: `${PREFIX}difficulty`,
  category: `${PREFIX}category`,
  activeDaily: `${PREFIX}active:daily`,
  activeUnlimited: `${PREFIX}active:unlimited`,
} as const

const dailyQuestionsKey = (
  dateKey: string,
  difficulty: QuestionDifficulty,
  categoryId: string,
): string => categoryId === ALL_CATEGORIES_ID
  ? `${PREFIX}daily-questions:${dateKey}:${difficulty}`
  : `${PREFIX}daily-questions:${dateKey}:${difficulty}:${categoryId}`

export const DEFAULT_SETTINGS: Settings = {
  reduceMotion: false,
  soundEnabled: false,
}

export const DEFAULT_STATS: Stats = {
  totalRuns: 0,
  bestScore: 0,
  bestDailyScore: 0,
  totalScore: 0,
  deepestZone: null,
  lastDailyDate: null,
  dailyStreak: 0,
}

/** Reads JSON from LocalStorage, merging over `fallback` so new fields get defaults. */
export function readJSON<T extends object>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<T>) } : fallback
  } catch {
    return fallback
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: progress just won't persist */
  }
}

function nonNegativeNumber(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(max, value))
    : fallback
}

function isLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && getLocalDateKey(date) === value
}

export function loadStats(): Stats {
  const stored = readJSON<Stats>(STORAGE_KEYS.stats, DEFAULT_STATS)
  const rarityAnswers = emptyRarityCounts()
  for (const tier of RARITY_ORDER) {
    rarityAnswers[tier] = nonNegativeNumber(stored.rarityAnswers?.[tier], 0)
  }
  const validZones: Stats['deepestZone'][] = ['sunlit', 'twilight', 'midnight', 'abyss', 'hadal']
  const achievementUnlocks: Record<string, string> = {}
  if (stored.achievementUnlocks && typeof stored.achievementUnlocks === 'object') {
    for (const [id, date] of Object.entries(stored.achievementUnlocks)) {
      if (id && typeof date === 'string' && Number.isFinite(Date.parse(date))) {
        achievementUnlocks[id] = date
      }
    }
  }
  return {
    ...DEFAULT_STATS,
    totalRuns: Math.floor(nonNegativeNumber(stored.totalRuns, 0)),
    bestScore: Math.floor(nonNegativeNumber(stored.bestScore, 0, 700)),
    bestDailyScore: Math.floor(nonNegativeNumber(stored.bestDailyScore, 0, 700)),
    totalScore: Math.floor(nonNegativeNumber(stored.totalScore, 0)),
    deepestZone: validZones.includes(stored.deepestZone ?? null) ? stored.deepestZone ?? null : null,
    lastDailyDate: isLocalDateKey(stored.lastDailyDate) ? stored.lastDailyDate : null,
    dailyStreak: Math.floor(nonNegativeNumber(stored.dailyStreak, 0)),
    processedRunIds: Array.isArray(stored.processedRunIds)
      ? stored.processedRunIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(-200)
      : [],
    dailyRuns: Math.floor(nonNegativeNumber(stored.dailyRuns, 0)),
    unlimitedRuns: Math.floor(nonNegativeNumber(stored.unlimitedRuns, 0)),
    practiceRuns: Math.floor(nonNegativeNumber(stored.practiceRuns, 0)),
    lowestScore: stored.lowestScore === undefined
      ? undefined
      : Math.floor(nonNegativeNumber(stored.lowestScore, 0, 700)),
    totalCorrectAnswers: Math.floor(nonNegativeNumber(stored.totalCorrectAnswers, 0)),
    bestRarity: RARITY_ORDER.includes(stored.bestRarity as (typeof RARITY_ORDER)[number])
      ? stored.bestRarity
      : null,
    rarityAnswers,
    longestDailyStreak: Math.floor(nonNegativeNumber(stored.longestDailyStreak, 0)),
    achievementUnlocks,
  }
}

export const loadRuns = (): RunRecord[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.runs)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isStoredRun).slice(0, 200) : []
  } catch {
    return []
  }
}

function isStoredRun(value: unknown): value is RunRecord {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<RunRecord>
  const validMode = run.mode === 'daily' || run.mode === 'unlimited' || run.mode === 'practice'
  const validDifficulty = run.difficulty === undefined || isQuestionDifficulty(run.difficulty)
  const validCategory = run.category === undefined || isCategoryId(run.category)
  const validResults =
    Array.isArray(run.results) &&
    run.results.every((value) => {
      if (!value || typeof value !== 'object') return false
      const result = value as RunRecord['results'][number]
      if (
        typeof result.questionId !== 'string' ||
        typeof result.given !== 'string' ||
        typeof result.points !== 'number' ||
        !Number.isFinite(result.points) ||
        typeof result.timedOut !== 'boolean'
      ) return false
      if (result.matched === null) return true
      return (
        typeof result.matched === 'object' &&
        typeof result.matched.text === 'string' &&
        typeof result.matched.tier === 'string'
      )
    })
  const validSnapshots = run.questionSnapshots === undefined || (
    Array.isArray(run.questionSnapshots) &&
    run.questionSnapshots.length === GAME_QUESTION_COUNT &&
    new Set(run.questionSnapshots.map((question) => question?.id)).size === GAME_QUESTION_COUNT &&
    run.questionSnapshots.every((question, index) =>
      isStoredQuestion(question) &&
      question.id === (run.questionIds?.[index] ?? run.results?.[index]?.questionId),
    )
  )
  return (
    typeof run.id === 'string' &&
    run.id.length > 0 &&
    validMode &&
    validDifficulty &&
    validCategory &&
    typeof run.date === 'string' &&
    Number.isFinite(Date.parse(run.date)) &&
    typeof run.score === 'number' &&
    Number.isFinite(run.score) &&
    run.score >= 0 &&
    (run.questionIds === undefined ||
      (Array.isArray(run.questionIds) &&
        run.questionIds.length === GAME_QUESTION_COUNT &&
        new Set(run.questionIds).size === GAME_QUESTION_COUNT &&
        run.questionIds.every(
          (id, index) => typeof id === 'string' && id === run.results?.[index]?.questionId,
        ))) &&
    (run.completed === undefined || typeof run.completed === 'boolean') &&
    (run.completed !== true || run.results?.length === GAME_QUESTION_COUNT) &&
    validSnapshots &&
    validResults
  )
}

function isStoredQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false
  const question = value as Partial<Question>
  return (
    typeof question.id === 'string' &&
    typeof question.category === 'string' &&
    typeof question.prompt === 'string' &&
    ['easy', 'medium', 'hard'].includes(question.difficulty as string) &&
    typeof question.fact === 'string' &&
    Array.isArray(question.answers) &&
    question.answers.length > 0 &&
    question.answers.every((answer) => {
      if (
        !answer ||
        typeof answer.text !== 'string' ||
        typeof answer.tier !== 'string' ||
        typeof answer.points !== 'number' ||
        (answer.aliases !== undefined &&
          (!Array.isArray(answer.aliases) || !answer.aliases.every((alias) => typeof alias === 'string')))
      ) return false
      return RARITY_ORDER.includes(answer.tier) && getTier(answer.tier).points === answer.points
    })
  )
}

export function getDailyRunForDate(dateKey: string): RunRecord | undefined {
  return loadRuns().find((run) =>
    run.mode === 'daily' &&
    run.completed !== false &&
    run.results.length === GAME_QUESTION_COUNT &&
    (run.dailyDate ?? getLocalDateKey(new Date(run.date))) === dateKey,
  )
}

export function getDailyQuestionsForDate(
  dateKey: string,
  difficulty: QuestionDifficulty = DEFAULT_DIFFICULTY,
  categoryId: string = ALL_CATEGORIES_ID,
  savedQuestionIds?: readonly string[],
  savedQuestionSnapshots?: readonly Question[],
) {
  const snapshotsAreValid = savedQuestionSnapshots?.length === GAME_QUESTION_COUNT &&
    new Set(savedQuestionSnapshots.map((question) => question.id)).size === GAME_QUESTION_COUNT &&
    savedQuestionSnapshots.every((question, index) =>
      isStoredQuestion(question) &&
      (!savedQuestionIds || question.id === savedQuestionIds[index]),
    )
  if (snapshotsAreValid) return [...savedQuestionSnapshots]

  const key = dailyQuestionsKey(dateKey, difficulty, categoryId)
  let raw: string | null
  try {
    raw = window.localStorage.getItem(key)
  } catch (error) {
    throw new Error(`Could not load the ${dateKey} Daily Dive: ${String(error)}`)
  }

  if (raw) {
    try {
      const ids: unknown = JSON.parse(raw)
      if (
        Array.isArray(ids) &&
        ids.length === GAME_QUESTION_COUNT &&
        new Set(ids).size === GAME_QUESTION_COUNT &&
        ids.every((id) => typeof id === 'string')
      ) {
        const questions = ids.map((id) => findQuestionById(id))
        if (questions.every((question): question is Question => question !== undefined)) {
          return questions
        }
      }
    } catch {
      // Invalid cached schedules are regenerated deterministically below.
    }
  }

  const savedQuestions = savedQuestionIds?.length === GAME_QUESTION_COUNT &&
      new Set(savedQuestionIds).size === GAME_QUESTION_COUNT
    ? savedQuestionIds.map((id) => findQuestionById(id))
    : []
  const questions = savedQuestions.length === GAME_QUESTION_COUNT &&
      savedQuestions.every((question): question is Question => question !== undefined)
    ? savedQuestions
    : getDailyQuestions(dateKey, GAME_QUESTION_COUNT, difficulty, categoryId)
  try {
    window.localStorage.setItem(key, JSON.stringify(questions.map((question) => question.id)))
  } catch (error) {
    throw new Error(`Could not save the ${dateKey} Daily Dive schedule: ${String(error)}`)
  }
  return questions
}

export function getRecentlyPlayedQuestionIds(runCount = 5): string[] {
  const recentRuns = loadRuns().slice(0, Math.max(0, runCount))
  const ids = recentRuns.flatMap((run) =>
    Array.isArray(run.results)
      ? run.results
        .map((result) => result.questionId)
        .filter((id): id is string => typeof id === 'string')
      : [],
  )
  return Array.from(new Set(ids))
}

export const saveRun = (run: RunRecord): RunRecord => {
  const savedRun: RunRecord = {
    ...run,
    difficulty: run.difficulty ?? DEFAULT_DIFFICULTY,
    category: normalizeCategoryId(run.category),
    completed: true,
    completedAt: run.completedAt ?? new Date().toISOString(),
    depthMeters: run.depthMeters ?? getDepthMeters(run.score),
    ...(run.mode === 'daily'
      ? { dailyDate: run.dailyDate ?? getLocalDateKey(new Date(run.date)) }
      : {}),
  }
  const runs = loadRuns()
  const existingRun = runs.find((saved) => saved.id === savedRun.id)
  const existingDaily = savedRun.mode === 'daily'
    ? getDailyRunForDate(savedRun.dailyDate!)
    : undefined
  if (existingDaily && existingDaily.id !== savedRun.id) return existingDaily

  if (!existingRun) {
    try {
      window.localStorage.setItem(STORAGE_KEYS.runs, JSON.stringify([savedRun, ...runs].slice(0, 200)))
    } catch (error) {
      throw new Error(`Could not save this dive to your browser: ${String(error)}`)
    }
  }

  const stats = loadStats()
  const processedRunIds = stats.processedRunIds ?? []
  if (!processedRunIds.includes(savedRun.id) && !existingRun) {
    const zone = getZone(savedRun.score)
    const currentZone = stats.deepestZone ? getZone(
      DEPTH_SCORE_BY_ZONE[stats.deepestZone],
    ) : null
    const dailyDate = savedRun.dailyDate ?? getLocalDateKey(new Date(savedRun.date))
    const previousDay = getPreviousLocalDateKey(dailyDate)
    const isDaily = savedRun.mode === 'daily'
    const lastRecordedDailyDate = runs
      .filter((saved) => saved.mode === 'daily')
      .map((saved) => saved.dailyDate ?? getLocalDateKey(new Date(saved.date)))
      .reduce(
        (latest, savedDate) => savedDate > latest ? savedDate : latest,
        stats.lastDailyDate ?? '',
      )
    const advancesDailyStreak = isDaily && dailyDate > lastRecordedDailyDate
    const progressionRuns = [savedRun, ...runs]
    const earnedRarities = getHighestRarity(savedRun.results)
    const rarityAnswers = {
      ...emptyRarityCounts(),
      ...stats.rarityAnswers,
    }
    for (const result of savedRun.results) {
      if (result.matched) rarityAnswers[result.matched.tier] += 1
    }
    const previousBestRarity = stats.bestRarity ?? null
    const bestRarity = earnedRarities &&
      (!previousBestRarity ||
        RARITY_ORDER.indexOf(earnedRarities) > RARITY_ORDER.indexOf(previousBestRarity))
      ? earnedRarities
      : previousBestRarity
    const longestDailyStreak = Math.max(
      stats.longestDailyStreak ?? 0,
      getLongestDailyStreak(progressionRuns),
    )
    const achievementUnlocks = deriveAchievementUnlocks(
      progressionRuns,
      stats.achievementUnlocks,
    )
    const nextStats: Stats = {
      ...stats,
      totalRuns: stats.totalRuns + 1,
      bestScore: Math.max(stats.bestScore, savedRun.score),
      bestDailyScore: isDaily
        ? Math.max(stats.bestDailyScore ?? 0, savedRun.score)
        : stats.bestDailyScore ?? 0,
      totalScore: stats.totalScore + savedRun.score,
      deepestZone:
        !currentZone || zone.minScore > currentZone.minScore ? zone.id : currentZone.id,
      lastDailyDate: advancesDailyStreak ? dailyDate : lastRecordedDailyDate || stats.lastDailyDate,
      dailyStreak: advancesDailyStreak
        ? lastRecordedDailyDate === previousDay ? stats.dailyStreak + 1 : 1
        : stats.dailyStreak,
      dailyRuns: (stats.dailyRuns ?? 0) + (isDaily ? 1 : 0),
      unlimitedRuns: (stats.unlimitedRuns ?? 0) + (savedRun.mode === 'unlimited' ? 1 : 0),
      practiceRuns: (stats.practiceRuns ?? 0) + (savedRun.mode === 'practice' ? 1 : 0),
      lowestScore: stats.lowestScore === undefined
        ? savedRun.score
        : Math.min(stats.lowestScore, savedRun.score),
      totalCorrectAnswers: (stats.totalCorrectAnswers ?? 0) +
        savedRun.results.filter((result) => result.matched !== null).length,
      bestRarity,
      rarityAnswers,
      longestDailyStreak,
      achievementUnlocks,
      processedRunIds: [...processedRunIds, savedRun.id].slice(-200),
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(nextStats))
    } catch (error) {
      throw new Error(`Could not update dive statistics in your browser: ${String(error)}`)
    }
  }
  return existingRun ?? savedRun
}

const DEPTH_SCORE_BY_ZONE = {
  sunlit: 0,
  twilight: 20,
  midnight: 100,
  abyss: 400,
  hadal: 600,
} as const

const activeGameKey = (mode: GameMode, practiceDate?: string): string => {
  if (mode === 'daily') return STORAGE_KEYS.activeDaily
  if (mode === 'unlimited') return STORAGE_KEYS.activeUnlimited
  if (!practiceDate) throw new Error('An archived practice dive needs its challenge date.')
  return `${PREFIX}active:practice:${practiceDate}`
}

export function loadDifficultyPreference(): QuestionDifficulty {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.difficulty)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isQuestionDifficulty(parsed) ? parsed : DEFAULT_DIFFICULTY
  } catch {
    return DEFAULT_DIFFICULTY
  }
}

export function saveDifficultyPreference(difficulty: QuestionDifficulty): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.difficulty, JSON.stringify(difficulty))
  } catch {
    /* preference is optional */
  }
}

export function loadCategoryPreference(): string {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.category)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return normalizeCategoryId(parsed)
  } catch {
    return ALL_CATEGORIES_ID
  }
}

export function saveCategoryPreference(categoryId: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.category, JSON.stringify(normalizeCategoryId(categoryId)))
  } catch {
    /* preference is optional */
  }
}

export function loadActiveGame(mode: GameMode, practiceDate?: string): SavedGameState | null {
  try {
    const raw = window.localStorage.getItem(activeGameKey(mode, practiceDate))
    return raw ? (JSON.parse(raw) as SavedGameState) : null
  } catch (error) {
    throw new Error(`Could not restore your saved ${mode} dive: ${String(error)}`)
  }
}

export function saveActiveGame(game: SavedGameState): void {
  try {
    window.localStorage.setItem(activeGameKey(game.mode, game.practiceDate), JSON.stringify(game))
  } catch (error) {
    throw new Error(`Could not save your active dive to this browser: ${String(error)}`)
  }
}

/** Drops an abandoned dive without touching completed runs, stats or history. */
export function clearActiveGame(mode: GameMode, practiceDate?: string): void {
  try {
    window.localStorage.removeItem(activeGameKey(mode, practiceDate))
  } catch {
    /* nothing was saved */
  }
}

export const clearAllProgress = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.runs)
    window.localStorage.removeItem(STORAGE_KEYS.stats)
    window.localStorage.removeItem(STORAGE_KEYS.difficulty)
    window.localStorage.removeItem(STORAGE_KEYS.category)
    window.localStorage.removeItem(STORAGE_KEYS.activeDaily)
    window.localStorage.removeItem(STORAGE_KEYS.activeUnlimited)
    for (const key of Object.keys(window.localStorage)) {
      if (
        key.startsWith(`${PREFIX}active:practice:`) ||
        key.startsWith(`${PREFIX}daily-questions:`)
      ) window.localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}
