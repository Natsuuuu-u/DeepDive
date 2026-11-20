import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Check, Copy, RotateCcw, Share2, X } from 'lucide-react'
import PixelButton from '@/components/ui/PixelButton'
import PixelPanel from '@/components/ui/PixelPanel'
import GameStage from '@/components/ocean/GameStage'
import DepthIndicator from '@/components/ocean/DepthIndicator'
import { getDepthMeters, getZone } from '@/lib/depth'
import { countCorrectAnswers, countUnanswered } from '@/lib/game'
import { GAME_QUESTION_COUNT } from '@/lib/gameConstants'
import { getHighestRarity, RARITY_ORDER } from '@/lib/progression'
import { getAcceptedAnswersAfterGame } from '@/lib/questions'
import { getDifficulty } from '@/lib/difficulty'
import { getCategoryLabel } from '@/lib/categories'
import { getTier } from '@/lib/rarity'
import type { AnswerResult, GameMode, Question, QuestionDifficulty, RarityTierId } from '@/types'

interface Props {
  score: number
  results: AnswerResult[]
  questions: Question[]
  mode?: GameMode
  difficulty?: QuestionDifficulty
  category?: string
  onRestart?: () => void
  onClose?: () => void
}

function createShareText(
  mode: GameMode,
  score: number,
  correct: number,
  bestRarity: RarityTierId | null,
  difficultyLabel: string,
  categoryLabel: string,
): string {
  const rarity = bestRarity ? getTier(bestRarity).label : 'None'
  const title = mode === 'daily'
    ? 'MY DAILY DIVE'
    : mode === 'practice'
      ? 'MY ARCHIVE PRACTICE DIVE'
      : 'MY UNLIMITED DIVE'
  return [
    title,
    '',
    `Score: ${score}/${GAME_QUESTION_COUNT * 100}`,
    `Depth: ${getDepthMeters(score).toLocaleString()}m`,
    `Ocean Zone: ${getZone(score).name}`,
    `Difficulty: ${difficultyLabel}`,
    `Category: ${categoryLabel}`,
    `Correct Answers: ${correct}/${GAME_QUESTION_COUNT}`,
    `Best Rarity: ${rarity}`,
  ].join('\n')
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(field)
  if (!copied) throw new Error('Clipboard access is unavailable in this browser.')
}

