/* Temp audit helper (deleted after use): answer coverage statistics. */
import { QUESTION_DATABASE } from '../src/data/questionDatabase'
import { writeFileSync } from 'node:fs'

const qs = QUESTION_DATABASE
const counts = qs.map((q) => q.answers.length)
const total = counts.reduce((a, b) => a + b, 0)
const aliases = qs.reduce(
  (sum, q) => sum + q.answers.reduce((s, a) => s + (a.aliases?.length ?? 0), 0),
  0,
)
const tiers: Record<string, number> = {}
for (const q of qs) for (const a of q.answers) tiers[a.tier] = (tiers[a.tier] ?? 0) + 1
const buckets: Record<number, number> = {}
for (const c of counts) buckets[c] = (buckets[c] ?? 0) + 1
const byCat: Record<string, { q: number; a: number }> = {}
for (const q of qs) {
  const c = (byCat[q.category] ??= { q: 0, a: 0 })
  c.q++
  c.a += q.answers.length
}
console.log('questions', qs.length, 'answers', total, 'aliases', aliases, 'variants', total + aliases)
console.log('avg answers/question', (total / qs.length).toFixed(2))
console.log('answer-count buckets', JSON.stringify(buckets))
console.log('tiers', tiers)
console.log('by category', JSON.stringify(byCat, null, 1))

const baseline = qs.map((q) => ({
  id: q.id,
  prompt: q.prompt,
  category: q.category,
  difficulty: q.difficulty,
  answers: q.answers.map((a) => ({
    text: a.text,
    tier: a.tier,
    points: a.points,
    aliases: a.aliases ?? [],
  })),
}))
writeFileSync('scripts/answers-baseline.json', JSON.stringify(baseline, null, 1))
console.log('baseline written: scripts/answers-baseline.json')

const thin = qs
  .filter((q) => q.answers.length <= 5)
  .map((q) => `${q.id} [${q.answers.length}] ${q.prompt}`)
console.log(`\nQuestions with <=5 answers (${thin.length}):`)
console.log(thin.join('\n'))
