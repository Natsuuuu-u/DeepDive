import { DEPTH_ZONES } from '@/lib/depth'
import type { DepthZone } from '@/types'

type RGB = [number, number, number]
type ZoneId = DepthZone['id']

function hex(value: string): RGB {
  const h = value.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** Top / middle / bottom colours of each zone (same palette the project already used). */
export const ZONE_PALETTE: Record<ZoneId, { top: RGB; mid: RGB; bottom: RGB }> = {
  sunlit: { top: hex('#38bdf8'), mid: hex('#0284c7'), bottom: hex('#0c4a6e') },
  twilight: { top: hex('#1d4ed8'), mid: hex('#4338ca'), bottom: hex('#1e1b4b') },
  midnight: { top: hex('#3b1d8a'), mid: hex('#170f3a'), bottom: hex('#0a0620') },
  abyss: { top: hex('#0b3a3a'), mid: hex('#04121f'), bottom: hex('#020a12') },
  hadal: { top: hex('#3a0a2a'), mid: hex('#1a0614'), bottom: hex('#050208') },
}

/** Bioluminescent accent colour per zone (particles, glows). */
export const ZONE_GLOW: Record<ZoneId, string> = {
  sunlit: '#e0f2fe',
  twilight: '#5eead4',
  midnight: '#22d3ee',
  abyss: '#a78bfa',
  hadal: '#f472b6',
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Half-width, in metres, of the blend window around each zone boundary.
 * Wide enough that even a 100 m dive across a boundary changes colour gradually,
 * narrow enough that each zone still reads as its own place.
 */
const BLEND_HALF_WIDTH = DEPTH_ZONES.map((zone, i) => {
  if (i === 0) return 0
  const below = DEPTH_ZONES[i - 1]
  const spanBelow = below.maxDepth - below.minDepth
  const spanHere = zone.maxDepth - zone.minDepth
  return Math.min(300, 0.5 * Math.min(spanBelow, spanHere))
})

/**
 * How strongly each zone is "present" at a depth. Weights are non-negative and
 * sum to 1: they cross-fade smoothly around zone boundaries instead of snapping.
 */
export function getZoneWeights(depth: number): number[] {
  const crossed: number[] = DEPTH_ZONES.map((zone, i) =>
    i === 0 ? 1 : smoothstep(zone.minDepth - BLEND_HALF_WIDTH[i], zone.minDepth + BLEND_HALF_WIDTH[i], depth),
  )
  return DEPTH_ZONES.map((_, i) => {
    const next = i + 1 < DEPTH_ZONES.length ? crossed[i + 1] : 0
    return crossed[i] - next
  })
}

function mixPalette(depth: number, key: 'top' | 'mid' | 'bottom'): RGB {
  const weights = getZoneWeights(depth)
  const out: RGB = [0, 0, 0]
  DEPTH_ZONES.forEach((zone, i) => {
    const c = ZONE_PALETTE[zone.id][key]
    out[0] += c[0] * weights[i]
    out[1] += c[1] * weights[i]
    out[2] += c[2] * weights[i]
  })
  return out
}

const css = (c: RGB) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`

/** Continuous water colour for any depth in metres. */
export function getOceanGradient(depth: number): string {
  return `linear-gradient(to bottom, ${css(mixPalette(depth, 'top'))} 0%, ${css(mixPalette(depth, 'mid'))} 58%, ${css(mixPalette(depth, 'bottom'))} 100%)`
}

/** 0..~0.6 extra darkness laid over the water as light fades with depth. */
export function getDarkness(depth: number): number {
  return 0.62 * (1 - Math.exp(-Math.max(0, depth) / 2400))
}

/** Sunbeam strength: full at the surface, gone by about 1,000 m. */
export function getRayStrength(depth: number): number {
  return 1 - smoothstep(0, 1000, depth)
}

/** The zone that dominates a depth (for labels). */
export function getZoneIdAtDepth(depth: number): ZoneId {
  const weights = getZoneWeights(depth)
  let best = 0
  weights.forEach((w, i) => {
    if (w > weights[best]) best = i
  })
  return DEPTH_ZONES[best].id
}
