import { useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Layers, SpellCheck, Waves, X } from 'lucide-react'
import GameHeader from './GameHeader'
import QuestionCard from './QuestionCard'
import AnswerInput from './AnswerInput'
import Timer from './Timer'
import ResultsScreen from './ResultsScreen'
import DiveIntro from './DiveIntro'
import GameMenu from './GameMenu'
import GameStage from '@/components/ocean/GameStage'
import PixelPanel from '@/components/ui/PixelPanel'
import PixelButton from '@/components/ui/PixelButton'
import { useDeadlineTimer } from '@/hooks/useDeadlineTimer'
import { useTriviaGame } from '@/hooks/useTriviaGame'
import { useOceanMotion } from '@/hooks/useOceanMotion'
import { useReducedMotionPreference } from '@/hooks/useReducedMotionPreference'
import { getDiveDurationMs, type DiveSpec } from '@/lib/dive'
import { getDifficulty } from '@/lib/difficulty'
import { ALL_CATEGORIES_ID, getCategoryLabel } from '@/lib/categories'
import { QUESTION_TIME_SECONDS } from '@/lib/gameConstants'
import { getTier } from '@/lib/rarity'
import { getDepthMeters } from '@/lib/depth'
import type { GameMode, QuestionDifficulty } from '@/types'

interface Props {
  mode: GameMode
  title: string
  blurb: string
  practiceDate?: string
  difficulty?: QuestionDifficulty
  /** Category group id chosen in the lobby; defaults to All Categories. */
  category?: string
  /** Ignore a completed saved run and begin a brand-new dive. */
  fresh?: boolean
  /** Overrides the built-in "Dive again" handler (e.g. return to the difficulty lobby). */
  onRestart?: () => void
  /** Where an abandoned dive returns to; defaults to the archive for practice. */
  onExit?: () => void
}

