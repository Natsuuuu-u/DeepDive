import { Award, BarChart3, CalendarDays, Gauge, Trophy } from 'lucide-react'
import PageTitle from '@/components/ui/PageTitle'
import PixelPanel from '@/components/ui/PixelPanel'
import { calculatePlayerStatistics, getAchievements, RARITY_ORDER } from '@/lib/progression'
import { loadRuns, loadStats } from '@/lib/storage'
import { getTier } from '@/lib/rarity'

function formatAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export default function StatisticsPage() {
  const savedStats = loadStats()
  const runs = loadRuns()
  const stats = calculatePlayerStatistics(runs, savedStats)
  const achievements = getAchievements(runs, savedStats.achievementUnlocks)

  const generalTiles = [
    { label: 'Total games', value: stats.totalGames },
    { label: 'Daily Dives completed', value: stats.totalDailyDives },
    { label: 'Unlimited games', value: stats.unlimitedGames },
    { label: 'Highest score', value: `${stats.highestScore} / 700` },
    { label: 'Average score', value: `${formatAverage(stats.averageScore)} / 700` },
    { label: 'Lowest score', value: `${stats.lowestScore} / 700` },
    { label: 'Total points earned', value: stats.totalPoints.toLocaleString() },
    { label: 'Total depth dived', value: `${stats.totalDepthMeters.toLocaleString()}m` },
    { label: 'Deepest single dive', value: `${stats.deepestDiveMeters.toLocaleString()}m` },
  ]

  return (
    <div>
      <PageTitle title="Statistics" subtitle="Your progression, saved in this browser." icon={<BarChart3 size={22} />} />

      <section aria-labelledby="general-stats-heading">
        <h2 id="general-stats-heading" className="pixel-text mb-3 text-[10px] text-sonar">
          General statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {generalTiles.map((item) => (
            <PixelPanel key={item.label}>
              <p className="pixel-text text-[8px] text-slate-400">{item.label}</p>
              <p className="pixel-text mt-3 text-[10px] text-gold">{item.value}</p>
            </PixelPanel>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="performance-heading">
        <h2 id="performance-heading" className="pixel-text mb-3 text-[10px] text-sonar">
          Performance
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PixelPanel>
            <div className="mb-4 flex items-center gap-2 text-gold">
              <Gauge size={18} aria-hidden />
              <h3 className="pixel-text text-[9px]">Dive consistency</h3>
            </div>
            <dl className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <dt>Average correct answers</dt>
                <dd className="text-white">{formatAverage(stats.averageCorrectAnswers)} / 7</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Best rarity achieved</dt>
                <dd className="text-white">
                  {stats.bestRarity ? getTier(stats.bestRarity).label : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Average score · last 10 games</dt>
                <dd className="text-white">{formatAverage(stats.recentAverageScore)}</dd>
              </div>
            </dl>
          </PixelPanel>

          <PixelPanel>
            <h3 className="pixel-text mb-4 text-[9px] text-gold">Answer rarity catches</h3>
            <ul className="space-y-2">
              {RARITY_ORDER.map((rarity) => {
                const tier = getTier(rarity)
                return (
                  <li key={rarity} className="flex items-center justify-between gap-3 text-sm">
                    <span className={tier.color}>{tier.label}</span>
                    <span className="text-slate-300">{stats.rarityAnswers[rarity]}</span>
                  </li>
                )
              })}
            </ul>
          </PixelPanel>

          <PixelPanel>
            <h3 className="pixel-text mb-4 text-[9px] text-gold">Most successful categories</h3>
            {stats.bestCategories.length ? (
              <ol className="space-y-3">
                {stats.bestCategories.map((item) => (
                  <li key={item.category}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-200">{item.category}</span>
                      <span className="text-slate-300">{item.correct}/{item.attempts}</span>
                    </div>
                    <div className="mt-2 h-2 bg-black/40">
                      <div
                        className="h-full bg-sonar"
                        style={{ width: `${Math.round(item.accuracy * 100)}%` }}
                        aria-label={`${Math.round(item.accuracy * 100)} percent accuracy`}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-300">Complete more dives to see category performance.</p>
            )}
          </PixelPanel>

          <PixelPanel>
            <div className="mb-4 flex items-center gap-2 text-gold">
              <CalendarDays size={18} aria-hidden />
              <h3 className="pixel-text text-[9px]">Daily streaks</h3>
            </div>
            <dl className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between gap-3">
                <dt>Current streak</dt>
                <dd className="text-white">{stats.currentDailyStreak} days</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Longest streak</dt>
                <dd className="text-white">{stats.longestDailyStreak} days</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Official Daily Dives</dt>
                <dd className="text-white">{stats.totalDailyDives}</dd>
              </div>
            </dl>
          </PixelPanel>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="achievements-heading">
        <div className="mb-3 flex items-center gap-2 text-gold">
          <Trophy size={18} aria-hidden />
          <h2 id="achievements-heading" className="pixel-text text-[10px]">Diving achievements</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement) => (
            <PixelPanel
              key={achievement.id}
              className={achievement.unlocked ? 'border-gold/60' : 'opacity-70'}
            >
              <div className="flex items-start gap-3">
                <Award
                  className={`mt-0.5 shrink-0 ${achievement.unlocked ? 'text-gold' : 'text-slate-500'}`}
                  size={20}
                  aria-hidden
                />
                <div>
                  <h3 className={`pixel-text text-[9px] ${achievement.unlocked ? 'text-gold' : 'text-slate-300'}`}>
                    {achievement.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">{achievement.description}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {achievement.unlocked && achievement.unlockedAt
                      ? `Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}`
                      : `Locked · ${achievement.unlockCondition}`}
                  </p>
                </div>
              </div>
            </PixelPanel>
          ))}
        </div>
      </section>

      {runs.length === 0 && (
        <p className="mt-6 text-sm text-slate-300">
          Complete a dive to start building your statistics and achievements.
        </p>
      )}
    </div>
  )
}
