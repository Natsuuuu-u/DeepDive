import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ANSWER_FEEDBACK_MS, GAME_QUESTION_COUNT, QUESTION_TIME_SECONDS } from '@/lib/gameConstants'
import { calculateScore, canCommitAnswer } from '@/lib/game'
import { getDepthMeters } from '@/lib/depth'
import {
  findQuestionById,
  getDifficultyQuestionPoolSize,
  getSevenUniqueQuestions,
  getLegacyQuestionPlaceholder,
  todayKey,
  validateQuestionData,
} from '@/lib/questions'
import {
  ALL_CATEGORIES_ID,
  isCategoryId,
  normalizeCategoryId,
} from '@/lib/categories'
import { evaluateAnswer } from '@/lib/answers'
import { getDiveDurationMs } from '@/lib/dive'
import { getIntroDurationMs } from '@/lib/intro'
import { DEFAULT_DIFFICULTY, isQuestionDifficulty } from '@/lib/difficulty'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import {
  clearActiveGame,
  getDailyRunForDate,
  getDailyQuestionsForDate,
  getRecentlyPlayedQuestionIds,
  loadActiveGame,
  saveActiveGame,
  saveRun,
} from '@/lib/storage'
import { getTier } from '@/lib/rarity'
import type {
  AcceptedAnswer,
  AnswerResult,
  GameMode,
  Question,
  QuestionDifficulty,
  RunRecord,
  SavedGameState,
} from '@/types'

interface RestoredGame {
  game: SavedGameState
  error: string | null
}

export interface TriviaGameOptions {
  practiceDate?: string
  difficulty?: QuestionDifficulty
  /** Category group id; defaults to All Categories. */
  category?: string
  /** Ignore a saved active game and create a brand-new run. */
  fresh?: boolean
}

function createGame(
  mode: GameMode,
  options: TriviaGameOptions,
  now = Date.now(),
  reduceMotion = false,
): SavedGameState {
  const date = mode === 'daily' ? todayKey(new Date(now)) : options.practiceDate
  if (mode === 'practice' && !date) {
    throw new Error('An archived practice dive needs its challenge date.')
  }
  const archivedRun = mode === 'practice' ? getDailyRunForDate(date!) : undefined
  const archivedQuestionIds = archivedRun?.questionIds ??
    archivedRun?.results.map((result) => result.questionId)
  const difficulty = mode === 'practice'
    ? archivedRun?.difficulty ?? options.difficulty ?? DEFAULT_DIFFICULTY
    : options.difficulty ?? DEFAULT_DIFFICULTY
  const requestedCategory = mode === 'practice'
    ? normalizeCategoryId(archivedRun?.category ?? options.category)
    : normalizeCategoryId(options.category)
  // Never start a fresh dive in a category that cannot fill a full question set.
  const category = mode !== 'practice' &&
    requestedCategory !== ALL_CATEGORIES_ID &&
    getDifficultyQuestionPoolSize(difficulty, requestedCategory) < GAME_QUESTION_COUNT
    ? ALL_CATEGORIES_ID
    : requestedCategory
  const questions = mode === 'daily' || mode === 'practice'
    ? getDailyQuestionsForDate(
        date!,
        difficulty,
        category,
        archivedQuestionIds,
        archivedRun?.questionSnapshots,
      )
    : getSevenUniqueQuestions(getRecentlyPlayedQuestionIds(), difficulty, category)
  if (questions.length !== GAME_QUESTION_COUNT) {
    throw new Error(`A dive requires exactly ${GAME_QUESTION_COUNT} questions.`)
  }

  const introEndsAt = now + getIntroDurationMs(reduceMotion)
  return {
    version: 1,
    runId: `${mode}-${now}-${Math.random().toString(36).slice(2)}`,
    mode,
    difficulty,
    category,
    questionIds: questions.map((question) => question.id),
    questionSnapshots: questions,
    questionIndex: 0,
    results: [],
    phase: 'playing',
    // The question clock only starts once the cinematic intro has finished.
    introEndsAt,
    questionDeadline: introEndsAt + QUESTION_TIME_SECONDS * 1000,
    feedbackDeadline: null,
    message: null,
    startedAt: now,
    ...(mode === 'daily' ? { dailyDate: date! } : {}),
    ...(mode === 'practice' ? { practiceDate: date } : {}),
  }
}