export default function GamePreview({
  mode,
  title,
  blurb,
  practiceDate,
  difficulty,
  category,
  fresh,
  onRestart,
  onExit,
}: Props) {
  const navigate = useNavigate()
  const options = useMemo(
    () => ({ practiceDate, difficulty, category, fresh }),
    [practiceDate, difficulty, category, fresh],
  )
  const {
    game,
    difficulty: activeDifficulty,
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
  } = useTriviaGame(mode, options)
  const reduceMotion = useReducedMotionPreference()
  const difficultyInfo = getDifficulty(activeDifficulty)
  const activeCategory = game.category ?? ALL_CATEGORIES_ID
  const categoryLabel = getCategoryLabel(activeCategory)
  /*
   * The dive is derived from saved game state, so it matches the points that
   * were actually awarded and resumes correctly after a refresh. Once the
   * feedback deadline passes (or the player skips) there is no dive.
   */
  const lastResult = game.phase === 'feedback' ? game.results[game.results.length - 1] : undefined
  const diveCache = useRef<DiveSpec | null>(null)
  const dive = useMemo<DiveSpec | null>(() => {
    if (!lastResult?.matched || game.feedbackDeadline === null || Date.now() >= game.feedbackDeadline) {
      return null
    }
    const key = `${game.runId}:${game.questionIndex}`
    if (diveCache.current?.key === key && diveCache.current.reduceMotion === reduceMotion) {
      return diveCache.current
    }
    const durationMs = getDiveDurationMs(lastResult.matched.tier, reduceMotion)
    const spec: DiveSpec = {
      key,
      tierId: lastResult.matched.tier,
      points: lastResult.points,
      fromScore: score - lastResult.points,
      toScore: score,
      startedAt: game.feedbackDeadline - durationMs,
      durationMs,
      reduceMotion,
    }
    diveCache.current = spec
    return spec
  }, [game.feedbackDeadline, game.questionIndex, game.runId, lastResult, reduceMotion, score])

  const ocean = useOceanMotion(dive ? dive.fromScore * 10 : score * 10)

  // Outside a dive the depth always equals score x 10 metres.
  useEffect(() => {
    if (!dive) ocean.depth.set(score * 10)
  }, [dive, ocean, score])

  const secondsLeft = useDeadlineTimer(
    game.questionDeadline,
    game.phase === 'playing',
    expireQuestion,
  )

  if (game.phase === 'complete') {
    return (
      <>
        {persistenceError && (
          <PixelPanel role="alert" className="mb-4 text-sm text-coral">
            {persistenceError}
          </PixelPanel>
        )}
        <ResultsScreen
          score={score}
          results={game.results}
          questions={questions}
          mode={mode}
          difficulty={activeDifficulty}
          category={activeCategory}
          onRestart={onRestart ?? (mode === 'daily' ? undefined : restart)}
          onClose={() => navigate(mode === 'practice' ? '/archive' : '/')}
        />
      </>
    )
  }

  if (!question) {
    return (
      <PixelPanel role="alert" className="text-sm text-coral">
        This saved dive does not have a valid question. Please refresh to start a new dive.
      </PixelPanel>
    )
  }

  const questionResult = game.results.find((result) => result.questionId === question.id)
  const matchedTier = questionResult?.matched ? getTier(questionResult.matched.tier) : null

  const exitToSelection = () => {
    exitGame()
    if (onExit) onExit()
    else navigate(mode === 'practice' ? '/archive' : '/')
  }

  return (
    <>
      <AnimatePresence>
        {introOpen && (
          <DiveIntro
            key={game.runId}
            mode={mode}
            difficulty={difficultyInfo.id}
            categoryLabel={categoryLabel}
            onSkip={() => finishIntro(true)}
          />
        )}
      </AnimatePresence>
      <div>
        <GameHeader
          title={title}
          score={score}
          backTo={mode === 'practice' ? '/archive' : '/'}
          motion={ocean}
          menu={<GameMenu onRestart={restart} onExit={exitToSelection} />}
        />
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span
            className={`pixel-text border border-white/20 bg-black/30 px-2 py-1 text-[8px] ${difficultyInfo.color}`}
          >
            {difficultyInfo.label}
          </span>
          <span className="pixel-text flex items-center gap-1 border border-white/20 bg-black/30 px-2 py-1 text-[8px] text-sonar">
            <Layers size={10} aria-hidden />
            {categoryLabel}
          </span>
          <span>{blurb}</span>
        </div>
        {persistenceError && (
          <PixelPanel role="alert" className="mb-4 text-sm text-coral">
            {persistenceError}
          </PixelPanel>
        )}

        <GameStage
          score={score}
          motion={ocean}
          dive={dive}
          diveAnswerText={questionResult?.matched?.text}
          diveTypedText={questionResult?.corrected ? questionResult.given : undefined}
          onSkipDive={skipDive}
          missKey={game.phase === 'feedback' && !questionResult?.matched ? game.questionIndex : undefined}
        >
          <Timer secondsLeft={secondsLeft} totalSeconds={QUESTION_TIME_SECONDS} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: dive ? 0 : 0.25 } }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <QuestionCard
                question={question}
                index={game.questionIndex}
                total={questions.length}
              />
              <AnswerInput
                onSubmit={submitAnswer}
                disabled={game.phase !== 'playing' || introOpen}
                autoFocus={!introOpen}
                placeholder="Type your answer..."
              />

            {game.message && game.phase === 'playing' && (
              <PixelPanel role="alert" className="flex items-center gap-2 text-sm text-coral">
                <AlertCircle size={18} aria-hidden />
                {game.message}
              </PixelPanel>
            )}

            {suggestion && game.phase === 'playing' && (
              <PixelPanel role="group" aria-label="Spelling suggestion" className="space-y-3 text-sm">
                <p className="flex items-start gap-2 text-sky-300">
                  <SpellCheck className="mt-0.5 shrink-0" size={18} aria-hidden />
                  <span>
                    {suggestion.ambiguous ? 'Not sure what you meant. ' : 'Close! '}
                    Did you mean{' '}
                    <strong className="text-white">“{suggestion.answer.text}”</strong>?
                  </span>
                </p>
                <p className="text-xs text-slate-300">
                  You typed “{suggestion.typed}”. No points are awarded unless you confirm.
                </p>
                <div className="flex flex-wrap gap-2">
                  <PixelButton onClick={confirmSuggestion} icon={<Check size={14} />}>
                    Yes, that&apos;s it
                  </PixelButton>
                  <PixelButton variant="secondary" onClick={dismissSuggestion} icon={<X size={14} />}>
                    No
                  </PixelButton>
                </div>
              </PixelPanel>
            )}

            {game.phase === 'feedback' && questionResult?.matched && (
              <p role="status" aria-live="polite" className="sr-only">
                Correct, {questionResult.matched.text}. {matchedTier?.label}, plus {questionResult.points} points.
                Now at {getDepthMeters(score).toLocaleString()} metres.
              </p>
            )}

            {game.phase === 'feedback' && !questionResult?.matched && (
              <PixelPanel
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 text-sm text-coral"
              >
                <Waves className="mt-0.5 shrink-0" size={18} aria-hidden />
                <div>
                  <p className="font-semibold">
                    {questionResult?.timedOut ? "Time's up — unanswered" : 'Not quite'}
                  </p>
                  <p className="mt-1">+0 points · {score} total</p>
                  <p className="mt-2 text-xs text-slate-300">Preparing your next descent...</p>
                </div>
              </PixelPanel>
            )}
            </motion.div>
          </AnimatePresence>
        </GameStage>
      </div>
    </>
  )
}
