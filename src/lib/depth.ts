import type { DepthZone } from '@/types'

export const DEPTH_ZONES: DepthZone[] = [
  { id: 'sunlit', name: 'Sunlit Zone', minScore: 0, minDepth: 0, maxDepth: 200 },
  { id: 'twilight', name: 'Twilight Zone', minScore: 20, minDepth: 200, maxDepth: 1000 },
  { id: 'midnight', name: 'Midnight Zone', minScore: 100, minDepth: 1000, maxDepth: 4000 },
  { id: 'abyss', name: 'The Abyss', minScore: 400, minDepth: 4000, maxDepth: 6000 },
  { id: 'hadal', name: 'Hadal Trench', minScore: 600, minDepth: 6000, maxDepth: 7000 },
]

/** Score at which the diver reaches the very bottom of the gauge. */
export const MAX_SCORE = 700

export function getZone(score: number): DepthZone {
  let current = DEPTH_ZONES[0]
  for (const z of DEPTH_ZONES) if (score >= z.minScore) current = z
  return current
}

/** 0..1 progress down the whole water column. */
export function getDepthProgress(score: number): number {
  return Math.min(1, Math.max(0, score / MAX_SCORE))
}

/** Each score point represents ten metres. */
export function getDepthMeters(score: number): number {
  return Math.round(Math.min(MAX_SCORE, Math.max(0, score)) * 10)
}
