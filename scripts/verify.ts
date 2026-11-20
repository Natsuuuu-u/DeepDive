/* Logic checks for spelling correction, difficulty, dive math and ocean blending.  Run: npm run verify */
import { readFileSync } from 'node:fs'
import { QUESTION_DATABASE } from '../src/data/questionDatabase'
import { editDistance, evaluateAnswer, matchKey, normalize } from '../src/lib/answers'
import { canCommitAnswer } from '../src/lib/game'
import {
  ALL_CATEGORIES_ID,
  CATEGORY_GROUPS,
  getCategoryLabel,
  normalizeCategoryId,
} from '../src/lib/categories'
import { DEFAULT_DIFFICULTY, DIFFICULTIES, getDifficultyLabel, isQuestionDifficulty } from '../src/lib/difficulty'
import { DIVE_TIERS, getDiveDurationMs, getDiveFrame, type DiveSpec } from '../src/lib/dive'
import { getIntroDurationMs, INTRO_EXIT_MS, REDUCED_INTRO_DURATION_MS, INTRO_DURATION_MS } from '../src/lib/intro'
import { getZoneWeights } from '../src/lib/ocean'
import {
  DIFFICULTY_QUESTION_WEIGHTS,
  findDuplicateAnswers,
  findDuplicateQuestions,
  getDailyQuestions,
  getDifficultyQuestionPool,
  getDifficultyQuestionPoolSize,
  getSevenUniqueQuestions,
  isCategoryPlayable,
  QUESTION_DATA_VALIDATION,
  validateQuestionData,
} from '../src/lib/questions'
import { RARITY_TIERS } from '../src/lib/rarity'
import type { Question, QuestionDifficulty } from '../src/types'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`)
}
const byPrompt = (p: string): Question => QUESTION_DATABASE.find((q) => q.prompt === p)!
const europe = byPrompt('Name a country in Europe.')
const africa = byPrompt('Name a country in Africa.')
const kind = (q: Question, s: string) => evaluateAnswer(q, s).kind

// --- edit distance
check('distance: transposition costs 1', editDistance('switzerlnad', 'switzerland') === 1)
check('distance: insert/delete/substitute', editDistance('kitten', 'sitting') === 3)

// --- Outcome A
for (const s of ['Switzerland', '  SWITZERLAND ', 'switzerland!', 'Swiss Confederation', 'sanmarino', 'San-Marino'])
  check(`A exact/alias: "${s}"`, kind(europe, s) === 'exact')
check('A "&" == "and"', kind(africa, 'Sao Tome & Principe') === 'exact')

// --- Outcome B (spec examples + more)
for (const s of ['Switzerlnd', 'Swizerland', 'Switzrland', 'Switzerlnad', 'Andora', 'Germny'])
  check(`B auto typo: "${s}"`, kind(europe, s) === 'typo')
const b = evaluateAnswer(europe, 'Swizerland')
check('B keeps the answer\'s own rarity', b.kind === 'typo' && b.answer.tier === 'schooler' && b.answer.points === 30)

// --- Outcome C
check('C uncertain -> suggestion, not accepted', kind(africa, 'Eswtnini') === 'suggest')

// --- rejection / strictness
for (const s of ['banana', 'Brazil', 'Kenya', '', '   ', 'Swit'])
  check(`none: "${s}"`, kind(europe, s) === 'none')
check('different valid answer is not a typo (Niger)', kind(africa, 'Niger') === 'none')
let shortChecked = 0, shortBad = 0
for (const q of QUESTION_DATABASE) {
  for (const a of q.answers) {
    if (/^[A-Za-z]{4}$/.test(a.text)) {
      shortChecked++
      const k = kind(q, a.text.slice(0, 3) + (a.text.endsWith('x') ? 'q' : 'x'))
      if (k === 'typo' || k === 'suggest') shortBad++
    }
  }
}
check('4-letter answers are exact-only (no fuzzy)', shortChecked > 0 && shortBad === 0, `(${shortChecked} checked)`)

// --- DB-wide sweep: no answer/alias that is valid anywhere is ever fuzzy-matched elsewhere
let leaks = 0
const allVariants = new Set<string>()
for (const q of QUESTION_DATABASE) for (const a of q.answers) for (const v of [a.text, ...(a.aliases ?? [])]) allVariants.add(v)
for (const q of QUESTION_DATABASE.slice(0, 60))
  for (const v of allVariants) {
    const r = evaluateAnswer(q, v)
    const valid = q.answers.some((a) => [a.text, ...(a.aliases ?? [])].some((x) => evaluateAnswer(q, x).kind === 'exact' && x === v))
    if (!valid && r.kind !== 'exact' && r.kind !== 'none') leaks++
  }
check('no valid answer from another question leaks via fuzzy matching', leaks === 0, `(${leaks} leaks, ${allVariants.size} variants)`)

// every accepted answer matches itself exactly
let selfFail = 0
for (const q of QUESTION_DATABASE) for (const a of q.answers) if (evaluateAnswer(q, a.text).kind !== 'exact') selfFail++
check('every accepted answer matches itself', selfFail === 0)

// --- dive math, every tier, from several starting depths
for (const tier of RARITY_TIERS) {
  for (const from of [0, 120, 400, 600]) {
    const spec: DiveSpec = {
      key: 'k', tierId: tier.id, points: tier.points, fromScore: from, toScore: from + tier.points,
      startedAt: 1000, durationMs: getDiveDurationMs(tier.id, false), reduceMotion: false,
    }
    let last = from * 10, mono = true
    for (let t = 1000; t <= 1000 + spec.durationMs + 50; t += 5) {
      const f = getDiveFrame(spec, t)
      if (f.depth < last - 1e-9) mono = false
      last = f.depth
    }
    const end = getDiveFrame(spec, 1000 + spec.durationMs)
    const start = getDiveFrame(spec, 1000)
    check(
      `dive ${tier.id} ${from * 10}m -> ${(from + tier.points) * 10}m`,
      mono && end.depth === (from + tier.points) * 10 && start.depth === from * 10 && end.phase === 'arrive',
    )
  }
}
const durations = RARITY_TIERS.map((t) => getDiveDurationMs(t.id, false))
check('rarer tiers take longer, all under 7s', durations.every((d, i) => i === 0 || d > durations[i - 1]) && Math.max(...durations) < 7000, durations.join('/'))
check('reduced-motion dive is short and does not travel', RARITY_TIERS.every((t) => getDiveDurationMs(t.id, true) <= 1700))
check('rarer tiers get stronger effects', DIVE_TIERS['one-in-a-krillion'].shake > DIVE_TIERS.rare.shake && DIVE_TIERS.rare.shake > DIVE_TIERS.plankton.shake)
check('perfect game = 7,000 m', RARITY_TIERS.at(-1)!.points * 7 * 10 === 7000)

// --- ocean blending is smooth: weights sum to 1 and never jump
let sumOk = true, maxJump = 0
let prev = getZoneWeights(0)
for (let d = 1; d <= 7000; d++) {
  const w = getZoneWeights(d)
  if (Math.abs(w.reduce((a, c) => a + c, 0) - 1) > 1e-9 || w.some((x) => x < -1e-9)) sumOk = false
  maxJump = Math.max(maxJump, ...w.map((x, i) => Math.abs(x - prev[i])))
  prev = w
}
check('zone weights sum to 1 across 0-7000 m', sumOk)
check('zone cross-fades are gradual (max change per metre < 2%)', maxJump < 0.02, `max=${maxJump.toFixed(4)}`)

// --- difficulty: labels, pools, weighting and selection
check('difficulty labels are Easy / Normal / Hard', DIFFICULTIES.map((d) => d.label).join('/') === 'Easy/Normal/Hard')
check('default difficulty is Normal', DEFAULT_DIFFICULTY === 'medium' && getDifficultyLabel(undefined) === 'Normal')
check('unknown difficulty ids are rejected', !isQuestionDifficulty('expert') && !isQuestionDifficulty(1))

const difficulties: QuestionDifficulty[] = ['easy', 'medium', 'hard']
for (const difficulty of difficulties) {
  const pool = getDifficultyQuestionPool(difficulty)
  const weights = DIFFICULTY_QUESTION_WEIGHTS[difficulty]
  check(
    `${difficulty} pool only contains weighted tags (${pool.length} questions)`,
    pool.length >= 7 && pool.every((q) => (weights[q.difficulty] ?? 0) > 0),
  )

  const drawn = getSevenUniqueQuestions([], difficulty)
  check(
    `${difficulty} draw has 7 unique questions from its pool`,
    drawn.length === 7 &&
      new Set(drawn.map((q) => q.id)).size === 7 &&
      drawn.every((q) => (weights[q.difficulty] ?? 0) > 0),
  )
}

const easyPool = new Set(getDifficultyQuestionPool('easy').map((q) => q.id))
const mediumPool = new Set(getDifficultyQuestionPool('medium').map((q) => q.id))
const hardPool = new Set(getDifficultyQuestionPool('hard').map((q) => q.id))
check(
  'difficulty pools genuinely differ',
  [...mediumPool].some((id) => !easyPool.has(id)) &&
    [...hardPool].some((id) => !mediumPool.has(id)) &&
    [...easyPool].every((id) => !hardPool.has(id)),
)

// --- daily schedule: seeded, repeatable per date+difficulty, distinct across difficulty
const dailyA = getDailyQuestions('2026-05-04', 7, 'easy').map((q) => q.id)
const dailyB = getDailyQuestions('2026-05-04', 7, 'easy').map((q) => q.id)
const dailyHard = getDailyQuestions('2026-05-04', 7, 'hard').map((q) => q.id)
check('daily questions are repeatable for the same date and difficulty', dailyA.join() === dailyB.join())
check(
  'daily questions differ by difficulty',
  dailyA.every((id) => !dailyHard.includes(id)) && new Set(dailyA).size === 7 && new Set(dailyHard).size === 7,
)

// --- rarity is per answer and independent of question difficulty
const tierByQuestionDifficulty: Record<QuestionDifficulty, Set<string>> = {
  easy: new Set(),
  medium: new Set(),
  hard: new Set(),
}
let pointMismatch = 0
for (const question of QUESTION_DATABASE) {
  for (const answer of question.answers) {
    tierByQuestionDifficulty[question.difficulty].add(answer.tier)
    if (RARITY_TIERS.find((t) => t.id === answer.tier)?.points !== answer.points) pointMismatch++
  }
}
check('every accepted answer points value matches its rarity tier', pointMismatch === 0)
check(
  'each question difficulty contains several rarity tiers',
  difficulties.every((d) => tierByQuestionDifficulty[d].size >= 3),
)
const hasTier = (difficulty: QuestionDifficulty, tier: string) =>
  QUESTION_DATABASE.some(
    (q) => q.difficulty === difficulty && q.answers.some((answer) => answer.tier === tier),
  )
check('Easy questions can hold One in a Krillion answers', hasTier('easy', 'one-in-a-krillion'))
check('Normal questions can hold One in a Krillion answers', hasTier('medium', 'one-in-a-krillion'))
check('Hard questions can hold Plankton answers', hasTier('hard', 'plankton'))

// rarity is a property of the answer, not of the question difficulty
check(
  'every rarity tier appears in every question difficulty',
  RARITY_TIERS.every((tier) => difficulties.every((d) => hasTier(d, tier.id))),
)

// every question offers a real rarity spread among its accepted answers
const thinQuestions = QUESTION_DATABASE.filter((q) => new Set(q.answers.map((a) => a.tier)).size < 2)
check(
  'every question accepts answers from multiple rarity tiers',
  thinQuestions.length === 0,
  thinQuestions.map((q) => q.id).join(', '),
)

// niche-answer gameplay: common answers low, obscure answers high
const ocean = byPrompt('Name an animal that lives in the ocean.')
const oceanTier = (text: string) => ocean.answers.find((a) => a.text === text)?.tier
check(
  'ocean animals: common answers score low, obscure answers score high',
  ocean.difficulty === 'easy' &&
    oceanTier('Shark') === 'plankton' &&
    oceanTier('Dumbo octopus') === 'deep-cut' &&
    oceanTier('Barreleye fish') === 'one-in-a-krillion',
)
const oceanTypo = evaluateAnswer(ocean, 'Barreleye fis')
check(
  "typo correction keeps the answer's rarity regardless of typed length",
  (oceanTypo.kind === 'typo' || oceanTypo.kind === 'suggest') &&
    oceanTypo.answer.tier === 'one-in-a-krillion' &&
    oceanTypo.answer.points === 100,
)

// --- spelling cases called out in the upgrade spec
function questionWithAnswer(text: string): Question | undefined {
  return QUESTION_DATABASE.find((q) =>
    q.answers.some((answer) => answer.text.toLowerCase() === text.toLowerCase()),
  )
}
for (const [answerText, misspelling] of [['Paris', 'Pariss'], ['Jupiter', 'Jupitar']] as const) {
  const question = questionWithAnswer(answerText)
  const result = question ? evaluateAnswer(question, misspelling) : null
  check(
    `spelling correction: "${misspelling}" -> ${answerText}`,
    result !== null && (result.kind === 'typo' || result.kind === 'suggest') &&
      result.answer.text === answerText,
  )
}

/* -------------------------------------------------------------------------- */
/* Smart answer recognition                                                   */
/* -------------------------------------------------------------------------- */

const echolocation = byPrompt('Name an animal that uses echolocation.')
const bigCat = byPrompt('Name a big cat.')
const planets = byPrompt('Name a planet in the Solar System.')
const continents = byPrompt('Name one of the seven continents.')
const positions = byPrompt('Name a baseball fielding position.')
const linearSystems = byPrompt('Name an ancient writing system.')
const council = byPrompt('Name a permanent member of the UN Security Council.')
const giraffeQuestion = byPrompt('Name a land animal that can weigh over 1,000 kilograms.')
const pixar = byPrompt('Name a feature film produced by Pixar.')
const answerOf = (question: Question, input: string) => {
  const result = evaluateAnswer(question, input)
  return result.kind === 'none' ? null : result.answer
}
const optionTexts = (question: Question, input: string) => {
  const result = evaluateAnswer(question, input)
  return result.kind === 'suggest' ? result.options.map((option) => option.text) : []
}

// 1-3: exact answers, case and whitespace are not meaningful.
check('recognition: exact answer', kind(ocean, 'Dolphin') === 'exact')
check('recognition: uppercase answer', kind(ocean, 'DOLPHIN') === 'exact')
check('recognition: leading and trailing spaces', kind(ocean, '   dolphin   ') === 'exact')
check('recognition: punctuation and spacing', kind(ocean, '  DOLPHIN!! ' ) === 'exact')

// Normalisation rules.
check('normalisation: leading articles are ignored', normalize('The Bahamas') === 'bahamas')
check(
  'normalisation: meaningful mid-phrase "a" is preserved',
  normalize('Linear A') === 'linear a' && normalize('Vitamin A') === 'vitamin a',
)
check(
  'normalisation: apostrophes and hyphens',
  matchKey("O'Brien") === 'obrien' && matchKey('Spider-Man') === 'spider man' && matchKey('Aye-aye') === 'aye aye',
)
check('normalisation: accents are folded', matchKey('Guitarrón') === 'guitarron')
check('normalisation: & reads as and', matchKey('Daisy Jones & The Six') === 'daisy jones and six')

// 4-6: the four edit classes.
check('recognition: missing letter (Dolpin)', kind(ocean, 'Dolpin') === 'typo')
check('recognition: extra letter (Octopuss)', kind(ocean, 'Octopuss') === 'typo')
check('recognition: swapped letters (Doplhin)', kind(ocean, 'Doplhin') === 'typo')
check('recognition: swapped letters (Shrak)', kind(ocean, 'Shrak') === 'typo')
check('recognition: substitution (Octupus)', kind(ocean, 'Octupus') === 'typo')

// 7-8: spelling mistakes, including multi-word answers.
check('recognition: common spelling mistake (Girafe)', answerOf(giraffeQuestion, 'Girafe')?.text === 'Giraffe')
check('recognition: multi-word answer (Barreleye fis)', answerOf(ocean, 'Barreleye fis')?.text === 'Barreleye fish')
check('recognition: multi-word typo (Dumbo octpous)', answerOf(ocean, 'Dumbo octpous')?.text === 'Dumbo octopus')
check('recognition: multi-word transposition (Giant sqiud)', answerOf(ocean, 'Giant sqiud')?.text === 'Giant squid')

// 9: aliases resolve to the same canonical answer and its rarity.
const aliasA = answerOf(ocean, 'Spookfish')
const aliasB = answerOf(ocean, 'Barreleye')
check(
  'aliases resolve to the canonical answer',
  aliasA !== null && aliasB !== null &&
    aliasA.text === 'Barreleye fish' && aliasB.text === 'Barreleye fish' &&
    aliasA.tier === 'one-in-a-krillion' && aliasA.points === 100,
)
check(
  'alias typos keep the canonical rarity',
  (() => {
    const result = evaluateAnswer(ocean, 'Spookfis')
    return (result.kind === 'typo' || result.kind === 'suggest') &&
      result.answer.text === 'Barreleye fish' && result.answer.points === 100
  })(),
)

// 10: abbreviations.
check(
  'recognition: abbreviations (USA / US / U.S.A. / full name)',
  ['USA', 'US', 'U.S.A.', 'United States of America'].every(
    (input) => answerOf(council, input)?.text === 'United States',
  ),
)
check('recognition: UK abbreviation', answerOf(council, 'UK')?.text === 'United Kingdom')

// 11: short answers stay strict.
check('strict short answers: Lion is not corrected from Loin', kind(bigCat, 'Loin') === 'none')
check('strict short answers: Bat is not corrected from Cat', kind(echolocation, 'Cat') === 'none')
check('strict short answers: Cat is not corrected from Cats', kind(echolocation, 'Cats') === 'none')

// 12: unrelated input is rejected.
for (const input of ['banana', 'volcano', 'qqqzzz']) {
  check(`strict rejection: "${input}"`, kind(ocean, input) === 'none')
}

// 13: ambiguous fuzzy matches ask instead of awarding points.
const patcher = evaluateAnswer(positions, 'Patcher')
check(
  'ambiguous match offers the close answers instead of auto-accepting',
  patcher.kind === 'suggest' && patcher.ambiguous &&
    patcher.options.length >= 2 &&
    patcher.options.some((option) => option.text === 'Pitcher') &&
    patcher.options.some((option) => option.text === 'Catcher'),
  patcher.kind === 'suggest' ? patcher.options.map((option) => option.text).join(', ') : '',
)
const linearAmbiguous = evaluateAnswer(linearSystems, 'Linear')
check(
  'ambiguous match (Linear -> Linear A / Linear B) pauses for confirmation',
  linearAmbiguous.kind === 'suggest' &&
    linearAmbiguous.ambiguous &&
    optionTexts(linearSystems, 'Linear').includes('Linear A') &&
    optionTexts(linearSystems, 'Linear').includes('Linear B'),
)

// 14: several accepted answers with different rarities never cross-award.
const barreleyeTypo = evaluateAnswer(ocean, 'Barreleye fis')
const dolphinTypo = evaluateAnswer(ocean, 'Dolpin')
const octopusTypo = evaluateAnswer(ocean, 'Octupus')
check(
  'typod Barreleye keeps its own rarity (100 pts)',
  barreleyeTypo.kind === 'typo' && barreleyeTypo.answer.tier === 'one-in-a-krillion' &&
    barreleyeTypo.answer.points === 100,
)
check(
  'typod Dolphin keeps its own rarity (15 pts)',
  dolphinTypo.kind === 'typo' && dolphinTypo.answer.tier === 'too-clever' &&
    dolphinTypo.answer.points === 15,
)
check(
  'typod Octopus keeps its own rarity (30 pts)',
  octopusTypo.kind === 'typo' && octopusTypo.answer.tier === 'schooler' &&
    octopusTypo.answer.points === 30,
)

// Plurals and irregular plurals are legitimate answers, not "corrections".
const pluralAnswers: [string, string][] = [
  ['Sharks', 'Shark'],
  ['Dolphins', 'Dolphin'],
  ['Giant squids', 'Giant squid'],
  ['Octopi', 'Octopus'],
  ['Octopuses', 'Octopus'],
]
for (const [input, expected] of pluralAnswers) {
  check(`plural resolves exactly: "${input}" -> ${expected}`, kind(ocean, input) === 'exact' && answerOf(ocean, input)?.text === expected)
}

// 15: a correct answer can only be committed while its question is live.
const liveGame = {
  phase: 'playing' as const,
  questionIds: ['q1', 'q2'],
  questionIndex: 0,
  questionDeadline: 10_000,
}
check('commit guard: live answer can be recorded', canCommitAnswer(liveGame, 'q1', 9_999))
check('commit guard: a second submit after feedback is ignored', !canCommitAnswer({ ...liveGame, phase: 'feedback' }, 'q1', 9_999))
check('commit guard: a finished dive is ignored', !canCommitAnswer({ ...liveGame, phase: 'complete' }, 'q1', 9_999))
check('commit guard: another question cannot be credited', !canCommitAnswer(liveGame, 'q2', 9_999))
check('commit guard: expired question cannot be credited', !canCommitAnswer(liveGame, 'q1', 10_000))
check(
  'commit guard: suggestion pause extends the clock',
  canCommitAnswer(liveGame, 'q1', 15_000, 6_000) && !canCommitAnswer(liveGame, 'q1', 16_001, 6_000),
)

// 16: confirmation is the only way an uncertain suggestion can score, and
// every option carries the rarity of its own canonical answer.
const linearOptions = evaluateAnswer(linearSystems, 'Linear')
check(
  'suggestion options keep their individual rarity',
  linearOptions.kind === 'suggest' &&
    linearOptions.options.every((option) =>
      RARITY_TIERS.some((tier) => tier.id === option.tier && tier.points === option.points),
    ) &&
    linearOptions.options.find((option) => option.text === 'Linear A')?.points === 30 &&
    linearOptions.options.find((option) => option.text === 'Linear B')?.points === 15,
)
check(
  'uncertain matches are never reported as automatic typos',
  kind(linearSystems, 'Linear') === 'suggest' &&
    kind(planets, 'Venue') === 'suggest' &&
    kind(ocean, 'While') === 'suggest' &&
    kind(ocean, 'Share') === 'suggest',
)
check(
  'common words are not silently rewritten (While / Share / Child)',
  kind(ocean, 'While') !== 'typo' && kind(ocean, 'Share') !== 'typo' && kind(ocean, 'Child') === 'none',
)

// 17: every valid answer stays valid, and real answers are never rewritten
// into a different accepted answer.
check('valid answers: Whale stays Whale', answerOf(ocean, 'Whale')?.text === 'Whale')
check('valid answers: Whale is not converted to another ocean answer', kind(echolocation, 'Whale') === 'none')
check('valid answers: Austria is not corrected to Australia', kind(continents, 'Austria') === 'none')
check('valid answers: Nigeria stays Nigeria, never Niger', kind(africa, 'Nigeria') === 'exact' && kind(africa, 'Niger') === 'none')
check('valid answers: exact alias beats fuzzy', answerOf(africa, 'Nigeria')?.text === 'Nigeria')

// Numbers (years, counts) are never fuzzy-matched.
check('numbers: exact numeric answer works', kind(pixar, 'Toy Story 3') === 'exact')
check('numbers: neighbouring number is rejected', kind(pixar, 'Toy Story 2') === 'none')

// --- expanded database: 500 questions, fixed difficulty split, data integrity
const EXPECTED_TOTAL = 500
const EXPECTED_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  easy: 150,
  medium: 200,
  hard: 150,
}
const DIFFICULTY_COUNT_LABEL: Record<QuestionDifficulty, string> = {
  easy: 'Easy',
  medium: 'Normal',
  hard: 'Hard',
}
const difficultyCounts: Record<QuestionDifficulty, number> = { easy: 0, medium: 0, hard: 0 }
for (const question of QUESTION_DATABASE) difficultyCounts[question.difficulty]++

check('database contains exactly 500 questions', QUESTION_DATABASE.length === EXPECTED_TOTAL, `(found ${QUESTION_DATABASE.length})`)
for (const difficulty of difficulties) {
  check(
    `database contains exactly ${EXPECTED_BY_DIFFICULTY[difficulty]} ${DIFFICULTY_COUNT_LABEL[difficulty]} questions`,
    difficultyCounts[difficulty] === EXPECTED_BY_DIFFICULTY[difficulty],
    `(found ${difficultyCounts[difficulty]})`,
  )
}
check(
  'every question id is unique',
  new Set(QUESTION_DATABASE.map((q) => q.id)).size === QUESTION_DATABASE.length,
)
check('no duplicate question ids or prompts', findDuplicateQuestions(QUESTION_DATABASE).length === 0)
check(
  'database passes structural validation',
  QUESTION_DATA_VALIDATION.valid && validateQuestionData(QUESTION_DATABASE).valid,
  QUESTION_DATA_VALIDATION.errors.join('; '),
)
check(
  'every question has at least one accepted answer',
  QUESTION_DATABASE.every((q) => q.answers.length > 0),
)
const duplicateVariants = QUESTION_DATABASE.flatMap((q) => findDuplicateAnswers(q.answers))
check('no duplicate accepted answers within a question', duplicateVariants.length === 0, duplicateVariants.join(', '))

const usedTiers = new Set(QUESTION_DATABASE.flatMap((q) => q.answers.map((a) => a.tier)))
check(
  'all six rarity tiers remain available',
  RARITY_TIERS.every((tier) => usedTiers.has(tier.id)),
  [...usedTiers].join(', '),
)
const invalidTiers = QUESTION_DATABASE.flatMap((q) =>
  q.answers.filter((answer) => !RARITY_TIERS.some((tier) => tier.id === answer.tier)),
)
check('every accepted answer has a valid rarity tier', invalidTiers.length === 0)

const NEW_CATEGORIES = [
  'Biology',
  'Human Body',
  'Ocean and Marine Life',
  'Computer Science',
  'Mathematics',
  'Inventions and Discoveries',
  'Video Games',
  'Literature and Books',
  'Anime and Manga',
  'Language and Vocabulary',
  'Famous People',
  'World Records',
  'Countries and Cultures',
  'Art and Architecture',
]
const categoryCounts = new Map<string, number>()
for (const question of QUESTION_DATABASE) {
  categoryCounts.set(question.category, (categoryCounts.get(question.category) ?? 0) + 1)
}
const wrongNewCategoryCounts = NEW_CATEGORIES.filter((category) => categoryCounts.get(category) !== 20)
check(
  'each expansion category contains exactly 20 questions',
  wrongNewCategoryCounts.length === 0,
  wrongNewCategoryCounts.map((c) => `${c}: ${categoryCounts.get(c) ?? 0}`).join(', '),
)
for (const difficulty of difficulties) {
  const categories = new Set(getDifficultyQuestionPool(difficulty).map((q) => q.category))
  check(
    `${difficulty} pool can draw from every expansion category`,
    NEW_CATEGORIES.every((category) => categories.has(category)),
  )
}
check('difficulty pools still match the documented sizes', (
  getDifficultyQuestionPoolSize('easy') === 150 &&
  getDifficultyQuestionPoolSize('medium') === 350 &&
  getDifficultyQuestionPoolSize('hard') === 350
), `easy=${getDifficultyQuestionPoolSize('easy')} medium=${getDifficultyQuestionPoolSize('medium')} hard=${getDifficultyQuestionPoolSize('hard')}`)

// Daily and Unlimited both draw from the expanded database.
for (const difficulty of difficulties) {
  const daily = getDailyQuestions('2026-11-20', 7, difficulty)
  check(
    `Daily Dive (${difficulty}) draws 7 unique questions from the expanded database`,
    daily.length === 7 &&
      new Set(daily.map((q) => q.id)).size === 7 &&
      daily.every((q) => QUESTION_DATABASE.includes(q) && (DIFFICULTY_QUESTION_WEIGHTS[difficulty][q.difficulty] ?? 0) > 0),
  )
  const unlimited = getSevenUniqueQuestions([], difficulty)
  check(
    `Unlimited (${difficulty}) draws 7 unique questions from the expanded database`,
    unlimited.length === 7 &&
      new Set(unlimited.map((q) => q.id)).size === 7 &&
      unlimited.every((q) => QUESTION_DATABASE.includes(q)),
  )
}

// Typo correction and aliases still work on new content.
const transpirationQuestion = byPrompt('Name a process carried out by plants.')
check(
  'typo correction works on new questions',
  kind(transpirationQuestion, 'Transperation') === 'typo',
)
const triangleQuestion = byPrompt('Name a type of triangle.')
check('aliases work on new questions', kind(triangleQuestion, 'Isosceles') === 'exact')

// The 211 original questions keep their wording, metadata and facts. Their
// answer lists may only grow: every previously accepted answer (and alias)
// must still be present with the same rarity and points.
const ORIGINAL_PREFIXES = new Set([
  'geo', 'ani', 'nat', 'food', 'mov', 'tv', 'mus', 'spt', 'his',
  'sci', 'tech', 'gk', 'obj', 'space', 'myth',
])
function fnv1a(input: string): string {
  let h = 0x811c9dc5
  for (let index = 0; index < input.length; index++) {
    h ^= input.charCodeAt(index)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
const originalQuestions = QUESTION_DATABASE
  .filter((q) => ORIGINAL_PREFIXES.has(q.id.split('_')[0]))
  .sort((a, b) => a.id.localeCompare(b.id))
const originalCoreSnapshot = fnv1a(JSON.stringify(originalQuestions.map((q) => ({
  id: q.id,
  category: q.category,
  prompt: q.prompt,
  difficulty: q.difficulty,
  fact: q.fact,
}))))
check(
  'all 211 original questions keep their prompts, metadata and facts',
  originalQuestions.length === 211 && originalCoreSnapshot === 'a4becf61',
  `(count ${originalQuestions.length}, snapshot ${originalCoreSnapshot})`,
)

interface BaselineAnswer { text: string; tier: string; points: number; aliases: string[] }
interface BaselineQuestion { id: string; answers: BaselineAnswer[] }
const baseline = JSON.parse(
  readFileSync(new URL('./answers-baseline.json', import.meta.url), 'utf8'),
) as BaselineQuestion[]
const baselineById = new Map(baseline.map((q) => [q.id, q]))
let missingAnswers = 0
let changedAnswers = 0
let missingAliases = 0
for (const question of originalQuestions) {
  const before = baselineById.get(question.id)
  if (!before) continue
  for (const old of before.answers) {
    const now = question.answers.find((a) => a.text === old.text)
    if (!now) {
      missingAnswers++
      continue
    }
    if (now.tier !== old.tier || now.points !== old.points) changedAnswers++
    for (const alias of old.aliases) {
      if (!(now.aliases ?? []).some((a) => a === alias)) missingAliases++
    }
  }
}
check('no original accepted answer was removed', missingAnswers === 0, `(${missingAnswers} missing)`)
check('no original answer had its rarity or points changed', changedAnswers === 0, `(${changedAnswers} changed)`)
check('no original alias was removed', missingAliases === 0, `(${missingAliases} missing)`)

const baselineAnswerTotal = baseline.reduce((total, q) => total + q.answers.length, 0)
const currentAnswerTotal = QUESTION_DATABASE.reduce((total, q) => total + q.answers.length, 0)
check(
  'accepted-answer coverage grew without adding questions',
  currentAnswerTotal > baselineAnswerTotal && QUESTION_DATABASE.length === 500,
  `(${baselineAnswerTotal} -> ${currentAnswerTotal}, +${currentAnswerTotal - baselineAnswerTotal})`,
)

// Feature F spot checks: legitimate aliases are accepted and loose matches are not.
const securityCouncil = byPrompt('Name a permanent member of the UN Security Council.')
check(
  'alias answering: United States accepts USA / US / America',
  ['USA', 'US', 'America', 'United States of America'].every((s) => kind(securityCouncil, s) === 'exact'),
)
check(
  'alias answering: Barreleye fish accepts Barreleye / Spookfish',
  ['Barreleye', 'Spookfish'].every((s) => kind(ocean, s) === 'exact'),
)
check(
  'loosely related words are still rejected (G7 question, "Mexico")',
  kind(byPrompt('Name a member country of the G7.'), 'Mexico') === 'none',
)
check(
  'new answers keep individual rarities (ocean question expanded to 20)',
  ocean.answers.length >= 18 && new Set(ocean.answers.map((a) => a.tier)).size >= 4,
  `(${ocean.answers.length} answers, ${new Set(ocean.answers.map((a) => a.tier)).size} tiers)`,
)

// --- category selection: mapping, pools, draws, daily schedules and legacy records
const bankCategories = new Set(QUESTION_DATABASE.map((q) => q.category))
const mappedCategories = CATEGORY_GROUPS.flatMap((group) => group.categories)
check(
  'every category group maps to real question-bank categories',
  mappedCategories.every((name) => bankCategories.has(name)),
  mappedCategories.filter((name) => !bankCategories.has(name)).join(', '),
)
check(
  'every question-bank category belongs to exactly one category group',
  [...bankCategories].every((name) => mappedCategories.includes(name)) &&
    new Set(mappedCategories).size === mappedCategories.length,
  [...bankCategories].filter((name) => !mappedCategories.includes(name)).join(', '),
)
check(
  'category ids are unique and valid',
  new Set(CATEGORY_GROUPS.map((group) => group.id)).size === CATEGORY_GROUPS.length &&
    CATEGORY_GROUPS.every((group) => {
      const id: unknown = group.id
      return normalizeCategoryId(id) === group.id
    }),
)

let categoryLeaks = 0
let categoryPoolMismatch = 0
const difficultiesWithCategories: QuestionDifficulty[] = ['easy', 'medium', 'hard']
for (const group of CATEGORY_GROUPS) {
  const groupCategories = new Set(group.categories)
  for (const difficulty of difficultiesWithCategories) {
    const pool = getDifficultyQuestionPool(difficulty, group.id)
    if (pool.some((question) => !groupCategories.has(question.category))) categoryLeaks++
    if (getDifficultyQuestionPoolSize(difficulty, group.id) !== pool.length) categoryPoolMismatch++
  }
}
check('category pools never contain questions from another category', categoryLeaks === 0)
check('category pool sizes agree with the filtered pools', categoryPoolMismatch === 0)

// Biology & Animals and Food & Cuisine (spec examples) stay strictly inside their groups.
for (const [label, group] of [
  ['Biology & Animals', CATEGORY_GROUPS.find((g) => g.id === 'biology-animals')!],
  ['Food & Cuisine', CATEGORY_GROUPS.find((g) => g.id === 'food')!],
] as const) {
  const pool = getDifficultyQuestionPool('medium', group.id)
  check(
    `${label} only offers its own questions`,
    pool.length >= 7 && pool.every((question) => group.categories.includes(question.category)),
    `(${pool.length} questions)`,
  )
}

const allMediumPool = getDifficultyQuestionPool('medium')
check(
  'All Categories draws from every question-bank category',
  new Set(allMediumPool.map((question) => question.category)).size === bankCategories.size &&
    allMediumPool.length === getDifficultyQuestionPoolSize('medium'),
)

check(
  'every category supports a full dive on Normal',
  CATEGORY_GROUPS.every((group) => getDifficultyQuestionPoolSize('medium', group.id) >= 7),
)
const playableEasyCategories = CATEGORY_GROUPS.filter((group) =>
  isCategoryPlayable('easy', group.id),
).length
const playableHardCategories = CATEGORY_GROUPS.filter((group) =>
  isCategoryPlayable('hard', group.id),
).length
check('Easy remains playable for a healthy set of categories', playableEasyCategories >= 10, `(${playableEasyCategories})`)
check('Hard remains playable for most categories', playableHardCategories >= 20, `(${playableHardCategories})`)
check(
  'categories with fewer than seven questions are reported as unplayable, never padded',
  !isCategoryPlayable('easy', 'literature') &&
    getDifficultyQuestionPoolSize('easy', 'literature') < 7 &&
    getDifficultyQuestionPoolSize('easy', 'literature') ===
      getDifficultyQuestionPool('easy', 'literature').length,
  `(literature easy pool ${getDifficultyQuestionPoolSize('easy', 'literature')})`,
)
check(
  'All Categories is playable at every difficulty',
  difficultiesWithCategories.every((difficulty) => isCategoryPlayable(difficulty, ALL_CATEGORIES_ID)),
)

let categoryDrawLeaks = 0
let categoryDrawDuplicates = 0
for (const group of CATEGORY_GROUPS) {
  if (!isCategoryPlayable('medium', group.id)) continue
  for (let draw = 0; draw < 8; draw++) {
    const picked = getSevenUniqueQuestions([], 'medium', group.id)
    if (new Set(picked.map((question) => question.id)).size !== 7) categoryDrawDuplicates++
    if (!picked.every((question) => group.categories.includes(question.category))) categoryDrawLeaks++
  }
}
check('category draws stay inside the selected category', categoryDrawLeaks === 0)
check('category draws never repeat a question', categoryDrawDuplicates === 0)

const dailyBiology = getDailyQuestions('2026-05-04', 7, 'medium', 'biology-animals')
const dailyBiologyAgain = getDailyQuestions('2026-05-04', 7, 'medium', 'biology-animals')
const dailyMusic = getDailyQuestions('2026-05-04', 7, 'medium', 'music')
check(
  'daily category schedule is repeatable for the same date, difficulty and category',
  dailyBiology.map((question) => question.id).join() ===
    dailyBiologyAgain.map((question) => question.id).join(),
)
check(
  'daily schedule changes with the selected category',
  dailyBiology.map((question) => question.id).join() !== dailyMusic.map((question) => question.id).join(),
)
check(
  'daily category questions stay inside the category',
  dailyBiology.every((question) => ['Biology', 'Animals'].includes(question.category)) &&
    dailyMusic.every((question) => question.category === 'Music'),
)

check(
  'legacy records without a category read as All Categories',
  normalizeCategoryId(undefined) === ALL_CATEGORIES_ID &&
    normalizeCategoryId('not-a-category') === ALL_CATEGORIES_ID &&
    getCategoryLabel(undefined) === 'All Categories',
)

// --- intro timing
check(
  'intro is short and leaves room for the question clock',
  INTRO_DURATION_MS >= 3000 && INTRO_DURATION_MS <= 6000 && INTRO_EXIT_MS < INTRO_DURATION_MS,
)
check(
  'reduced-motion intro is a brief title card',
  getIntroDurationMs(true) === REDUCED_INTRO_DURATION_MS &&
    REDUCED_INTRO_DURATION_MS <= 1200 &&
    getIntroDurationMs(false) > getIntroDurationMs(true),
)

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed')
if (failures) throw new Error(`${failures} checks failed`)
