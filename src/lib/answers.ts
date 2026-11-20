import type { AcceptedAnswer, Question } from '@/types'
import { QUESTION_DATABASE } from '@/data/questionDatabase'
import { COMMON_WORDS } from '@/lib/commonWords'

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

const WORD_VARIANTS: Record<string, string> = {
  st: 'saint',
  mt: 'mount',
  dr: 'doctor',
}

/**
 * Abbreviations that stand for a whole answer. Applied only when the complete
 * input is the abbreviation, so "US" becomes "United States" but an answer
 * that merely contains the letters is left alone.
 */
const WHOLE_ABBREVIATIONS: Record<string, string> = {
  us: 'unitedstates',
  usa: 'unitedstates',
  uk: 'unitedkingdom',
  uae: 'unitedarabemirates',
  prc: 'peoplesrepublicofchina',
  drc: 'democraticrepublicofthecongo',
}

const IRREGULAR_SINGULARS: Record<string, string> = {
  mice: 'mouse',
  geese: 'goose',
  teeth: 'tooth',
  feet: 'foot',
  children: 'child',
  people: 'person',
  men: 'man',
  women: 'woman',
  oxen: 'ox',
  octopi: 'octopus',
  cacti: 'cactus',
  fungi: 'fungus',
  nuclei: 'nucleus',
  alumni: 'alumnus',
  larvae: 'larva',
  algae: 'alga',
  wolves: 'wolf',
  calves: 'calf',
  halves: 'half',
  knives: 'knife',
  leaves: 'leaf',
  lives: 'life',
  loaves: 'loaf',
  scarves: 'scarf',
  shelves: 'shelf',
  thieves: 'thief',
  wives: 'wife',
  elves: 'elf',
  selves: 'self',
  analyses: 'analysis',
  theses: 'thesis',
  crises: 'crisis',
  diagnoses: 'diagnosis',
  hypotheses: 'hypothesis',
  parentheses: 'parenthesis',
  oases: 'oasis',
}

/**
 * Lowercase, strip accents and punctuation, and drop filler articles.
 * "The" is never meaningful inside an answer, but a lone "a"/"an" can be
 * ("Linear A", "Vitamin A"), so those are removed only at the start.
 */