function savedGameFromRun(run: RunRecord): SavedGameState {
  const startedAt = Date.parse(run.date)
  return {
    version: 1,
    runId: run.id,
    mode: run.mode,
    difficulty: run.difficulty ?? DEFAULT_DIFFICULTY,
    category: normalizeCategoryId(run.category),
    questionIds: run.questionIds ?? run.results.map((result) => result.questionId),
    questionIndex: GAME_QUESTION_COUNT - 1,
    results: run.results,
    ...(run.questionSnapshots ? { questionSnapshots: run.questionSnapshots } : {}),
    phase: 'complete',
    questionDeadline: startedAt,
    feedbackDeadline: null,
    message: null,
    startedAt,
    ...(run.mode === 'daily'
      ? { dailyDate: run.dailyDate ?? todayKey(new Date(run.date)) }
      : {}),
    ...(run.practiceDate ? { practiceDate: run.practiceDate } : {}),
  }
}

function hasValidQuestionSnapshots(
  value: unknown,
  questionIds: readonly string[],
): value is Question[] {
  if (
    !Array.isArray(value) ||
    value.length !== GAME_QUESTION_COUNT ||
    value.some((question, index) => !question || question.id !== questionIds[index]) ||
    new Set(value.map((question) => question.id)).size !== GAME_QUESTION_COUNT
  ) return false
  return validateQuestionData(value).valid
}

function isSavedGame(
  value: unknown,
  mode: GameMode,
  practiceDate?: string,
): value is SavedGameState {
  if (!value || typeof value !== 'object') return false
  const game = value as Partial<SavedGameState>
  const questionIds = game.questionIds
  if (
    !Array.isArray(questionIds) ||
    questionIds.length !== GAME_QUESTION_COUNT ||
    new Set(questionIds).size !== GAME_QUESTION_COUNT ||
    !questionIds.every((id) => typeof id === 'string') ||
    (!questionIds.every((id) => findQuestionById(id) !== undefined) &&
      !hasValidQuestionSnapshots(game.questionSnapshots, questionIds))
  ) return false
  const savedQuestions = hasValidQuestionSnapshots(game.questionSnapshots, questionIds)
    ? game.questionSnapshots
    : undefined
  const validHeader =
    game.version === 1 &&
    game.mode === mode &&
    (mode !== 'practice' || game.practiceDate === practiceDate) &&
    (game.difficulty === undefined || isQuestionDifficulty(game.difficulty)) &&
    (game.category === undefined || isCategoryId(game.category)) &&
    typeof game.runId === 'string' &&
    Number.isInteger(game.questionIndex) &&
    (game.questionIndex as number) >= 0 &&
    (game.questionIndex as number) < GAME_QUESTION_COUNT &&
    Array.isArray(game.results) &&
    game.results.length <= GAME_QUESTION_COUNT &&
    (game.phase === 'playing' || game.phase === 'feedback' || game.phase === 'complete') &&
    typeof game.questionDeadline === 'number' &&
    Number.isFinite(game.questionDeadline) &&
    typeof game.startedAt === 'number' &&
    Number.isFinite(game.startedAt) &&
    (game.introEndsAt === undefined ||
      (typeof game.introEndsAt === 'number' &&
        Number.isFinite(game.introEndsAt) &&
        game.introEndsAt >= game.startedAt)) &&
    (game.message === null || typeof game.message === 'string')
  if (!validHeader || !Array.isArray(game.results)) return false

  const expectedResults =
    game.phase === 'playing'
      ? game.questionIndex
      : game.phase === 'feedback'
        ? (game.questionIndex as number) + 1
        : GAME_QUESTION_COUNT
  const validFeedbackDeadline =
    game.phase === 'feedback'
      ? typeof game.feedbackDeadline === 'number' && Number.isFinite(game.feedbackDeadline)
      : game.feedbackDeadline === null
  const validResults = game.results.every((value, index) => {
    if (!value || typeof value !== 'object') return false
    const result = value as Partial<AnswerResult>
    const expectedQuestionId = questionIds[index]
    if (
      result.questionId !== expectedQuestionId ||
      typeof result.given !== 'string' ||
      typeof result.points !== 'number' ||
      typeof result.timedOut !== 'boolean'
    ) return false
    if (result.matched === null) {
      return result.timedOut && result.points === 0 && result.given === ''
    }

    if (!result.matched || typeof result.matched !== 'object') return false
    const question = savedQuestions?.[index] ?? findQuestionById(expectedQuestionId)
    const accepted = question?.answers.find(
      (answer) => answer.text === result.matched?.text && answer.tier === result.matched?.tier,
    )
    if (!accepted) return false
    return (
      !result.timedOut &&
      result.points === accepted.points &&
      result.matched.points === accepted.points &&
      getTier(accepted.tier).points === accepted.points
    )
  })

  return (
    game.results.length === expectedResults &&
    validFeedbackDeadline &&
    validResults
  )
}

