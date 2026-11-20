import { getLocalDateKey, getPreviousLocalDateKey } from '@/lib/daily'
import { findQuestionById } from '@/lib/questions'
import { RARITY_TIERS } from '@/lib/rarity'
import { GAME_QUESTION_COUNT } from '@/lib/gameConstants'
import type { Achievement, AnswerResult, RarityTierId, RunRecord, Stats } from '@/types'

export const RARITY_ORDER = RARITY_TIERS.map((tier) => tier.id)

function isCompletedGame(run: RunRecord): boolean {
  return run.completed !== false && run.results.length === GAME_QUESTION_COUNT
}

export interface CategoryPerformance {
  category: string
  correct: number
  attempts: number
  accuracy: number
}

export interface PlayerStatistics {
  totalGames: number
  dailyGames: number
  unlimitedGames: number
  practiceGames: number
  highestScore: number
  averageScore: number
  lowestScore: number
  totalPoints: number
  totalDepthMeters: number
  deepestDiveMeters: number
  averageCorrectAnswers: number
  bestRarity: RarityTierId | null
  rarityAnswers: Record<RarityTierId, number>
  recentAverageScore: number
  currentDailyStreak: number
  longestDailyStreak: number
  totalDailyDives: number
  bestCategories: CategoryPerformance[]
}

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'deepest-dive',
    name: 'Into the Hadal',
    description: 'Reach the Hadal Trench on a single dive.',
    unlockCondition: 'Score at least 600 points in one game.',
  },
  {
    id: 'perfect-dive',
    name: 'Perfect Dive',
    description: 'Earn all 700 points in a single game.',
    unlockCondition: 'Finish a game with 700 points.',
  },
  {
    id: 'first-daily',
    name: 'First Daily Dive',
    description: 'Complete your first official Daily Dive.',
    unlockCondition: 'Complete one Daily Dive.',
  },
  {
    id: 'first-rare',
    name: 'Rare Find',
    description: 'Land your first Rare answer.',
    unlockCondition: 'Earn a Rare tier answer or higher.',
  },
  {
    id: 'first-deep-cut',
    name: 'Deep Cut',
    description: 'Find an answer hidden in the deep.',
    unlockCondition: 'Earn a Deep Cut tier answer or higher.',
  },
  {
    id: 'first-krillion',
    name: 'One in a Krillion',
    description: 'Discover the rarest accepted answer.',
    unlockCondition: 'Earn a One in a Krillion answer.',
  },
  {
    id: 'streak-7',
    name: 'Seven-Day Streak',
    description: 'Complete a Daily Dive seven days in a row.',
    unlockCondition: 'Complete seven consecutive daily challenges.',
  },
  {
    id: 'streak-30',
    name: 'Moon Jelly Regular',
    description: 'Complete a Daily Dive thirty days in a row.',
    unlockCondition: 'Complete thirty consecutive daily challenges.',
  },
]

export type AchievementUnlocks = Record<string, string>

export function emptyRarityCounts(): Record<RarityTierId, number> {
  return {
    plankton: 0,
    'too-clever': 0,
    schooler: 0,
    rare: 0,
    'deep-cut': 0,
    'one-in-a-krillion': 0,
  }
}

export function getHighestRarity(results: readonly AnswerResult[]): RarityTierId | null {
  let highestIndex = -1
  let highest: RarityTierId | null = null
  for (const result of results) {
    if (!result.matched) continue
    const index = RARITY_ORDER.indexOf(result.matched.tier)
    if (index > highestIndex) {
      highestIndex = index
      highest = result.matched.tier
    }
  }
  return highest
}

export function getRarityCounts(runs: readonly RunRecord[]): Record<RarityTierId, number> {
  const counts = emptyRarityCounts()
  for (const run of runs.filter(isCompletedGame)) {
    for (const result of run.results) {
      if (result.matched) counts[result.matched.tier] += 1
    }
  }
  return counts
}

function isCompletedDaily(run: RunRecord): boolean {
  return run.mode === 'daily' && run.completed !== false && run.results.length === GAME_QUESTION_COUNT
}

function getDailyDate(run: RunRecord): string {
  return run.dailyDate ?? getLocalDateKey(new Date(run.date))
}

