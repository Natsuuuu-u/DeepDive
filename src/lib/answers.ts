import type { AcceptedAnswer, Question } from '@/types'
import { QUESTION_DATABASE } from '@/data/questionDatabase'

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/* -------------------------------------------------------------------------- */
/* Matching keys                                                              */
/* -------------------------------------------------------------------------- */

const WORD_VARIANTS: Record<string, string> = {
  st: 'saint',
  mt: 'mount',
}

/**
 * Normalised comparison key. On top of `normalize` it handles apostrophes
 * (O'Brien -> obrien), "&" -> "and", and common abbreviations (St -> Saint).
 */
export function matchKey(input: string): string {
  return normalize(input.replace(/&/g, ' and ').replace(/['’`]/g, ''))
    .split(' ')
    .map((word) => WORD_VARIANTS[word] ?? word)
    .join(' ')
}

/** Key with all whitespace removed, so "San Marino" === "sanmarino". */
function compactKey(input: string): string {
  return matchKey(input).replace(/\s+/g, '')
}

/* -------------------------------------------------------------------------- */
/* Edit distance                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Damerau-Levenshtein distance (optimal string alignment): insertions,
 * deletions, substitutions and adjacent transpositions each cost 1, so
 * "Switzerlnad" is one edit from "Switzerland".
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (la === 0) return lb
  if (lb === 0) return la

  let prev2: number[] = new Array(lb + 1).fill(0)
  let prev: number[] = Array.from({ length: lb + 1 }, (_, j) => j)
  let curr: number[] = new Array(lb + 1).fill(0)

  for (let i = 1; i <= la; i++) {
    curr[0] = i
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prev2[j - 2] + 1)
      }
      curr[j] = value
    }
    ;[prev2, prev, curr] = [prev, curr, prev2]
  }
  return prev[lb]
}

/* -------------------------------------------------------------------------- */
/* Thresholds                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Largest edit distance accepted automatically, by length of the accepted
 * answer (spaces ignored). Short answers are stricter: four letters or fewer
 * must match exactly because one edit usually produces a different real word
 * (Iran/Iraq, Mali/Malawi, Chad/Chag).
 */
export function autoAcceptDistance(length: number): number {
  if (length <= 4) return 0
  if (length <= 9) return 1
  if (length <= 14) return 2
  return 3
}

/** Largest distance for which we still offer a "Did you mean...?" prompt. */
export function suggestDistance(length: number): number {
  if (length <= 4) return 0
  if (length <= 6) return 1
  if (length <= 9) return 2
  if (length <= 14) return 3
  return 4
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

export type AnswerEvaluation =
  /** Outcome A: exact or alias match (case, spacing, punctuation ignored). */
  | { kind: 'exact'; answer: AcceptedAnswer }
  /** Outcome B: unambiguous, high-confidence typo. Accepted automatically. */
  | { kind: 'typo'; answer: AcceptedAnswer; distance: number }
  /** Outcome C: possible typo. The player must confirm before points are awarded. */
  | { kind: 'suggest'; answer: AcceptedAnswer; distance: number; ambiguous: boolean }
  /** Not related to any accepted answer. */
  | { kind: 'none' }

interface Candidate {
  answer: AcceptedAnswer
  compact: string
}

function buildCandidates(question: Question): Candidate[] {
  const candidates: Candidate[] = []
  for (const answer of question.answers) {
    for (const variant of [answer.text, ...(answer.aliases ?? [])]) {
      const compact = compactKey(variant)
      if (compact) candidates.push({ answer, compact })
    }
  }
  return candidates
}

let knownAnswerKeys: Set<string> | null = null

/**
 * Every answer or alias that is a legitimate answer to *some* question.
 * If the player types one of these it is a real, different answer, not a typo,
 * so it must never be fuzzy-matched onto this question's answers
 * (e.g. "Austria" for an Australia answer, "Niger" for "Nigeria").
 */
function getKnownAnswerKeys(): Set<string> {
  if (knownAnswerKeys) return knownAnswerKeys
  const keys = new Set<string>()
  for (const question of QUESTION_DATABASE) {
    for (const answer of question.answers) {
      for (const variant of [answer.text, ...(answer.aliases ?? [])]) {
        const compact = compactKey(variant)
        if (compact) keys.add(compact)
      }
    }
  }
  knownAnswerKeys = keys
  return keys
}

/** Exposed for tests: forget the cached known-answer index. */
export function resetKnownAnswerCache(): void {
  knownAnswerKeys = null
}

interface Scored {
  answer: AcceptedAnswer
  distance: number
  length: number
  firstLetterMatches: boolean
  lengthGap: number
}

export function evaluateAnswer(question: Question, input: string): AnswerEvaluation {
  const typed = compactKey(input)
  if (!typed) return { kind: 'none' }

  const candidates = buildCandidates(question)

  // Outcome A: exact / alias match after normalisation.
  for (const candidate of candidates) {
    if (candidate.compact === typed) return { kind: 'exact', answer: candidate.answer }
  }

  // Numbers (years, counts) are never fuzzy-matched: 1969 and 1970 are different answers.
  if (/\d/.test(typed)) return { kind: 'none' }

  // A different legitimate answer, not a typo.
  if (getKnownAnswerKeys().has(typed)) return { kind: 'none' }

  // Best score per accepted answer (across its text and aliases).
  const best = new Map<AcceptedAnswer, Scored>()
  for (const candidate of candidates) {
    if (/\d/.test(candidate.compact)) continue
    const length = candidate.compact.length
    const maxDistance = suggestDistance(length)
    if (maxDistance === 0) continue
    if (Math.abs(length - typed.length) > maxDistance) continue

    const distance = editDistance(typed, candidate.compact)
    if (distance === 0 || distance > maxDistance) continue

    const scored: Scored = {
      answer: candidate.answer,
      distance,
      length,
      firstLetterMatches: typed[0] === candidate.compact[0],
      lengthGap: Math.abs(length - typed.length),
    }
    const existing = best.get(candidate.answer)
    if (!existing || distance < existing.distance) best.set(candidate.answer, scored)
  }

  const ranked = [...best.values()].sort(
    (a, b) => a.distance - b.distance || a.lengthGap - b.lengthGap,
  )
  if (ranked.length === 0) return { kind: 'none' }

  const top = ranked[0]
  const runnerUp = ranked[1]
  const ambiguous = runnerUp !== undefined && runnerUp.distance <= top.distance

  // Outcome B only when one answer is clearly the closest, the edit count is
  // within the strict automatic limit, and the first letter agrees.
  if (
    !ambiguous &&
    top.firstLetterMatches &&
    top.distance <= autoAcceptDistance(top.length)
  ) {
    return { kind: 'typo', answer: top.answer, distance: top.distance }
  }

  // Outcome C: looks like a typo but we are not sure enough. Ask the player.
  return { kind: 'suggest', answer: top.answer, distance: top.distance, ambiguous }
}

/** Exact match only (kept for existing callers). Typos are handled by `evaluateAnswer`. */
export function matchAnswer(question: Question, input: string): AcceptedAnswer | null {
  const result = evaluateAnswer(question, input)
  return result.kind === 'exact' ? result.answer : null
}
