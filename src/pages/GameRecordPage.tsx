import { Link, useNavigate, useParams } from 'react-router-dom'
import { History } from 'lucide-react'
import ResultsScreen from '@/components/game/ResultsScreen'
import PageTitle from '@/components/ui/PageTitle'
import PixelPanel from '@/components/ui/PixelPanel'
import { findQuestionById, getLegacyQuestionPlaceholder } from '@/lib/questions'
import type { Question } from '@/types'
import { loadRuns } from '@/lib/storage'

export default function GameRecordPage() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const run = loadRuns().find((record) => record.id === runId)

  if (!run || run.completed === false) {
    return (
      <div>
        <PageTitle title="Dive record" subtitle="Saved game review." icon={<History size={22} />} />
        <PixelPanel role="alert" className="text-sm text-slate-300">
          This completed game could not be found in this browser.
          <Link to="/archive" className="ml-1 text-sonar underline">Return to the archive.</Link>
        </PixelPanel>
      </div>
    )
  }

  const questionIds = run.questionIds ?? run.results.map((result) => result.questionId)
  const questions = questionIds
    .map((id, index): Question => {
      const snapshot = run.questionSnapshots?.[index]
      return snapshot?.id === id
        ? snapshot
        : findQuestionById(id) ?? getLegacyQuestionPlaceholder(id)
    })

  return (
    <div>
      <PageTitle
        title="Dive record"
        subtitle={`A complete review of your ${run.mode === 'daily' ? 'Daily Dive' : run.mode === 'practice' ? 'practice dive' : 'Unlimited dive'}.`}
        icon={<History size={22} />}
      />
      <ResultsScreen
        score={run.score}
        results={run.results}
        questions={questions}
        mode={run.mode}
        difficulty={run.difficulty}
        category={run.category}
        onClose={() => navigate('/archive')}
      />
    </div>
  )
}
