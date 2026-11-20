export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash1(n: number): number {
  let x = Math.imul(n | 0, 0x27d4eb2d)
  x ^= x >>> 15
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  return (x >>> 0) / 4294967296
}

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const mod = (a: number, n: number): number => ((a % n) + n) % n

/** 1D value noise in 0..1. */
export function smoothNoise(x: number, seed = 0): number {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  return lerp(hash1(i * 131 + seed), hash1((i + 1) * 131 + seed), u)
}
