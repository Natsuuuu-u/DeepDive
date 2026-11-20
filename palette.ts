import { BG_TOP, FLOOR_Y, SURFACE_Y, ZONE_COUNT, ZONE_H } from './constants'
import { makeStops, mixRgb, rgbCss, sampleStops, type RGB } from './color'
import { clamp } from './rng'

const WATER = makeStops([
  [SURFACE_Y, '#5fd6f7'],
  [250, '#2eaaf0'],
  [900, '#1e7fd6'],
  [1350, '#1a58b0'],
  [1800, '#133a7c'],
  [2250, '#0d2557'],
  [2700, '#081738'],
  [3300, '#050d22'],
  [3900, '#03070f'],
  [4500, '#030409'],
  [FLOOR_Y + 220, '#05030b'],
])

const ROCK = makeStops([
  [SURFACE_Y, '#4a8aa4'],
  [900, '#32698f'],
  [1800, '#1f3b66'],
  [2700, '#13203f'],
  [3600, '#0c1328'],
  [FLOOR_Y + 40, '#0b0714'],
])

const SKY = makeStops([
  [-BG_TOP, '#3b98e8'],
  [SURFACE_Y - 40, '#8fd8fb'],
  [SURFACE_Y, '#c9f3ff'],
])

export const waterColor = (y: number): RGB => sampleStops(WATER, y)
export const rockColor = (y: number): RGB => sampleStops(ROCK, y)

export const zoneAt = (y: number): number => clamp(Math.floor(y / ZONE_H), 0, ZONE_COUNT - 1)

/** Colour fogged sprites blend towards, one per zone. */
export const FOG_TARGETS: RGB[] = Array.from({ length: ZONE_COUNT }, (_, i) =>
  waterColor(i * ZONE_H + ZONE_H * 0.6),
)

export interface RockStyle {
  fill: string
  rim: string
  dark: string
  light: string
}

const rockCache = new Map<number, RockStyle>()

/** Rock palette for a 5px band of the world (banded on purpose for the pixel look). */
export function rockStyle(band: number): RockStyle {
  const hit = rockCache.get(band)
  if (hit) return hit
  const base = rockColor(band * 5)
  const style: RockStyle = {
    fill: rgbCss(base),
    rim: rgbCss(mixRgb(base, [255, 255, 255], 0.3)),
    dark: rgbCss(mixRgb(base, [0, 0, 0], 0.32)),
    light: rgbCss(mixRgb(base, [255, 255, 255], 0.12)),
  }
  rockCache.set(band, style)
  return style
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/**
 * One tall, 64px-wide strip holding the whole water column (and sky) with ordered
 * dithering. The renderer just blits a window of it each frame.
 */
export function createBackground(): HTMLCanvasElement {
  const w = 64
  const h = BG_TOP + FLOOR_Y + 260
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(w, h)
  const d = img.data
  const step = 11
  for (let y = 0; y < h; y++) {
    const wy = y - BG_TOP
    const base = wy < SURFACE_Y ? sampleStops(SKY, wy) : waterColor(wy)
    for (let x = 0; x < w; x++) {
      const th = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * step
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        d[i + c] = clamp(Math.round((base[c] + th) / step) * step, 0, 255)
      }
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}