function getDailyRunsByDate(runs: readonly RunRecord[]): Map<string, RunRecord> {
  const dailyRuns = runs
    .filter(isCompletedDaily)
    .slice()
    .sort((a, b) => Date.parse(a.completedAt ?? a.date) - Date.parse(b.completedAt ?? b.date))
  const byDate = new Map<string, RunRecord>()
  for (const run of dailyRuns) byDate.set(getDailyDate(run), run)
  return byDate
}

export function getLongestDailyStreak(runs: readonly RunRecord[]): number {
  const dates = [...getDailyRunsByDate(runs).keys()].sort()
  let longest = 0
  let current = 0
  let previous: string | null = null
  for (const date of dates) {
    current = previous && getPreviousLocalDateKey(date) === previous ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = date
  }
  return longest
}

function getStreakMilestoneRun(runs: readonly RunRecord[], target: number): RunRecord | undefined {
  const dailyByDate = getDailyRunsByDate(runs)
  const dates = [...dailyByDate.keys()].sort()
  let current = 0
  let previous: string | null = null
  for (const date of dates) {
    current = previous && getPreviousLocalDateKey(date) === previous ? current + 1 : 1
    if (current >= target) return dailyByDate.get(date)
    previous = date
  }
  return undefined
}

function runUnlockDate(run: RunRecord): string {
  return run.completedAt ?? run.date
}

export function deriveAchievementUnlocks(
  runs: readonly RunRecord[],
  previous: AchievementUnlocks = {},
): AchievementUnlocks {
  const unlocked = { ...previous }
  const byCompletion = runs
    .filter(isCompletedGame)
    .slice()
    .sort((a, b) => Date.parse(a.completedAt ?? a.date) - Date.parse(b.completedAt ?? b.date))
  const first = (predicate: (run: RunRecord) => boolean): string | undefined => {
    const run = byCompletion.find(predicate)
    return run ? runUnlockDate(run) : undefined
  }
  const milestoneDate = (target: number): string | undefined => {
    const run = getStreakMilestoneRun(runs, target)
    return run ? runUnlockDate(run) : undefined
  }
  const candidates: Record<string, string | undefined> = {
    'deepest-dive': first((run) => run.score >= 600),
    'perfect-dive': first((run) => run.score >= 700),
    'first-daily': first(isCompletedDaily),
    'first-rare': first((run) => run.results.some((result) =>
      result.matched && RARITY_ORDER.indexOf(result.matched.tier) >= RARITY_ORDER.indexOf('rare'),
    )),
    'first-deep-cut': first((run) => run.results.some((result) =>
      result.matched && RARITY_ORDER.indexOf(result.matched.tier) >= RARITY_ORDER.indexOf('deep-cut'),
    )),
    'first-krillion': first((run) =>
      run.results.some((result) => result.matched?.tier === 'one-in-a-krillion'),
    ),
    'streak-7': milestoneDate(7),
    'streak-30': milestoneDate(30),
  }
  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (!unlocked[definition.id] && candidates[definition.id]) {
      unlocked[definition.id] = candidates[definition.id]!
    }
  }
  return unlocked
}

export function getAchievements(
  runs: readonly RunRecord[],
  savedUnlocks: AchievementUnlocks = {},
): Achievement[] {
  const unlocks = deriveAchievementUnlocks(runs, savedUnlocks)
  return ACHIEVEMENT_DEFINITIONS.map((definition) => ({
    ...definition,
    unlocked: Boolean(unlocks[definition.id]),
    unlockedAt: unlocks[definition.id] ?? null,
  }))
}

function getBestRarityFromRuns(runs: readonly RunRecord[]): RarityTierId | null {
  return getHighestRarity(runs.flatMap((run) => run.results))
}

function getCurrentStreakFromRuns(runs: readonly RunRecord[], today: string): number {
  const dates = [...getDailyRunsByDate(runs).keys()].sort()
  const latest = dates[dates.length - 1]
  if (!latest || ![today, getPreviousLocalDateKey(today)].includes(latest)) return 0
  let streak = 1
  for (let index = dates.length - 1; index > 0; index--) {
    if (getPreviousLocalDateKey(dates[index]) !== dates[index - 1]) break
    streak += 1
  }
  return streak
}

