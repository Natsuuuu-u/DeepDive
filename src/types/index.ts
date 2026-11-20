export type RarityTierId =
  | 'plankton'
  | 'too-clever'
  | 'schooler'
  | 'rare'
  | 'deep-cut'
  | 'one-in-a-krillion'

export interface RarityTier {
  id: RarityTierId
  label: string
  points: number
  /** Tailwind text color class used when showing this tier */
  color: string
}

export interface AcceptedAnswer {
  /** Display form of the answer */
  text: string
  /** Other spellings / phrasings that should also match */
  aliases?: string[]
  tier: RarityTierId
  points: number
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  category: string
  prompt: string
  difficulty: QuestionDifficulty
  fact: string
  answers: AcceptedAnswer[]
}

export type GameMode = 'daily' | 'unlimited' | 'practice'

export interface DepthZone {
  id: 'sunlit' | 'twilight' | 'midnight' | 'abyss' | 'hadal'
  name: string
  /** Minimum score to enter this zone */
  minScore: number
  /** Depth range shown in the indicator, in metres */
  minDepth: number
  maxDepth: number
}

export interface AnswerResult {
  questionId: string
  given: string
  matched: AcceptedAnswer | null
  points: number
  timedOut: boolean
  /**
   * Set when a misspelled answer was accepted: 'auto' for a high-confidence
   * typo, 'confirmed' when the player accepted a "Did you mean...?" suggestion.
   * `given` always keeps exactly what the player typed.
   */
  corrected?: 'auto' | 'confirmed'
}

export interface RunRecord {
  id: string
  mode: GameMode
  date: string // ISO
  score: number
  difficulty?: QuestionDifficulty
  /** Player category group id. Older records without it are treated as All Categories. */
  category?: string
  results: AnswerResult[]
  depthMeters?: number
  completed?: boolean
  completedAt?: string
  dailyDate?: string
  practiceDate?: string
  questionIds?: string[]
  questionSnapshots?: Question[]
}

export type GamePhase = 'playing' | 'feedback' | 'complete'

export interface SavedGameState {
  version: 1
  runId: string
  mode: GameMode
  difficulty?: QuestionDifficulty
  category?: string
  questionIds: string[]
  questionIndex: number
  results: AnswerResult[]
  phase: GamePhase
  questionDeadline: number
  feedbackDeadline: number | null
  message: string | null
  startedAt: number
  /** Wall-clock end of the cinematic intro; the question clock starts afterwards. */
  introEndsAt?: number
  dailyDate?: string
  practiceDate?: string
  questionSnapshots?: Question[]
}

export interface Settings {
  reduceMotion: boolean
  soundEnabled: boolean
}

export interface Stats {
  totalRuns: number
  bestScore: number
  bestDailyScore?: number
  totalScore: number
  deepestZone: DepthZone['id'] | null
  lastDailyDate: string | null
  dailyStreak: number
  processedRunIds?: string[]
  dailyRuns?: number
  unlimitedRuns?: number
  practiceRuns?: number
  lowestScore?: number
  totalCorrectAnswers?: number
  bestRarity?: RarityTierId | null
  rarityAnswers?: Record<RarityTierId, number>
  longestDailyStreak?: number
  achievementUnlocks?: Record<string, string>
}

export interface Achievement {
  id: string
  name: string
  description: string
  unlockCondition: string
  unlocked: boolean
  unlockedAt: string | null
}
