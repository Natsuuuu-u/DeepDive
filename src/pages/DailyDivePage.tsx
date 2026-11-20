import { useState } from 'react'
import GamePreview from '@/components/game/GamePreview'
import DifficultyLobby from '@/components/game/DifficultyLobby'
import { todayKey } from '@/lib/questions'
import { getDailyRunForDate, loadActiveGame } from '@/lib/storage'
import type { QuestionDifficulty } from '@/types'

function hasDailyInProgress(): boolean {
  if (getDailyRunForDate(todayKey())) return true
  try {
    const saved = loadActiveGame('daily')
    if (!saved || saved.phase === 'complete') return false
    const savedDate = saved.dailyDate ?? todayKey(new Date(saved.startedAt))
    return savedDate === todayKey()
  } catch {
    return false
  }
}

interface Setup {
  difficulty: QuestionDifficulty
  category: string
}

export default function DailyDivePage() {
  const [started, setStarted] = useState(hasDailyInProgress)
  const [setup, setSetup] = useState<Setup>()

  if (!started) {
    return (
      <DifficultyLobby
        mode="daily"
        title="Daily Dive"
        blurb="Seven questions. Twenty-five seconds each. How deep can today's answers take you?"
        note="One scored dive per local calendar day. Choose a difficulty and category before you begin."
        onStart={(difficulty, category) => {
          setSetup({ difficulty, category })
          setStarted(true)
        }}
      />
    )
  }

  return (
    <GamePreview
      mode="daily"
      title="Daily Dive"
      difficulty={setup?.difficulty}
      category={setup?.category}
      blurb="Seven questions. Twenty-five seconds each. How deep can today's answers take you?"
      onExit={() => {
        setStarted(false)
        setSetup(undefined)
      }}
    />
  )
}
