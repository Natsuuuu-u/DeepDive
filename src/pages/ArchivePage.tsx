import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, CalendarDays, History, Library } from 'lucide-react'
import PageTitle from '@/components/ui/PageTitle'
import PixelPanel from '@/components/ui/PixelPanel'
import { getLocalDateKey } from '@/lib/daily'
import { getCategoryLabel } from '@/lib/categories'
import { getDifficultyLabel } from '@/lib/difficulty'
import { getDepthMeters, getZone } from '@/lib/depth'
import { countCorrectAnswers } from '@/lib/game'
import { ALL_QUESTIONS, CATEGORIES, getDailyQuestions } from '@/lib/questions'
import { getHighestRarity } from '@/lib/progression'
import { loadRuns } from '@/lib/storage'
import { getTier } from '@/lib/rarity'
import type { AnswerResult, RunRecord } from '@/types'

type ArchiveTab = 'daily' | 'history' | 'questions'
type HistoryFilter = 'all' | 'daily' | 'unlimited' | 'highest' | 'recent'

function ReviewRows({
  results,
  questionSnapshots,
}: {
  results: AnswerResult[]
  questionSnapshots?: RunRecord['questionSnapshots']
}) {
  return (
    <ol className="mt-3 space-y-3">
      {results.map((result, index) => {
        const question = questionSnapshots?.find((item) => item.id === result.questionId) ??
          ALL_QUESTIONS.find((item) => item.id === result.questionId)
        const tier = result.matched ? getTier(result.matched.tier) : null
        return (
          <li key={`${result.questionId}-${index}`} className="border-t border-white/10 pt-3">
            <p className="text-sm text-slate-300">{question?.prompt ?? 'Question no longer available'}</p>
            <p className="mt-1 text-sm font-semibold">
              {result.timedOut ? 'Unanswered' : result.given || '—'}
              {tier && <span className={`ml-2 ${tier.color}`}>+{result.points} · {tier.label}</span>}
            </p>
            {question && (
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer text-sonar">Reveal accepted answers</summary>
                <p className="mt-2">
                  {question.answers
                    .map((answer) => [answer.text, ...(answer.aliases ?? [])].join(' / '))
                    .join(' · ')}
                </p>
                <p className="mt-2">{question.fact}</p>
              </details>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function RunReview({ run }: { run: RunRecord }) {
  const date = new Date(run.date)
  const zone = getZone(run.score)
  const depthMeters = run.depthMeters ?? getDepthMeters(run.score)
  const mode = run.mode === 'daily'
    ? 'Daily Dive'
    : run.mode === 'practice'
      ? 'Daily practice'
      : 'Unlimited'
  return (
    <PixelPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="pixel-text text-[9px] text-gold">
            {mode} · {getDifficultyLabel(run.difficulty)} · {getCategoryLabel(run.category)}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {date.toLocaleString()} · {run.completed === false ? 'Incomplete' : 'Completed'}
          </p>
        </div>
        <div className="text-right">
          <p className="pixel-text text-xs text-white">{run.score} / 700</p>
          <p className="mt-1 text-xs text-slate-300">
            {depthMeters.toLocaleString()}m · {zone.name}
          </p>
        </div>
      </div>
      <details className="mt-3 text-sm text-slate-300">
        <summary className="cursor-pointer text-sonar">Review {run.results.length} question results</summary>
        <ReviewRows results={run.results} questionSnapshots={run.questionSnapshots} />
      </details>
    </PixelPanel>
  )
}

export default function ArchivePage() {
  const [tab, setTab] = useState<ArchiveTab>('daily')
  const [category, setCategory] = useState('All')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('recent')
  const runs = useMemo(() => loadRuns(), [])
  const questionList = useMemo(
    () => (category === 'All' ? ALL_QUESTIONS : ALL_QUESTIONS.filter((question) => question.category === category)),
    [category],
  )
  const dailyEntries = useMemo(() => {
    const today = new Date()
    const dailyRuns = new Map<string, RunRecord>()
    for (const run of runs.filter((item) => item.mode === 'daily')) {
      const dateKey = run.dailyDate ?? getLocalDateKey(new Date(run.date))
      const existing = dailyRuns.get(dateKey)
      if (
        !existing ||
        Date.parse(run.completedAt ?? run.date) > Date.parse(existing.completedAt ?? existing.date)
      ) {
        dailyRuns.set(dateKey, run)
      }
    }
    const entries: Array<{ dateKey: string; run: RunRecord | undefined }> = []
    for (let offset = 1; offset <= 30; offset++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
      const dateKey = getLocalDateKey(date)
      entries.push({ dateKey, run: dailyRuns.get(dateKey) })
    }
    return entries
  }, [runs])
  const tabs: Array<{ id: ArchiveTab; label: string; icon: typeof Archive }> = [
    { id: 'daily', label: 'Daily Challenges', icon: CalendarDays },
    { id: 'history', label: 'Game History', icon: History },
    { id: 'questions', label: 'Question Bank', icon: Library },
  ]
  const filteredRuns = useMemo(() => {
    const filtered = runs.filter((run) => {
      if (historyFilter === 'daily') return run.mode === 'daily'
      if (historyFilter === 'unlimited') return run.mode === 'unlimited'
      return true
    })
    return filtered.sort((a, b) => historyFilter === 'highest'
      ? b.score - a.score || Date.parse(b.date) - Date.parse(a.date)
      : Date.parse(b.date) - Date.parse(a.date))
  }, [historyFilter, runs])

  return (
    <div>
      <PageTitle
        title="Dive Archive"
        subtitle="Review past challenges, saved results, and the question database."
        icon={<Archive size={22} />}
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Archive sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`archive-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`archive-panel-${id}`}
            onClick={() => setTab(id)}
            className={`pixel-text inline-flex items-center gap-2 px-3 py-2 text-[9px] ${
              tab === id ? 'bg-sonar text-ink' : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            <Icon size={14} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <section id="archive-panel-daily" role="tabpanel" aria-labelledby="archive-tab-daily">
          <p className="mb-3 text-sm text-slate-300">
            The last 30 local calendar days. Archived replays are practice and never change your Daily Streak.
          </p>
          <div className="space-y-3">
            {dailyEntries.map(({ dateKey, run }) => {
              const date = new Date(`${dateKey}T12:00:00`)
              const questionCount = run?.results.length ?? getDailyQuestions(dateKey).length
              return (
                <PixelPanel key={dateKey}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="pixel-text text-[9px] text-gold">
                        {date.toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {run
                          ? `Completed · ${questionCount}/7 questions · ${getDifficultyLabel(run.difficulty)} · ${getCategoryLabel(run.category)}`
                          : `Not completed · ${questionCount} questions`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {run && <span className="pixel-text text-xs text-white">{run.score} / 700</span>}
                      <Link
                        to={`/archive/daily/${dateKey}`}
                        className="pixel-text bg-sky-700 px-3 py-2 text-[9px] text-white hover:bg-sky-600"
                      >
                        Practice
                      </Link>
                    </div>
                  </div>
                  {run && (
                    <details className="mt-3 text-sm text-slate-300">
                      <summary className="cursor-pointer text-sonar">Review this result</summary>
                      <RunReview run={run} />
                    </details>
                  )}
                </PixelPanel>
              )
            })}
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section id="archive-panel-history" role="tabpanel" aria-labelledby="archive-tab-history">
          <p className="mb-3 text-sm text-slate-300">
            {runs.length} saved {runs.length === 1 ? 'game' : 'games'} in this browser.
          </p>
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter game history">
            {([
              ['all', 'All games'],
              ['daily', 'Daily Dive'],
              ['unlimited', 'Unlimited'],
              ['highest', 'Highest scores'],
              ['recent', 'Recent games'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={historyFilter === id}
                onClick={() => setHistoryFilter(id)}
                className={`pixel-text px-3 py-2 text-[9px] ${
                  historyFilter === id
                    ? 'bg-sonar text-ink'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {runs.length === 0 ? (
            <PixelPanel className="text-sm text-slate-300">Completed games will appear here.</PixelPanel>
          ) : (
            filteredRuns.length === 0 ? (
              <PixelPanel className="text-sm text-slate-300">
                No games match this filter.
              </PixelPanel>
            ) : (
              <div className="space-y-3">
                {filteredRuns.map((run) => {
                  const highest = getHighestRarity(run.results)
                  const highestTier = highest ? getTier(highest) : null
                  const label = run.mode === 'daily'
                    ? 'Daily Dive'
                    : run.mode === 'practice'
                      ? 'Daily practice'
                      : 'Unlimited'
                  return (
                    <PixelPanel key={run.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="pixel-text text-[9px] text-gold">
                            {label} · {getDifficultyLabel(run.difficulty)} · {getCategoryLabel(run.category)}
                          </p>
                          <p className="mt-2 text-xs text-slate-300">
                            {new Date(run.date).toLocaleString()}
                            {run.completed === false ? ' · Incomplete' : ' · Completed'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="pixel-text text-xs text-white">{run.score} / 700</p>
                          <p className="mt-1 text-xs text-slate-300">
                            {(run.depthMeters ?? getDepthMeters(run.score)).toLocaleString()}m · {getZone(run.score).name}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                        <span>{countCorrectAnswers(run.results)}/7 correct</span>
                        <span className={highestTier?.color ?? 'text-slate-400'}>
                          Best rarity: {highestTier?.label ?? '—'}
                        </span>
                        <Link
                          to={`/archive/game/${encodeURIComponent(run.id)}`}
                          className="pixel-text bg-sky-700 px-3 py-2 text-[9px] text-white hover:bg-sky-600"
                        >
                          Open results
                        </Link>
                      </div>
                    </PixelPanel>
                  )
                })}
              </div>
            )
          )}
        </section>
      )}

      {tab === 'questions' && (
        <section id="archive-panel-questions" role="tabpanel" aria-labelledby="archive-tab-questions">
          <p className="mb-3 text-sm text-slate-300">
            {ALL_QUESTIONS.length} questions loaded from the local database.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {['All', ...CATEGORIES].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`pixel-text px-3 py-2 text-[9px] ${
                  category === item ? 'bg-sonar text-ink' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {questionList.map((question) => (
              <PixelPanel key={question.id}>
                <div className="pixel-text mb-2 flex flex-wrap justify-between gap-2 text-[9px]">
                  <span className="text-gold">{question.category}</span>
                  <span className="text-slate-400">{question.difficulty}</span>
                </div>
                <p className="mb-3 font-semibold">{question.prompt}</p>
                <ul className="flex flex-wrap gap-2">
                  {question.answers.map((answer) => {
                    const tier = getTier(answer.tier)
                    return (
                      <li key={answer.text} className={`bg-white/5 px-2 py-1 text-xs ${tier.color}`}>
                        {answer.text} · {answer.points}
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-xs text-slate-400">{question.fact}</p>
              </PixelPanel>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
