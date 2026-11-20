import { QUESTION_DATABASE } from '@/data/questionDatabase'

const lines = QUESTION_DATABASE.map(
  (q) => `${q.id}\t${q.category}\t${q.prompt}\t${q.answers.map((a) => a.text).join(' | ')}`,
)
console.log(lines.join('\n'))