export function calculatePlayerStatistics(
  runs: readonly RunRecord[],
  saved: Stats,
  today = getLocalDateKey(),
): PlayerStatistics {
  const completedRuns = runs.filter(isCompletedGame)
  const scores = completedRuns.map((run) => run.score)
  const observedTotal = scores.reduce((sum, score) => sum + score, 0)
  const totalGames = Math.max(saved.totalRuns, completedRuns.length)
  const totalPoints = Math.max(saved.totalScore, observedTotal)
  const highestScore = Math.max(saved.bestScore, ...scores, 0)
  const observedDailyGames = getDailyRunsByDate(completedRuns).size
  const dailyGames = saved.totalRuns <= runs.length
    ? observedDailyGames
    : Math.max(saved.dailyRuns ?? 0, observedDailyGames)
  const unlimitedGames = Math.max(
    saved.unlimitedRuns ?? 0,
    completedRuns.filter((run) => run.mode === 'unlimited').length,
  )
  const practiceGames = Math.max(
    saved.practiceRuns ?? 0,
    completedRuns.filter((run) => run.mode === 'practice').length,
  )
  const recentRuns = completedRuns
    .slice()
    .sort((a, b) => Date.parse(b.completedAt ?? b.date) - Date.parse(a.completedAt ?? a.date))
    .slice(0, 10)
  const observedRarityCounts = getRarityCounts(completedRuns)
  const rarityAnswers = emptyRarityCounts()
  for (const rarity of RARITY_ORDER) {
    rarityAnswers[rarity] = Math.max(saved.rarityAnswers?.[rarity] ?? 0, observedRarityCounts[rarity])
  }
  const observedCorrect = completedRuns.reduce(
    (total, run) => total + run.results.filter((result) => result.matched !== null).length,
    0,
  )
  const totalCorrect = Math.max(saved.totalCorrectAnswers ?? 0, observedCorrect)
  const categoryTotals = new Map<string, { correct: number; attempts: number }>()
  for (const run of completedRuns) {
    for (const result of run.results) {
      const category = findQuestionById(result.questionId)?.category
      if (!category) continue
      const counts = categoryTotals.get(category) ?? { correct: 0, attempts: 0 }
      counts.attempts += 1
      if (result.matched) counts.correct += 1
      categoryTotals.set(category, counts)
    }
  }
  const categoryValues = [...categoryTotals].map(([category, counts]) => ({
    category,
    ...counts,
    accuracy: counts.attempts ? counts.correct / counts.attempts : 0,
  }))
  const stableCategories = categoryValues.filter((category) => category.attempts >= 3)
  const bestCategories = (stableCategories.length ? stableCategories : categoryValues)
    .sort((a, b) => b.accuracy - a.accuracy || b.correct - a.correct || b.attempts - a.attempts)
    .slice(0, 3)
  const computedStreak = getCurrentStreakFromRuns(runs, today)
  const cachedStreakIsCurrent = saved.lastDailyDate &&
    [today, getPreviousLocalDateKey(today)].includes(saved.lastDailyDate)
  const currentDailyStreak = cachedStreakIsCurrent ? saved.dailyStreak : computedStreak
  const longestDailyStreak = Math.max(saved.longestDailyStreak ?? 0, getLongestDailyStreak(runs))

  return {
    totalGames,
    dailyGames,
    unlimitedGames,
    practiceGames,
    highestScore,
    averageScore: totalGames ? totalPoints / totalGames : 0,
    lowestScore: saved.lowestScore ?? (scores.length ? Math.min(...scores) : 0),
    totalPoints,
    totalDepthMeters: totalPoints * 10,
    deepestDiveMeters: highestScore * 10,
    averageCorrectAnswers: totalGames ? totalCorrect / totalGames : 0,
    bestRarity: saved.bestRarity ?? getBestRarityFromRuns(completedRuns),
    rarityAnswers,
    recentAverageScore: recentRuns.length
      ? recentRuns.reduce((sum, run) => sum + run.score, 0) / recentRuns.length
      : 0,
    currentDailyStreak,
    longestDailyStreak,
    totalDailyDives: dailyGames,
    bestCategories,
  }
}
