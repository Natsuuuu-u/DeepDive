import type { RarityTierId } from '@/types'

export type DivePhase = 'confirm' | 'prepare' | 'descend' | 'arrive'

export interface DiveTierConfig {
  /** 1 (Plankton) .. 6 (One in a Krillion). */
  level: 1 | 2 | 3 | 4 | 5 | 6
  confirmMs: number
  prepareMs: number
  descendMs: number
  arriveMs: number
  /** Peak camera shake in px during the descent. */
  shake: number
  /** Peak extra camera zoom (fraction) during the descent. */
  zoom: number
  /** Ambient bubbles per second while diving. */
  bubbleRate: number
  /** Streaking marine-snow particles per second at peak speed. */
  snowRate: number
  /** Bioluminescent motes per second. */
  glowRate: number
  /** 0..1 strength of the pressure vignette during descent. */
  vignette: number
}

export const DIVE_TIERS: Record<RarityTierId, DiveTierConfig> = {
  plankton: {
    level: 1, confirmMs: 600, prepareMs: 400, descendMs: 900, arriveMs: 700,
    shake: 0, zoom: 0, bubbleRate: 6, snowRate: 0, glowRate: 0, vignette: 0,
  },
  'too-clever': {
    level: 2, confirmMs: 650, prepareMs: 450, descendMs: 1100, arriveMs: 750,
    shake: 0, zoom: 0.01, bubbleRate: 10, snowRate: 4, glowRate: 0, vignette: 0.05,
  },
  schooler: {
    level: 3, confirmMs: 700, prepareMs: 500, descendMs: 1500, arriveMs: 800,
    shake: 1, zoom: 0.02, bubbleRate: 18, snowRate: 14, glowRate: 0, vignette: 0.12,
  },
  rare: {
    level: 4, confirmMs: 700, prepareMs: 600, descendMs: 1700, arriveMs: 900,
    shake: 3, zoom: 0.05, bubbleRate: 28, snowRate: 26, glowRate: 3, vignette: 0.3,
  },
  'deep-cut': {
    level: 5, confirmMs: 750, prepareMs: 650, descendMs: 2000, arriveMs: 1000,
    shake: 5, zoom: 0.08, bubbleRate: 40, snowRate: 38, glowRate: 16, vignette: 0.42,
  },
  'one-in-a-krillion': {
    level: 6, confirmMs: 1100, prepareMs: 1000, descendMs: 2600, arriveMs: 1600,
    shake: 8, zoom: 0.14, bubbleRate: 55, snowRate: 52, glowRate: 30, vignette: 0.55,
  },
}

/** Reduced motion: a short, still confirmation. No travel, no particles. */
const REDUCED = { confirmMs: 900, prepareMs: 0, descendMs: 0, arriveMs: 700 }

export function getDivePhaseDurations(tier: RarityTierId, reduceMotion: boolean) {
  const c = DIVE_TIERS[tier]
  return reduceMotion
    ? REDUCED
    : { confirmMs: c.confirmMs, prepareMs: c.prepareMs, descendMs: c.descendMs, arriveMs: c.arriveMs }
}

export function getDiveDurationMs(tier: RarityTierId, reduceMotion: boolean): number {
  const d = getDivePhaseDurations(tier, reduceMotion)
  return d.confirmMs + d.prepareMs + d.descendMs + d.arriveMs
}

export interface DiveSpec {
  /** Stable per answer; used to avoid restarting the animation. */
  key: string
  tierId: RarityTierId
  points: number
  /** Score before / after the answer. Depth in metres is score x 10. */
  fromScore: number
  toScore: number
  startedAt: number
  durationMs: number
  reduceMotion: boolean
}

export interface DiveFrame {
  phase: DivePhase
  /** 0..1 progress through the whole sequence. */
  t: number
  /** 0..1 progress through the current phase. */
  phaseT: number
  /** Current depth in metres (continuous). */
  depth: number
  /** 0..1 progress of the descent itself. */
  descent: number
  /** 0..1 normalised vertical speed (1 = fastest point of the descent). */
  speed: number
  elapsedMs: number
}

interface Easing {
  fn: (t: number) => number
  /** Peak of the derivative, used to normalise speed to 0..1. */
  peak: number
}

const EASINGS: Record<"cubic" | "quart" | "quint", Easing> = {
  cubic: { fn: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), peak: 3 },
  quart: { fn: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2), peak: 4 },
  quint: { fn: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2), peak: 5 },
}

function easingFor(level: number): Easing {
  if (level >= 6) return EASINGS.quint
  if (level >= 4) return EASINGS.quart
  return EASINGS.cubic
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function scoreToDepth(score: number): number {
  return score * 10
}

/**
 * Pure function of the wall clock. Because the animation is derived from
 * `now - startedAt`, a page refresh in the middle of a dive resumes in exactly
 * the right place, and the depth always ends at exactly `toScore x 10`.
 */
export function getDiveFrame(spec: DiveSpec, now: number): DiveFrame {
  const d = getDivePhaseDurations(spec.tierId, spec.reduceMotion)
  const total = d.confirmMs + d.prepareMs + d.descendMs + d.arriveMs
  const elapsed = Math.min(total, Math.max(0, now - spec.startedAt))
  const fromDepth = scoreToDepth(spec.fromScore)
  const toDepth = scoreToDepth(spec.toScore)

  const prepareEnd = d.confirmMs + d.prepareMs
  const descendEnd = prepareEnd + d.descendMs

  let phase: DivePhase
  let phaseT: number
  if (elapsed < d.confirmMs) {
    phase = 'confirm'
    phaseT = d.confirmMs ? elapsed / d.confirmMs : 1
  } else if (elapsed < prepareEnd) {
    phase = 'prepare'
    phaseT = (elapsed - d.confirmMs) / d.prepareMs
  } else if (elapsed < descendEnd) {
    phase = 'descend'
    phaseT = (elapsed - prepareEnd) / d.descendMs
  } else {
    phase = 'arrive'
    phaseT = d.arriveMs ? (elapsed - descendEnd) / d.arriveMs : 1
  }

  const easing = easingFor(DIVE_TIERS[spec.tierId].level)
  let descent: number
  let speed = 0
  if (elapsed >= descendEnd) descent = 1
  else if (elapsed <= prepareEnd || d.descendMs === 0) descent = 0
  else {
    const u = clamp01((elapsed - prepareEnd) / d.descendMs)
    descent = easing.fn(u)
    const h = 0.001
    const slope = (easing.fn(clamp01(u + h)) - easing.fn(clamp01(u - h))) / (clamp01(u + h) - clamp01(u - h))
    speed = clamp01(slope / easing.peak)
  }

  return {
    phase,
    t: total ? elapsed / total : 1,
    phaseT: clamp01(phaseT),
    depth: fromDepth + (toDepth - fromDepth) * descent,
    descent,
    speed,
    elapsedMs: elapsed,
  }
}
