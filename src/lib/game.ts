import type { AnswerResult } from '@/types'

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
