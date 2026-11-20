import { FLOOR_Y, ZONE_H } from './constants'
import { mulberry32 } from './rng'
import type { SpriteKey } from './sprites'

export type CreatureKind =
  | 'fishOrange'
  | 'fishTang'
  | 'fishYellow'
  | 'lantern'
  | 'snail'
  | 'jelly'
  | 'jellyGlow'
  | 'jellyRare'
  | 'squid'
  | 'angler'
  | 'dumbo'
  | 'sub'
  | 'eel'

export interface Creature {
  kind: CreatureKind
  /** 0..1 position along the wrapping horizontal strip */
  u: number
  /** extra pixel offset (used to keep schools together) */
  xOff: number
  /** world y */
  y: number
  speed: number
  dir: 1 | -1
  phase: number
  amp: number
  freq: number
}

export type PropKind = SpriteKey | 'kelp'

export interface Prop {
  side: 0 | 1
  /** world y of the ledge the prop sits on */
  y: number
  sprite: PropKind
  seed: number
}

type Rand = () => number

function pickWeighted<T>(r: Rand, list: Array<[T, number]>): T {
  const total = list.reduce((s, [, w]) => s + w, 0)
  let n = r() * total
  for (const [item, w] of list) {
    n -= w
    if (n <= 0) return item
  }
  return list[0][0]
}

export function generateWorld(): { creatures: Creature[]; props: Prop[] } {
  const r = mulberry32(20261120)
  const creatures: Creature[] = []
  const props: Prop[] = []
  const dirOf = (): 1 | -1 => (r() > 0.5 ? 1 : -1)

  const school = (kind: CreatureKind, n: number, y0: number, y1: number, speed: number): void => {
    const u = r()
    const dir = dirOf()
    const y = y0 + r() * (y1 - y0)
    for (let i = 0; i < n; i++) {
      creatures.push({
        kind,
        u,
        xOff: -dir * i * (8 + r() * 6),
        y: y + (r() - 0.5) * 22,
        speed: speed * (0.95 + r() * 0.1),
        dir,
        phase: r() * 6.28,
        amp: 2 + r() * 3,
        freq: 0.8 + r() * 0.6,
      })
    }
  }

  const solo = (
    kind: CreatureKind,
    count: number,
    y0: number,
    y1: number,
    sp0: number,
    sp1: number,
    amp: number,
  ): void => {
    for (let i = 0; i < count; i++) {
      creatures.push({
        kind,
        u: r(),
        xOff: 0,
        y: y0 + ((i + r() * 0.8) / count) * (y1 - y0),
        speed: sp0 + r() * (sp1 - sp0),
        dir: dirOf(),
        phase: r() * 6.28,
        amp: amp * (0.6 + r() * 0.8),
        freq: 0.5 + r() * 0.5,
      })
    }
  }

  // Sunlight zone
  for (let i = 0; i < 3; i++) school('fishOrange', 5, 60, 860, 16)
  for (let i = 0; i < 3; i++) school('fishTang', 4, 60, 860, 12)
  for (let i = 0; i < 2; i++) school('fishYellow', 5, 80, 860, 14)

  // Twilight zone
  solo('jelly', 7, 960, 1740, 3, 7, 26)
  solo('squid', 2, 1050, 1700, 9, 14, 18)
  for (let i = 0; i < 3; i++) school('lantern', 5, 1000, 1750, 10)

  // Midnight zone
  solo('angler', 2, 1950, 2600, 6, 10, 10)
  solo('jellyGlow', 6, 1860, 2640, 3, 6, 24)
  for (let i = 0; i < 2; i++) school('lantern', 5, 1900, 2600, 9)
  creatures.push({ kind: 'sub', u: 0.3, xOff: 0, y: 2220, speed: 7, dir: 1, phase: 1, amp: 5, freq: 0.5 })

  // Abyssal zone
  solo('dumbo', 3, 2800, 3500, 4, 8, 14)
  solo('eel', 2, 2900, 3450, 10, 14, 14)
  solo('jellyGlow', 2, 2780, 3500, 3, 5, 22)
  solo('angler', 1, 3100, 3300, 5, 7, 8)

  // Hadal zone
  solo('snail', 5, 3660, 4400, 6, 10, 16)
  solo('jellyRare', 2, 3700, 4300, 2, 4, 22)
  solo('eel', 1, 3900, 4200, 9, 11, 12)
  solo('dumbo', 1, 4000, 4200, 4, 6, 10)

  // Wall-attached scenery
  const strip = (
    side: 0 | 1,
    y0: number,
    y1: number,
    gap0: number,
    gap1: number,
    picks: Array<[PropKind, number]>,
  ): void => {
    let y = y0 + r() * gap0
    while (y < y1) {
      props.push({ side, y, sprite: pickWeighted(r, picks), seed: Math.floor(r() * 1e6) })
      y += gap0 + r() * (gap1 - gap0)
    }
  }

  for (const side of [0, 1] as const) {
    strip(side, 30, 880, 28, 56, [
      ['coralPink', 3],
      ['coralOrange', 3],
      ['coralPurple', 3],
      ['fan', 2],
      ['moundOrange', 2],
      ['moundYellow', 2],
      ['sponge', 2],
      ['anemone', 3],
      ['kelp', 4],
    ])
    strip(side, 900, 1250, 55, 90, [
      ['coralPurple', 2],
      ['fan', 1],
      ['sponge', 2],
      ['moundYellow', 1],
      ['boulderS', 2],
    ])
    strip(side, 1250, 1790, 80, 140, [
      ['boulderS', 3],
      ['sponge', 1],
      ['tubeworm', 2],
    ])
    strip(side, 1800, 2690, 70, 130, [
      ['glowAnemone', 4],
      ['tubeworm', 2],
      ['boulderS', 2],
      ['boulderL', 1],
    ])
    strip(side, 2700, 3590, 90, 150, [
      ['tubeworm', 3],
      ['boulderL', 3],
      ['boulderS', 2],
      ['crystal', 1],
    ])
    strip(side, 3600, FLOOR_Y - 60, 100, 180, [
      ['boulderL', 3],
      ['crystal', 3],
      ['tubeworm', 1],
      ['boulderS', 1],
    ])
  }

  props.sort((a, b) => a.y - b.y)
  return { creatures, props }
}

export const ZONE_STARTS = [0, 1, 2, 3, 4].map((i) => i * ZONE_H)
