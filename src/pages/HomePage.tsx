import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  BarChart3,
  CalendarDays,
  Infinity as InfinityIcon,
  Trophy,
} from 'lucide-react'
import DivingCharacter from '@/components/ocean/DivingCharacter'
import PixelPanel from '@/components/ui/PixelPanel'
import { formatUntilNextDive } from '@/lib/daily'
import { getDifficultyLabel } from '@/lib/difficulty'
import { calculatePlayerStatistics, getAchievements } from '@/lib/progression'
import { getCategoryLabel } from '@/lib/categories'
import { GAME_QUESTION_COUNT } from '@/lib/gameConstants'
import { todayKey } from '@/lib/questions'
import {
  loadCategoryPreference,
  loadDifficultyPreference,
  loadStats,
  loadActiveGame,
  loadRuns,
} from '@/lib/storage'

function hasActiveDailyDive(dateKey: string): boolean {
  try {
    const game = loadActiveGame('daily')
    if (!game || game.phase === 'complete') return false
    const savedDate = game.dailyDate ?? todayKey(new Date(game.startedAt))
    return savedDate === dateKey
  } catch {
    return false
  }
}

export default function HomePage() {
  const [now, setNow] = useState(Date.now)
  const [preferredDifficulty] = useState(() => getDifficultyLabel(loadDifficultyPreference()))
  const [preferredCategory] = useState(() => getCategoryLabel(loadCategoryPreference()))

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const dateKey = todayKey(new Date(now))
  const stats = loadStats()
  const runs = loadRuns()
  const progression = calculatePlayerStatistics(runs, stats, dateKey)
  const latestAchievement = getAchievements(runs, stats.achievementUnlocks)
    .filter((achievement) => achievement.unlocked && achievement.unlockedAt)
    .sort((a, b) => Date.parse(b.unlockedAt!) - Date.parse(a.unlockedAt!))[0]
  const dailyRun = runs.find((run) =>
    run.mode === 'daily' &&
    (run.dailyDate ?? todayKey(new Date(run.date))) === dateKey,
  )
  const activeDaily = hasActiveDailyDive(dateKey)
  const recordedBestDailyScore = runs
    .filter((run) =>
      run.mode === 'daily' &&
      run.completed !== false &&
      run.results.length === GAME_QUESTION_COUNT,
    )
    .reduce((best, run) => Math.max(best, run.score), 0)
  const bestDailyScore = Math.max(stats.bestDailyScore ?? 0, recordedBestDailyScore)
  const currentStreak = progression.currentDailyStreak
  const countdown = formatUntilNextDive(now)
  const status = dailyRun ? 'Completed' : activeDaily ? 'In progress' : 'Ready to dive'
  const dailyAction = dailyRun
    ? "Review today's result"
    : activeDaily
      ? 'Resume today’s dive'
      : 'Start today’s dive'

  const secondaryCards = [
    { to: '/archive', title: 'Archive', text: 'Review past dives and browse every question.', icon: Archive },
    { to: '/stats', title: 'Statistics', text: 'Your best depth, scores and streaks.', icon: BarChart3 },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col items-center gap-3 pt-2 text-center sm:gap-4 sm:pt-6">
        <div className="scale-90 sm:scale-100">
          <DivingCharacter pixel={8} />
        </div>
        <h1 className="pixel-text text-lg leading-relaxed text-white sm:text-2xl">Deep Dive Trivia</h1>
        <p className="max-w-md text-sm text-slate-200">
          The rarer your answer, the deeper you sink. Common answers keep you in the shallows.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Game modes">
        <Link to="/daily" className="group block">
          <PixelPanel className="h-full transition-transform group-hover:-translate-y-1 group-hover:border-sonar">
            <div className="mb-3 flex items-center justify-between">
              <CalendarDays className="text-sonar" size={22} aria-hidden />
              <span className="pixel-text text-[9px] leading-relaxed text-kelp">{status}</span>
            </div>
            <h2 className="pixel-text text-xs text-gold">Daily Dive</h2>
            <p className="mt-2 text-sm text-slate-300">7 questions · 25 seconds each · one scored dive per day.</p>
            <p className="mt-1 text-xs text-slate-400">Last setup: {preferredDifficulty} · {preferredCategory}</p>
            <div className="mt-4 space-y-1 text-xs text-slate-200">
              <p>Best daily score: {bestDailyScore} / 700</p>
              <p>Current streak: {currentStreak} {currentStreak === 1 ? 'day' : 'days'}</p>
              <p>Next Daily Dive in <span className="pixel-text text-[9px] text-sonar">{countdown}</span></p>
            </div>
            <p className="pixel-text mt-4 text-[9px] text-gold">{dailyAction} →</p>
          </PixelPanel>
        </Link>

        <Link to="/unlimited" className="group block">
          <PixelPanel className="h-full transition-transform group-hover:-translate-y-1 group-hover:border-sonar">
            <InfinityIcon className="mb-3 text-sonar" size={22} aria-hidden />
            <h2 className="pixel-text text-xs text-gold">Unlimited Mode</h2>
            <p className="mt-2 text-sm text-slate-300">
              Take another seven-question dive whenever you like. Recent questions are avoided when possible.
            </p>
            <p className="mt-1 text-xs text-slate-400">Pick a difficulty and category for every dive.</p>
            <p className="mt-4 text-xs text-slate-200">
              Unlimited games played: {progression.unlimitedGames}
            </p>
            <p className="pixel-text mt-4 text-[9px] text-gold">Play unlimited →</p>
          </PixelPanel>
        </Link>

        {secondaryCards.map(({ to, title, text, icon: Icon }) => (
          <Link key={to} to={to} className="group block">
            <PixelPanel className="h-full transition-transform group-hover:-translate-y-1 group-hover:border-sonar">
              <Icon className="mb-3 text-sonar" size={22} aria-hidden />
              <h2 className="pixel-text text-xs text-gold">{title}</h2>
              <p className="mt-2 text-sm text-slate-300">{text}</p>
            </PixelPanel>
          </Link>
        ))}
      </section>

      <section aria-labelledby="dive-stats-heading">
        <h2 id="dive-stats-heading" className="pixel-text mb-3 text-xs text-sonar">Diving statistics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total games', value: progression.totalGames, icon: BarChart3 },
            { label: 'Personal best', value: `${progression.highestScore} / 700`, icon: Trophy },
            { label: 'Daily streak', value: `${currentStreak} days`, icon: CalendarDays },
            { label: 'Deepest dive', value: `${progression.deepestDiveMeters.toLocaleString()}m`, icon: InfinityIcon },
          ].map(({ label, value, icon: Icon }) => (
            <PixelPanel key={label} className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
              <Icon className="shrink-0 text-sonar" size={18} aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-slate-300">{label}</p>
                <p className="pixel-text mt-2 break-words text-[10px] leading-relaxed text-gold">{value}</p>
              </div>
            </PixelPanel>
          ))}
        </div>
        {latestAchievement && (
          <PixelPanel className="mt-3 flex items-center gap-3">
            <Trophy className="shrink-0 text-gold" size={18} aria-hidden />
            <div>
              <p className="pixel-text text-[8px] text-gold">Recently unlocked</p>
              <p className="mt-2 text-sm text-slate-200">{latestAchievement.name}</p>
            </div>
          </PixelPanel>
        )}
      </section>
    </div>
  )
}
