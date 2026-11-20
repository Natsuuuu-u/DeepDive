import type { AnswerResult, SavedGameState } from '@/types'

/**
 * A correct answer may only be recorded once, while its question is live.
 * `extensionMs` accounts for time spent in a paused "Did you mean...?" prompt.
 */
export function canCommitAnswer(
  game: Pick<SavedGameState, 'phase' | 'questionIds' | 'questionIndex' | 'questionDeadline'>,
  questionId: string,
  now: number,
  extensionMs = 0,
): boolean {
  return (
    game.phase === 'playing' &&
    game.questionIds[game.questionIndex] === questionId &&
    now < game.questionDeadline + extensionMs
  )
}

export function calculateScore(results: AnswerResult[]): number {
  return results.reduce((total, result) => {
    if (!result.matched) return total
    return total + result.matched.points
  }, 0)
}

export function countCorrectAnswers(results: AnswerResult[]): number {
  return results.filter((result) => result.matched !== null).length
}

export function countUnanswered(results: AnswerResult[]): number {
  return results.filter((result) => result.timedOut).length
}