export function normalize(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Apostrophes join the word ("O'Brien" -> "obrien"); other punctuation separates.
    .replace(/['’`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = cleaned.split(' ').filter((word) => word !== 'the')
  while (words.length > 0 && (words[0] === 'a' || words[0] === 'an')) words.shift()
  return words.join(' ')
}

/**
 * Normalised comparison key. On top of `normalize` it expands common
 * abbreviations (St -> Saint) so "St. Petersburg" and "Saint Petersburg" agree.
 */
export function matchKey(input: string): string {
  return normalize(input)
    .split(' ')
    .map((word) => WORD_VARIANTS[word] ?? word)
    .join(' ')
}

function compact(value: string): string {
  return value.replace(/\s+/g, '')
}

function singularizeToken(token: string): string | null {
  const irregular = IRREGULAR_SINGULARS[token]
  if (irregular) return irregular
  if (token.length > 3 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 4 && token.endsWith('es')) {
    const stem = token.slice(0, -2)
    if (/(?:s|x|z|ch|sh|o)$/.test(stem)) return stem
  }
  // Leave Latin/Greek endings (Venus, Paris, glass) alone; those are not plurals.
  if (token.length > 3 && token.endsWith('s') && !/(?:ss|us|is)$/.test(token)) {
    return token.slice(0, -1)
  }
  return null
}

/** A spaced key plus its singular form, both compacted for comparison. */
function keyVariants(input: string): string[] {
  return keyVariantsFromKey(matchKey(input))
}

function keyVariantsFromKey(key: string): string[] {
  if (!key) return []
  const words = key.split(' ').filter(Boolean)
  const base = words.join('')
  const variants = new Set<string>([base])

  const last = words[words.length - 1]
  const singular = singularizeToken(last)
  if (singular && singular !== last) {
    variants.add([...words.slice(0, -1), singular].join(''))
  }
  if (WHOLE_ABBREVIATIONS[base]) variants.add(WHOLE_ABBREVIATIONS[base])
  // "United States of America" and "United States" are the same country.
  if (base.startsWith('unitedstatesofamerica')) {
    variants.add(`unitedstates${base.slice('unitedstatesofamerica'.length)}`)
  }
  return [...variants]
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
 * Largest edit distance accepted automatically, by length of the matched
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

/**
 * Largest distance for which we still offer a "Did you mean...?" prompt.
 * Two-letter answers stay exact-only: one edit is half the word, so "In" or
 * "No" would collide with unrelated short answers. Three- and four-letter
 * answers may suggest a single edit, but `evaluateAnswer` additionally
 * requires the first letter to agree (or the input to be a real answer
 * elsewhere) and still never accepts them without confirmation.
 */
export function suggestDistance(length: number): number {
  if (length <= 2) return 0
  if (length <= 4) return 1
  if (length <= 6) return 1
  if (length <= 9) return 2
  if (length <= 14) return 3
  return 4
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

export type AnswerEvaluation =
  /** Outcome A: exact or alias match (case, spacing, punctuation and plurals ignored). */
  | { kind: 'exact'; answer: AcceptedAnswer }
  /** Outcome B: unambiguous, high-confidence typo. Accepted automatically. */
  | { kind: 'typo'; answer: AcceptedAnswer; distance: number }
  /**
   * Outcome C: possible typo. The player must confirm one of `options` before
   * points are awarded. `answer` is the closest option.
   */
  | {
      kind: 'suggest'
      answer: AcceptedAnswer
      options: AcceptedAnswer[]
      distance: number
      ambiguous: boolean
    }
  /** Not related to any accepted answer. */
  | { kind: 'none' }

interface Candidate {
  answer: AcceptedAnswer
  /** Spaced normalised form, used for word-aware safety checks. */
  key: string
  /** Every compact form that counts as an exact match for this variant. */
  keys: string[]
}

const candidateCache = new WeakMap<Question, Candidate[]>()

function buildCandidates(question: Question): Candidate[] {
  const cached = candidateCache.get(question)
  if (cached) return cached
  const candidates: Candidate[] = []
  for (const answer of question.answers) {
    for (const variant of [answer.text, ...(answer.aliases ?? [])]) {
      const key = matchKey(variant)
      const keys = keyVariantsFromKey(key)
      if (key && keys.length > 0) candidates.push({ answer, key, keys })
    }
  }
  candidateCache.set(question, candidates)
  return candidates
}

let knownAnswerKeys: Set<string> | null = null

/**
 * Every answer or alias that is a legitimate answer to *some* question,
 * including plural and abbreviation forms. If the player types one of these
 * it is a real, different answer, not a typo, so it must never be
 * fuzzy-matched onto this question's answers (e.g. "Austria" for an Australia
 * answer, "Niger" for "Nigeria", "Whale" for "Shark").
 */
function getKnownAnswerKeys(): Set<string> {
  if (knownAnswerKeys) return knownAnswerKeys
  const keys = new Set<string>()
  for (const question of QUESTION_DATABASE) {
    for (const answer of question.answers) {
      for (const variant of [answer.text, ...(answer.aliases ?? [])]) {
        for (const key of keyVariants(variant)) keys.add(key)
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
  /** Length of the answer key the distance was measured against. */
  keyLength: number
  /** Words of the answer key that matched best. */
  answerKey: string
  firstLetterMatches: boolean
  lengthGap: number
  /** The typed answer contains a common word the answer does not. */
  commonWordConflict: boolean
  order: number
}

/** True when a word is a standalone, real English word (or a plural of one). */
function isCommonWord(word: string): boolean {
  if (COMMON_WORDS.has(word)) return true
  const singular = singularizeToken(word)
  return singular !== null && COMMON_WORDS.has(singular)
}

/**
 * Reject automatic corrections where the player typed a real word that is not
 * part of the answer ("while" -> "whale", "great white sharp" -> shark).
 * The suggestion prompt can still offer the answer; only free points are blocked.
 */
function hasCommonWordConflict(typedKey: string, answerKey: string): boolean {
  const answerWords = new Set(answerKey.split(' ').filter(Boolean))
  for (const word of answerWords) {
    const singular = singularizeToken(word)
    if (singular) answerWords.add(singular)
  }
  return typedKey
    .split(' ')
    .filter(Boolean)
    .some((word) => {
      if (answerWords.has(word)) return false
      const singular = singularizeToken(word)
      if (singular && answerWords.has(singular)) return false
      return isCommonWord(word)
    })
}

export function evaluateAnswer(question: Question, input: string): AnswerEvaluation {
  const typedKey = matchKey(input)
  if (!typedKey) return { kind: 'none' }
  const typedKeys = keyVariantsFromKey(typedKey)
  if (typedKeys.length === 0) return { kind: 'none' }
  const typedSet = new Set(typedKeys)
  const typedBase = compact(typedKey)

  const candidates = buildCandidates(question)

  // Outcome A: exact / alias match after normalisation. A literal match wins;
  // otherwise plural or abbreviation forms may still be exact. If those point
  // at two different answers, ask instead of guessing.
  const literal = candidates.find((candidate) => compact(candidate.key) === typedBase)
  if (literal) return { kind: 'exact', answer: literal.answer }

  const variantMatches = candidates.filter((candidate) =>
    candidate.keys.some((key) => typedSet.has(key)),
  )
  const distinctMatches = [
    ...new Map(variantMatches.map((candidate) => [candidate.answer, candidate])).values(),
  ]
  if (distinctMatches.length === 1) {
    return { kind: 'exact', answer: distinctMatches[0].answer }
  }
  if (distinctMatches.length > 1) {
    return {
      kind: 'suggest',
      answer: distinctMatches[0].answer,
      options: distinctMatches.map((candidate) => candidate.answer),
      distance: 0,
      ambiguous: true,
    }
  }

  // Numbers (years, counts) are never fuzzy-matched: 1969 and 1970 are different answers.
  if (/\d/.test(typedBase)) return { kind: 'none' }

  /*
   * A typed answer that is legitimate for *some* question must never be
   * auto-corrected onto this one ("Chile" is not a typo for "Child").
   * It may still earn a clarification prompt when it is a single edit from
   * this question's answer (e.g. "Cat" on a question that wants "Bat");
   * the player has to confirm before any points are awarded.
   */
  const typedIsKnownAnswer = typedKeys.some((key) => getKnownAnswerKeys().has(key))

  // Best score per accepted answer (across its text and aliases).
  const best = new Map<AcceptedAnswer, Scored>()
  let order = 0
  for (const candidate of candidates) {
    for (const key of candidate.keys) {
      if (/\d/.test(key)) continue
      const length = key.length
      const maxDistance = suggestDistance(length)
      if (maxDistance === 0) continue
      if (Math.abs(length - typedBase.length) > maxDistance) continue

      for (const typedVariant of typedKeys) {
        const distance = editDistance(typedVariant, key)
        if (distance === 0 || distance > maxDistance) continue
        const firstLetterMatches = typedBase[0] === key[0]
        /*
         * Short answers are collision-prone, so only a typo that keeps the
         * first letter is plausible ("Bta" for "Bat"); otherwise the typed
         * text must itself be a real answer elsewhere (the clarification
         * case). Longer answers already pass the length-scaled threshold.
         */
        if (length <= 4 && !firstLetterMatches && !typedIsKnownAnswer) continue
        // A different legitimate answer only gets a clarification when it is
        // a single edit away; two edits mean the player typed another answer.
        if (typedIsKnownAnswer && distance > 1) continue
        const scored: Scored = {
          answer: candidate.answer,
          distance,
          keyLength: length,
          answerKey: candidate.key,
          firstLetterMatches,
          lengthGap: Math.abs(length - typedBase.length),
          commonWordConflict: hasCommonWordConflict(typedKey, candidate.key),
          order: order++,
        }
        const existing = best.get(candidate.answer)
        if (!existing || distance < existing.distance) best.set(candidate.answer, scored)
      }
    }
  }

  const ranked = [...best.values()].sort(
    (a, b) =>
      a.distance - b.distance ||
      Number(b.firstLetterMatches) - Number(a.firstLetterMatches) ||
      a.lengthGap - b.lengthGap ||
      a.order - b.order,
  )
  if (ranked.length === 0) return { kind: 'none' }

  const top = ranked[0]
  const ambiguous = ranked.some(
    (candidate) => candidate.answer !== top.answer && candidate.distance === top.distance,
  )

  // Outcome B only when one answer is clearly the closest, the edit count is
  // within the strict automatic limit, the first letter agrees, and the typed
  // text is neither a real word of its own nor a legitimate answer elsewhere.
  if (
    !ambiguous &&
    top.firstLetterMatches &&
    !top.commonWordConflict &&
    !typedIsKnownAnswer &&
    top.distance <= autoAcceptDistance(top.keyLength)
  ) {
    return { kind: 'typo', answer: top.answer, distance: top.distance }
  }

  // Outcome C: looks like a typo but we are not sure enough. Ask the player,
  // offering the closest answers (never awarding points before confirmation).
  const options = ranked
    .filter((candidate) => candidate.distance <= top.distance + 1)
    .map((candidate) => candidate.answer)
    .slice(0, 3)
  return {
    kind: 'suggest',
    answer: top.answer,
    options,
    distance: top.distance,
    ambiguous,
  }
}

/** Exact match only (kept for existing callers). Typos are handled by `evaluateAnswer`. */
export function matchAnswer(question: Question, input: string): AcceptedAnswer | null {
  const result = evaluateAnswer(question, input)
  return result.kind === 'exact' ? result.answer : null
}
