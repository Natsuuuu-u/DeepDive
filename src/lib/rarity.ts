import type { RarityTier, RarityTierId } from '@/types'

export const RARITY_TIERS: RarityTier[] = [
  { id: 'plankton', label: 'Plankton', points: 10, color: 'text-slate-300' },
  { id: 'too-clever', label: 'Too Clever', points: 15, color: 'text-sky-300' },
  { id: 'schooler', label: 'Schooler', points: 30, color: 'text-kelp' },
  { id: 'rare', label: 'Rare', points: 60, color: 'text-gold' },
  { id: 'deep-cut', label: 'Deep Cut', points: 85, color: 'text-orange-400' },
  { id: 'one-in-a-krillion', label: 'One in a Krillion', points: 100, color: 'text-coral' },
]

export function getTier(id: RarityTierId): RarityTier {
  const tier = RARITY_TIERS.find((candidate) => candidate.id === id)
  if (!tier) throw new Error(`Unknown rarity tier: ${id}`)
  return tier
}
