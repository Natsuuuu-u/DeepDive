import { useParams } from 'react-router-dom'
import GamePreview from '@/components/game/GamePreview'
import NotFoundPage from '@/pages/NotFoundPage'
import { getLocalDateKey } from '@/lib/daily'
import { todayKey } from '@/lib/questions'

export default function ArchivedDailyPracticePage() {
  const { date } = useParams()
  const parsed = date ? new Date(`${date}T12:00:00`) : new Date(Number.NaN)
  const validDate =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    getLocalDateKey(parsed) === date &&
    date < todayKey()

  if (!validDate || !date) return <NotFoundPage />

  return (
    <GamePreview
      key={date}
      mode="practice"
      practiceDate={date}
      title="Daily Practice"
      blurb={`Replay the ${date} challenge for practice. Your score will not affect the Daily Streak.`}
    />
  )
}