function restoreGame(
  mode: GameMode,
  options: TriviaGameOptions,
  reduceMotion: boolean,
): RestoredGame {
  try {
    const date = todayKey()
    // The completed Daily Dive always wins: no difficulty choice can start a
    // second scored attempt on the same local day.
    if (mode === 'daily') {
      const completedRun = getDailyRunForDate(date)
      if (completedRun) return { game: savedGameFromRun(completedRun), error: null }
    }

    let saved = options.fresh ? null : loadActiveGame(mode, options.practiceDate)
    if (!saved) {
      return { game: createGame(mode, options, Date.now(), reduceMotion), error: null }
    }
    if (
      mode === 'daily' &&
      ((saved.dailyDate && saved.dailyDate !== date) ||
        (!saved.dailyDate && todayKey(new Date(saved.startedAt)) !== date))
    ) {
      return { game: createGame(mode, options, Date.now(), reduceMotion), error: null }
    }
    if (mode === 'daily' && !saved.dailyDate) {
      saved = { ...saved, dailyDate: date }
    }
    if (mode === 'practice' && !saved.practiceDate && options.practiceDate) {
      saved = { ...saved, practiceDate: options.practiceDate }
    }
    if (!saved.difficulty) {
      saved = {
        ...saved,
        difficulty: mode === 'practice'
          ? getDailyRunForDate(options.practiceDate!)?.difficulty ?? DEFAULT_DIFFICULTY
          : options.difficulty ?? DEFAULT_DIFFICULTY,
      }
    }
    // Saves from before category selection are treated as All Categories.
    if (saved.category === undefined) {
      saved = { ...saved, category: ALL_CATEGORIES_ID }
    }
    if (!isSavedGame(saved, mode, options.practiceDate)) {
      throw new Error('The saved dive data is invalid.')
    }
    if (mode === 'daily') {
      getDailyQuestionsForDate(
        date,
        saved.difficulty ?? DEFAULT_DIFFICULTY,
        saved.category ?? ALL_CATEGORIES_ID,
        saved.questionIds,
        hasValidQuestionSnapshots(saved.questionSnapshots, saved.questionIds)
          ? saved.questionSnapshots
          : undefined,
      )
    }
    return { game: saved, error: null }
  } catch (error) {
    return {
      game: createGame(mode, options, Date.now(), reduceMotion),
      error: `${String(error)} A new dive has been started.`,
    }
  }
}

function advanceAfterFeedback(game: SavedGameState, now: number): SavedGameState {
  if (game.questionIndex + 1 >= GAME_QUESTION_COUNT) {
    return { ...game, phase: 'complete', feedbackDeadline: null }
  }
  return {
    ...game,
    questionIndex: game.questionIndex + 1,
    phase: 'playing',
    questionDeadline: now + QUESTION_TIME_SECONDS * 1000,
    feedbackDeadline: null,
    message: null,
  }
}

/** A possible misspelling waiting for the player to confirm ("Did you mean...?"). */
export interface PendingSuggestion {
  questionId: string
  typed: string
  /** Closest suggestion; also the default the player confirms. */
  answer: AcceptedAnswer
  /** Up to three candidate answers, closest first. */
  options: AcceptedAnswer[]
  ambiguous: boolean
  /** Wall-clock time the question clock was paused for this prompt. */
  pausedAt: number
}