export default function ResultsScreen({
  score,
  results,
  questions,
  mode = 'unlimited',
  difficulty,
  category,
  onRestart,
  onClose,
}: Props) {
  const [shareStatus, setShareStatus] = useState('')
  const zone = getZone(score)
  const difficultyInfo = getDifficulty(difficulty)
  const categoryLabel = getCategoryLabel(category)
  const correct = countCorrectAnswers(results)
  const unanswered = countUnanswered(results)
  const highestTier = getHighestRarity(results)
  const averagePoints = score / GAME_QUESTION_COUNT
  const shareText = useMemo(
    () => createShareText(mode, score, correct, highestTier, difficultyInfo.label, categoryLabel),
    [mode, score, correct, highestTier, difficultyInfo.label, categoryLabel],
  )

  const handleCopy = async () => {
    try {
      await copyText(shareText)
      setShareStatus('Result copied to clipboard.')
    } catch (error) {
      setShareStatus(`Could not copy the result: ${String(error)}`)
    }
  }

  const handleNativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title: 'Deep Dive Trivia', text: shareText })
      setShareStatus('Result shared.')
    } catch (error) {
      setShareStatus(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Sharing was cancelled.'
          : `Could not share the result: ${String(error)}`,
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <GameStage score={score} finalDescent scene={false}>
        <div className="relative flex min-h-[300px] flex-col justify-center sm:min-h-[430px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,8,16,0.6),transparent_72%)]"
          />
          <div className="relative text-center">
            <motion.div
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.7, stiffness: 160, damping: 12 }}
              className="mb-4 inline-flex rounded-full border border-gold/50 bg-black/30 p-4 text-gold"
            >
              <Award size={28} aria-hidden />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="pixel-text text-sm text-gold"
            >
              Dive complete
            </motion.h2>
            <p className="pixel-text mt-4 text-2xl text-white">
              {score} <span className="text-sm text-slate-300">/ {GAME_QUESTION_COUNT * 100}</span>
            </p>
            <p className="mt-2 text-sm text-slate-200">
              Final depth: {getDepthMeters(score).toLocaleString()}m · {zone.name}
            </p>
            <p className="mt-2 text-xs text-slate-300">
              {correct}/{GAME_QUESTION_COUNT} correct · {unanswered} unanswered
            </p>
            <p className={`pixel-text mt-3 text-[8px] ${difficultyInfo.color}`}>
              {difficultyInfo.label} difficulty
            </p>
            <p className="pixel-text mt-2 text-[8px] text-sonar">{categoryLabel}</p>
          </div>
        </div>
        <DepthIndicator score={score} variant="compact" className="absolute bottom-3 left-3 bg-black/30 px-2 py-1" />
      </GameStage>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Final score', value: `${score} / 700` },
          { label: 'Final depth', value: `${getDepthMeters(score).toLocaleString()}m` },
          { label: 'Best rarity', value: highestTier ? getTier(highestTier).label : '—' },
          { label: 'Average / question', value: `${averagePoints.toFixed(1)} pts` },
        ].map((item) => (
          <PixelPanel key={item.label} className="p-3 sm:p-4">
            <p className="pixel-text text-[9px] leading-relaxed text-slate-400">{item.label}</p>
            <p className="pixel-text mt-3 break-words text-[10px] leading-relaxed text-gold">{item.value}</p>
          </PixelPanel>
        ))}
      </div>

      <PixelPanel>
        <h3 className="pixel-text text-[10px] text-sonar">Share this dive</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PixelButton onClick={handleCopy} icon={<Copy size={14} />} className="w-full sm:w-auto">Copy result</PixelButton>
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <PixelButton variant="secondary" onClick={handleNativeShare} icon={<Share2 size={14} />} className="w-full sm:w-auto">
              Share
            </PixelButton>
          )}
        </div>
        <p aria-live="polite" className="mt-2 min-h-4 text-xs text-slate-300">{shareStatus}</p>
      </PixelPanel>

      <PixelPanel>
        <h3 className="pixel-text mb-3 text-[10px] text-sonar">Question review</h3>
        <ol className="space-y-3">
          {results.map((result, index) => {
            const question = questions.find((item) => item.id === result.questionId)
            const tier = result.matched ? getTier(result.matched.tier) : null
            const acceptedAnswers = question?.answers.length
              ? question.answers
              : getAcceptedAnswersAfterGame(result.questionId)
            const groups = RARITY_ORDER.map((rarity) => ({
              rarity,
              tier: getTier(rarity),
              answers: acceptedAnswers.filter((answer) => answer.tier === rarity),
            })).filter((group) => group.answers.length > 0)
            return (
              <li
                key={`${result.questionId}-${index}`}
                className="border-t border-white/10 pt-3"
              >
                <div className="flex items-start gap-3">
                  {result.matched ? (
                    <Check className="mt-0.5 shrink-0 text-kelp" size={18} aria-label="Correct" />
                  ) : (
                    <X className="mt-0.5 shrink-0 text-coral" size={18} aria-label="Incorrect or unanswered" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="pixel-text text-[8px] text-gold">
                      {index + 1}/{GAME_QUESTION_COUNT} · {question?.category ?? 'Question'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {question?.prompt ?? 'Question no longer available'}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-300">
                      Your answer: {result.timedOut ? 'Unanswered (time ran out)' : result.given || 'No answer'}
                      {result.corrected && result.matched ? (
                        <span className="text-sky-300"> (spelling corrected to {result.matched.text})</span>
                      ) : null}
                    </p>
                    {tier ? (
                      <p className={`mt-1 text-xs ${tier.color}`}>
                        Correct · {tier.label} · +{result.points} points
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-coral">
                        {result.timedOut ? 'Unanswered' : 'Incorrect'} · no points earned
                      </p>
                    )}
                    {question?.fact && (
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        <span className="text-slate-300">Deep-sea fact:</span> {question.fact}
                      </p>
                    )}
                    <details className="mt-3">
                      <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-xs text-sonar">
                        Reveal accepted answers
                      </summary>
                      <div className="mt-3 space-y-3">
                        {groups.length ? groups.map((group) => (
                          <div key={group.rarity}>
                            <p className={`pixel-text text-[8px] ${group.tier.color}`}>
                              {group.tier.label} · {group.tier.points} pts
                            </p>
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {group.answers.map((answer) => (
                                <li
                                  key={`${group.rarity}-${answer.text}`}
                                  className={`break-words border border-white/10 bg-white/5 px-2 py-1 text-xs ${group.tier.color}`}
                                >
                                  {answer.text}
                                  {answer.aliases?.length ? ` · ${answer.aliases.join(' / ')}` : ''}
                                  <span className="ml-1 text-slate-300">+{answer.points}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )) : (
                          <p className="text-xs text-slate-400">
                            Accepted answers were not retained for this legacy game.
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="pixel-text text-[9px] text-white">+{result.points}</p>
                    {tier && <p className={`mt-2 pixel-text text-[8px] ${tier.color}`}>{tier.label}</p>}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </PixelPanel>

      <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        {onRestart && (
          <PixelButton onClick={onRestart} icon={<RotateCcw size={14} />} className="w-full sm:w-auto">Dive again</PixelButton>
        )}
        {onClose && <PixelButton variant="secondary" onClick={onClose} className="w-full sm:w-auto">Close</PixelButton>}
      </div>
    </motion.div>
  )
}
