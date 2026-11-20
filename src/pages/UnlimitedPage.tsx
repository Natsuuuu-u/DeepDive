import { useState } from 'react'
import GamePreview from '@/components/game/GamePreview'
import DifficultyLobby from '@/components/game/DifficultyLobby'
import { normalizeCategoryId } from '@/lib/categories'
import { DEFAULT_DIFFICULTY } from '@/lib/difficulty'
import { loadActiveGame } from '@/lib/storage'
import type { QuestionDifficulty } from '@/types'

interface Setup {
  difficulty: QuestionDifficulty
  category: string
}

function inProgressSetup(): Setup | null {
  try {
    const saved = loadActiveGame('unlimited')
    if (saved && saved.phase !== 'complete') {
      return {
        difficulty: saved.difficulty ?? DEFAULT_DIFFICULTY,
        category: normalizeCategoryId(saved.category),
      }
    }
  } catch {
    /* fall through to the lobby */
  }
  return null
}

function hasCompletedSavedGame(): boolean {
  try {
    return loadActiveGame('unlimited')?.phase === 'complete'
  } catch {
    return false
  }
}

export default function UnlimitedPage() {
  const [setup, setSetup] = useState<Setup | null>(inProgressSetup)
  const [fresh, setFresh] = useState(false)

  if (!setup) {
    return (
      <DifficultyLobby
        mode="unlimited"
        title="Unlimited Mode"
        blurb="Take another seven-question dive whenever you like. Every point takes you ten metres deeper."
        note="Choose a difficulty and category for each dive. Recent questions are avoided when possible."
        onStart={(difficulty, category) => {
          setFresh(hasCompletedSavedGame())
          setSetup({ difficulty, category })
        }}
      />
    )
  }

  return (
    <GamePreview
      mode="unlimited"
      title="Unlimited"
      difficulty={setup.difficulty}
      category={setup.category}
      fresh={fresh}
      blurb="Take another seven-question dive whenever you like. Every point takes you ten metres deeper."
      onRestart={() => {
        setFresh(false)
        setSetup(null)
      }}
      onExit={() => {
        setFresh(false)
        setSetup(null)
      }}
    />
  )
}