export function useTriviaGame(mode: GameMode, options: TriviaGameOptions = {}) {
  const reduceMotion = useReducedMotionPreference()
  const reduceMotionRef = useRef(reduceMotion)
  reduceMotionRef.current = reduceMotion
  const [restored] = useState(() => restoreGame(mode, options, reduceMotion))
  const [game, setGame] = useState<SavedGameState>(() =>
    restored.game.introEndsAt !== undefined && restored.game.introEndsAt <= Date.now()
      ? { ...restored.game, introEndsAt: undefined }
      : restored.game,
  )
  const [persistenceError, setPersistenceError] = useState(restored.error)
  const [suggestion, setSuggestion] = useState<PendingSuggestion | null>(null)
  const [introOpen, setIntroOpen] = useState(() =>
    game.phase === 'playing' &&
    game.questionIndex === 0 &&
    game.results.length === 0 &&
    game.introEndsAt !== undefined,
  )
  const introOpenRef = useRef(introOpen)
  introOpenRef.current = introOpen
  const suggestionRef = useRef(suggestion)
  suggestionRef.current = suggestion
  /** Set when the player abandons the dive so nothing is persisted afterwards. */
  const exitedRef = useRef(false)

  const questions = useMemo(() => {
    if (hasValidQuestionSnapshots(game.questionSnapshots, game.questionIds)) {
      return game.questionSnapshots
    }
    return game.questionIds.map((id) => findQuestionById(id) ?? getLegacyQuestionPlaceholder(id))
  }, [game.questionIds, game.questionSnapshots])
  const question = questions[game.questionIndex]
  const score = calculateScore(game.results)

  useEffect(() => {
    if (exitedRef.current) return
    try {
      saveActiveGame(game)
    } catch (error) {
      setPersistenceError(String(error))
    }
  }, [game])

  // A pending suggestion never outlives its question (timer expiry, next question, restart).
  useEffect(() => {
    setSuggestion(null)
  }, [game.phase, game.questionIndex, game.runId])

  useEffect(() => {
    if (game.phase !== 'feedback' || game.feedbackDeadline === null) return
    const timeoutId = window.setTimeout(() => {
      setGame((current) =>
        current.phase === 'feedback' ? advanceAfterFeedback(current, Date.now()) : current,
      )
    }, Math.max(0, game.feedbackDeadline - Date.now()))
    return () => window.clearTimeout(timeoutId)
  }, [game.feedbackDeadline, game.phase])

  // Closes the cinematic intro when its wall-clock window ends (or on resume).
  useEffect(() => {
    if (!introOpen) return
    const introEndsAt = game.introEndsAt
    if (introEndsAt === undefined || introEndsAt <= Date.now()) {
      setIntroOpen(false)
      return
    }
    const timeoutId = window.setTimeout(() => {
      setIntroOpen(false)
      setGame((current) =>
        current.introEndsAt === undefined ? current : { ...current, introEndsAt: undefined },
      )
    }, introEndsAt - Date.now())
    return () => window.clearTimeout(timeoutId)
  }, [game.introEndsAt, introOpen])

  useEffect(() => {
    if (game.phase !== 'complete' || exitedRef.current) return
    try {
      const storedRun = saveRun({
        id: game.runId,
        mode: game.mode,
        date: new Date(game.startedAt).toISOString(),
        score,
        depthMeters: getDepthMeters(score),
        difficulty: game.difficulty ?? DEFAULT_DIFFICULTY,
        category: game.category ?? ALL_CATEGORIES_ID,
        results: game.results,
        questionIds: game.questionIds,
        questionSnapshots: questions,
        ...(game.dailyDate ? { dailyDate: game.dailyDate } : {}),
        ...(game.practiceDate ? { practiceDate: game.practiceDate } : {}),
      })
      if (storedRun.id !== game.runId) setGame(savedGameFromRun(storedRun))
    } catch (error) {
      setPersistenceError(String(error))
    }
  }, [game, score])

  /**
   * Records a correct answer exactly once. The guard inside the updater means a
   * second submission (double tap, Enter held down, answer racing the timer)
   * can never award points twice: only a game that is still `playing` on this
   * question, with time remaining, accepts it.
   */
  const commitCorrect = useCallback(
    (
      questionId: string,
      matched: AcceptedAnswer,
      given: string,
      corrected: AnswerResult['corrected'],
      /** Clock time spent paused in a suggestion prompt. */
      extensionMs = 0,
    ) => {
      const now = Date.now()
      const diveMs = getDiveDurationMs(matched.tier, reduceMotionRef.current)
      setGame((current) => {
        if (!canCommitAnswer(current, questionId, now, extensionMs)) return current
        const result: AnswerResult = {
          questionId,
          given,
          matched,
          points: matched.points,
          timedOut: false,
          ...(corrected ? { corrected } : {}),
        }
        return {
          ...current,
          questionDeadline: current.questionDeadline + extensionMs,
          results: [...current.results, result],
          phase: 'feedback',
          // The next question appears only after the dive sequence has played.
          feedbackDeadline: now + diveMs,
          message: null,
        }
      })
      setSuggestion(null)
    },
    [],
  )

  const submitAnswer = useCallback((value: string) => {
    if (introOpenRef.current) return
    // One decision at a time: while a suggestion awaits confirmation the input
    // is disabled and further submits are ignored.
    if (suggestionRef.current) return
    if (game.phase !== 'playing' || !question) return
    if (Date.now() >= game.questionDeadline) return

    const evaluation = evaluateAnswer(question, value)
    switch (evaluation.kind) {
      case 'exact':
        // Outcome A: accepted as typed.
        commitCorrect(question.id, evaluation.answer, value, undefined)
        return
      case 'typo':
        // Outcome B: unambiguous, high-confidence typo. Keeps the answer's own rarity.
        commitCorrect(question.id, evaluation.answer, value, 'auto')
        return
      case 'suggest':
        // Outcome C: ask first; no points until the player confirms. The
        // question clock pauses so deciding does not cost remaining time.
        setSuggestion({
          questionId: question.id,
          typed: value,
          answer: evaluation.answer,
          options: evaluation.options,
          ambiguous: evaluation.ambiguous,
          pausedAt: Date.now(),
        })
        setGame((current) =>
          current.phase === 'playing' ? { ...current, message: null } : current,
        )
        return
      default:
        setSuggestion(null)
        setGame((current) =>
          current.phase === 'playing'
            ? { ...current, message: `"${value}" is not accepted. Try another answer.` }
            : current,
        )
    }
  }, [commitCorrect, game.phase, game.questionDeadline, question])

  const confirmSuggestion = useCallback((chosen?: AcceptedAnswer) => {
    if (!suggestion) return
    const answer =
      chosen &&
      suggestion.options.some(
        (option) => option.text === chosen.text && option.tier === chosen.tier,
      )
        ? chosen
        : suggestion.answer
    commitCorrect(
      suggestion.questionId,
      answer,
      suggestion.typed,
      'confirmed',
      Math.max(0, Date.now() - suggestion.pausedAt),
    )
  }, [commitCorrect, suggestion])

  const dismissSuggestion = useCallback(() => {
    if (!suggestion) return
    const pausedFor = Math.max(0, Date.now() - suggestion.pausedAt)
    setSuggestion(null)
    setGame((current) =>
      current.phase === 'playing'
        ? {
            ...current,
            questionDeadline: current.questionDeadline + pausedFor,
            message: 'No problem — try another answer.',
          }
        : current,
    )
  }, [suggestion])

  /** Ends the dive early (the answer and depth are already recorded). */
  const skipDive = useCallback(() => {
    setGame((current) =>
      current.phase === 'feedback' ? { ...current, feedbackDeadline: Date.now() } : current,
    )
  }, [])

  const expireQuestion = useCallback(() => {
    setGame((current) => {
      if (current.phase !== 'playing') return current
      const result: AnswerResult = {
        questionId: current.questionIds[current.questionIndex],
        given: '',
        matched: null,
        points: 0,
        timedOut: true,
      }
      return {
        ...current,
        results: [...current.results, result],
        phase: 'feedback',
        feedbackDeadline: Date.now() + ANSWER_FEEDBACK_MS,
        message: null,
      }
    })
  }, [])

  /** Leaves the cinematic intro; skipping starts the question clock immediately. */
  const finishIntro = useCallback((skipped = false) => {
    setIntroOpen(false)
    if (!skipped) {
      setGame((current) =>
        current.introEndsAt === undefined ? current : { ...current, introEndsAt: undefined },
      )
      return
    }
    const now = Date.now()
    setGame((current) =>
      current.phase === 'playing' && current.questionIndex === 0
        ? {
            ...current,
            introEndsAt: undefined,
            questionDeadline: now + QUESTION_TIME_SECONDS * 1000,
          }
        : current,
    )
  }, [])

  const restart = useCallback(() => {
    try {
      if (mode === 'daily') {
        const completedRun = getDailyRunForDate(todayKey())
        if (completedRun) {
          setGame(savedGameFromRun(completedRun))
          setPersistenceError('Today’s Daily Dive is already complete. Review your result below.')
          return
        }
      }
      const nextGame = createGame(
        mode,
        {
          ...options,
          difficulty: options.difficulty ?? game.difficulty,
          category: options.category ?? game.category,
        },
        Date.now(),
        reduceMotionRef.current,
      )
      setGame(nextGame)
      setIntroOpen(nextGame.introEndsAt !== undefined && nextGame.introEndsAt > Date.now())
      setSuggestion(null)
      setPersistenceError(null)
    } catch (error) {
      setPersistenceError(String(error))
    }
  }, [game.difficulty, mode, options])

  /**
   * Abandons the current dive. The in-progress save is removed and no further
   * state (including a completion) can be persisted for it.
   */
  const exitGame = useCallback(() => {
    exitedRef.current = true
    setIntroOpen(false)
    setSuggestion(null)
    clearActiveGame(mode, options.practiceDate)
  }, [mode, options.practiceDate])

  return {
    game,
    difficulty: game.difficulty ?? DEFAULT_DIFFICULTY,
    question,
    questions,
    score,
    persistenceError,
    suggestion,
    introOpen,
    finishIntro,
    submitAnswer,
    confirmSuggestion,
    dismissSuggestion,
    skipDive,
    expireQuestion,
    restart,
    exitGame,
  }
}
