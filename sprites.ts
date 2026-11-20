import { hexToRgb, mixRgb, type RGB } from './color'
import { FOG_TARGETS } from './palette'
import { mulberry32 } from './rng'

/* ------------------------------------------------------------------ */
/* Sprite definition + cached, fog-tinted canvases                      */
/* ------------------------------------------------------------------ */

export interface PaletteEntry {
  c: RGB
  glow: boolean
}

export interface SpriteDef {
  name: string
  w: number
  h: number
  frames: string[][]
  palette: Record<string, PaletteEntry>
  hasGlow: boolean
}

type PaletteInput = Record<string, string | { c: string; glow: true }>

export function defineSprite(name: string, frames: string[][], pal: PaletteInput): SpriteDef {
  const w = Math.max(...frames.map((f) => Math.max(...f.map((r) => r.length))))
  const h = Math.max(...frames.map((f) => f.length))
  const fixed = frames.map((f) => {
    const rows = f.map((r) => (r.length < w ? r.padEnd(w, '.') : r))
    while (rows.length < h) rows.push('.'.repeat(w))
    return rows
  })
  const palette: Record<string, PaletteEntry> = {}
  let hasGlow = false
  for (const [k, v] of Object.entries(pal)) {
    if (typeof v === 'string') palette[k] = { c: hexToRgb(v), glow: false }
    else {
      palette[k] = { c: hexToRgb(v.c), glow: true }
      hasGlow = true
    }
  }
  return { name, w, h, frames: fixed, palette, hasGlow }
}

export const FOG_LEVELS = 8
export const MAX_FOG = 0.82

const cache = new Map<string, HTMLCanvasElement>()

export function spriteCanvas(
  def: SpriteDef,
  frame: number,
  flip: boolean,
  fogLevel: number,
  zone: number,
): HTMLCanvasElement {
  const z = fogLevel === 0 ? 0 : zone
  const key = `${def.name}|${frame}|${flip ? 1 : 0}|${fogLevel}|${z}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = def.w
  canvas.height = def.h
  const ctx = canvas.getContext('2d')!
  const fogAmt = (fogLevel / (FOG_LEVELS - 1)) * MAX_FOG
  const target = FOG_TARGETS[z]
  const rows = def.frames[frame % def.frames.length]
  for (let y = 0; y < def.h; y++) {
    const row = rows[y]
    for (let x = 0; x < def.w; x++) {
      const ch = row[x]
      if (!ch || ch === '.') continue
      const entry = def.palette[ch]
      if (!entry) continue
      const col = entry.glow || fogAmt === 0 ? entry.c : mixRgb(entry.c, target, fogAmt)
      ctx.fillStyle = `rgb(${Math.round(col[0])},${Math.round(col[1])},${Math.round(col[2])})`
      ctx.fillRect(flip ? def.w - 1 - x : x, y, 1, 1)
    }
  }
  cache.set(key, canvas)
  return canvas
}

export interface DrawOpts {
  flip?: boolean
  fog?: number
  zone?: number
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  def: SpriteDef,
  frame: number,
  x: number,
  y: number,
  opts: DrawOpts = {},
): void {
  const f = ((frame % def.frames.length) + def.frames.length) % def.frames.length
  ctx.drawImage(
    spriteCanvas(def, f, !!opts.flip, opts.fog ?? 0, opts.zone ?? 0),
    Math.round(x),
    Math.round(y),
  )
}

/* ------------------------------------------------------------------ */
/* Tiny grid toolkit for procedural sprites                             */
/* ------------------------------------------------------------------ */

class Grid {
  cells: string[][]
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'))
  }
  set(x: number, y: number, ch: string): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.cells[y][x] = ch
  }
  get(x: number, y: number): string {
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.cells[y][x] : '.'
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch: string): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch)
  }
  line(x0: number, y0: number, x1: number, y1: number, ch: string): void {
    let x = Math.round(x0)
    let y = Math.round(y0)
    const tx = Math.round(x1)
    const ty = Math.round(y1)
    const dx = Math.abs(tx - x)
    const dy = -Math.abs(ty - y)
    const sx = x < tx ? 1 : -1
    const sy = y < ty ? 1 : -1
    let err = dx + dy
    for (let i = 0; i < 200; i++) {
      this.set(x, y, ch)
      if (x === tx && y === ty) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
  }
  rows(): string[] {
    return this.cells.map((r) => r.join(''))
  }
}

/* ------------------------------------------------------------------ */
/* Procedural generators                                                */
/* ------------------------------------------------------------------ */

function branchCoral(seed: number, w: number, h: number): string[] {
  const g = new Grid(w, h)
  const r = mulberry32(seed)
  const grow = (x: number, y: number, ang: number, len: number, depth: number): void => {
    const x1 = x + Math.cos(ang) * len
    const y1 = y - Math.sin(ang) * len
    g.line(x, y, x1, y1, depth >= 3 ? 't' : 'c')
    if (depth < 3) {
      grow(x1, y1, ang - (0.4 + r() * 0.5), len * (0.62 + r() * 0.15), depth + 1)
      grow(x1, y1, ang + (0.4 + r() * 0.5), len * (0.62 + r() * 0.15), depth + 1)
      if (r() > 0.55) grow(x1, y1, ang + (r() - 0.5) * 0.3, len * 0.7, depth + 1)
    }
  }
  grow(w / 2, h - 1, Math.PI / 2, h * 0.36, 0)
  g.line(w / 2 + 1, h - 1, w / 2 + 1, h - 3, 'c')
  return g.rows()
}

function fanCoral(w: number, h: number): string[] {
  const g = new Grid(w, h)
  const cx = (w - 1) / 2
  for (let i = 0; i <= 8; i++) {
    const ang = Math.PI * (0.12 + (0.76 * i) / 8)
    g.line(cx, h - 1, cx + Math.cos(ang) * (h - 1), h - 1 - Math.sin(ang) * (h - 1), 'c')
  }
  for (const rad of [h * 0.55, h - 1]) {
    for (let a = 0.12; a <= 0.88; a += 0.035) {
      const ang = Math.PI * a
      g.set(Math.round(cx + Math.cos(ang) * rad), Math.round(h - 1 - Math.sin(ang) * rad), 't')
    }
  }
  g.line(cx, h - 1, cx, h - 3, 'c')
  return g.rows()
}

function moundCoral(w: number, h: number): string[] {
  const g = new Grid(w, h)
  const cx = (w - 1) / 2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w / 2)
      const dy = (y - (h - 1)) / h
      if (dx * dx + dy * dy <= 1) g.set(x, y, Math.sin(x * 1.4 + y * 0.9) > 0.3 ? 'd' : 'c')
    }
  }
  return g.rows()
}

function spongeTubes(): string[] {
  const g = new Grid(13, 12)
  const tubes: Array<[number, number]> = [
    [0, 8],
    [4, 11],
    [8, 7],
  ]
  for (const [x0, ht] of tubes) {
    for (let y = 12 - ht; y < 12; y++) g.rect(x0, y, x0 + 3, y, 'c')
    g.rect(x0, 12 - ht, x0 + 3, 12 - ht, 'l')
    g.rect(x0 + 1, 12 - ht, x0 + 2, 12 - ht, 'i')
  }
  return g.rows()
}

function anemone(frame: number): string[] {
  const g = new Grid(11, 11)
  g.rect(1, 8, 9, 10, 'b')
  g.rect(2, 7, 8, 7, 'b')
  for (let i = 0; i < 9; i++) {
    const x = 1 + i
    const len = 4 + (i % 3)
    const dx = frame === 0 ? (i % 2 ? 1 : -1) : i % 2 ? -1 : 1
    g.line(x, 7, x + dx, 7 - len, 'a')
    g.set(x + dx, 7 - len, 't')
  }
  return g.rows()
}

function tubeworms(seed: number): string[] {
  const g = new Grid(11, 14)
  const r = mulberry32(seed)
  for (let i = 0; i < 5; i++) {
    const x = 1 + i * 2
    const ht = 5 + Math.floor(r() * 7)
    g.rect(x, 14 - ht, x, 13, 'w')
    g.set(x, 13 - ht, 'r')
    g.set(x - 1, 14 - ht, 'r')
    g.set(x + 1, 14 - ht, 'r')
  }
  return g.rows()
}

function crystals(seed: number, w: number, h: number, n: number): string[] {
  const g = new Grid(w, h)
  const r = mulberry32(seed)
  for (let i = 0; i < n; i++) {
    const bx = 1 + Math.floor(((w - 2) * (i + 0.5)) / n)
    const ht = h * (0.55 + r() * 0.45)
    const lean = (r() - 0.5) * 5
    const tx = bx + lean
    const ty = h - ht
    g.line(bx, h - 1, tx, ty, 'k')
    g.line(bx + 1, h - 1, tx, ty + 1, 'k')
    g.line(bx + lean * 0.5, h - 1 - ht * 0.5, tx, ty, 'g')
  }
  return g.rows()
}

function boulder(seed: number, w: number, h: number): string[] {
  const g = new Grid(w, h)
  const r = mulberry32(seed)
  const cx = (w - 1) / 2
  const cy = h - 1
  const bump = Array.from({ length: w }, () => 0.9 + r() * 0.22)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / ((w / 2) * bump[x])
      const dy = (y - cy) / h
      if (dx * dx + dy * dy <= 1) {
        const light = -(x - cx) / w - (y - cy) / h * 0.6 + (r() - 0.5) * 0.25
        g.set(x, y, light > 0.35 ? 'a' : light > 0.08 ? 'b' : light > -0.2 ? 'c' : 'd')
      }
    }
  }
  for (let i = 0; i < w; i++) {
    const x = Math.floor(r() * w)
    const y = Math.floor(r() * h)
    if (g.get(x, y) !== '.') g.set(x, y, 's')
  }
  return g.rows()
}

function fishFrames(photophores: boolean): string[][] {
  const belly = photophores ? '.bgbgbgb.t' : '.bbbbbbb.t'
  const bellyB = photophores ? '.bgbgbgbT.' : '.bbbbbbbT.'
  return [
    ['...oooo...', '.ooooooo.t', 'ooooEoooTT', belly, '...bbb....'],
    ['...oooo...', '.oooooooT.', 'ooooEoooTT', bellyB, '...bbb....'],
  ]
}

function submarine(): string[] {
  const g = new Grid(28, 15)
  const cx = 14
  const cy = 9
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < 28; x++) {
      const dx = (x + 0.5 - cx) / 12.5
      const dy = (y + 0.5 - cy) / 5.2
      if (dx * dx + dy * dy <= 1) g.set(x, y, y <= 6 ? 'W' : y <= 9 ? 'Y' : 'O')
    }
  }
  g.rect(10, 3, 16, 5, 'W')
  g.rect(11, 2, 15, 2, 'W')
  g.rect(13, 0, 13, 1, 'k')
  g.rect(0, 6, 1, 12, 'k')
  g.rect(2, 9, 3, 9, 'k')
  g.rect(17, 7, 20, 10, 'k')
  g.rect(18, 8, 19, 9, 'G')
  g.set(18, 8, 'H')
  g.rect(26, 8, 27, 10, 'L')
  return g.rows()
}

function boat(): string[] {
  const g = new Grid(34, 20)
  for (let y = 12; y <= 17; y++) g.rect(2 + (y - 12), y, 31 - (y - 12), y, y === 12 ? 'r' : y === 17 ? 'd' : 'h')
  g.rect(9, 6, 20, 11, 'w')
  g.rect(8, 5, 21, 5, 'r')
  g.rect(11, 7, 13, 9, 'g')
  g.rect(16, 7, 18, 9, 'g')
  g.rect(25, 0, 25, 11, 'm')
  g.line(25, 2, 31, 6, 'm')
  g.rect(26, 0, 30, 1, 'f')
  g.set(31, 7, 'm')
  g.set(31, 8, 'm')
  return g.rows()
}

const BELL_A = ['..bbbbb..', '.bBBbbbb.', 'bbBbbbbbb', 'bbbbbbbbb', '.b.b.b.b.']
const BELL_B = ['...bbb...', '..bBBbb..', '.bbBbbbb.', '.bbbbbbb.', '..b.b.b..']
const TENT_A = ['.t.t.t.t.', '..t.t.t..', '.t.t.t.t.', '..t.t.t..', '.t..t..t.', '..t.....t']
const TENT_B = ['.t.t.t.t.', '.t.t.t.t.', '..t.t.t..', '.t.t.t.t.', '..t..t.t.', '.t.....t.']
const JELLY_FRAMES = [
  [...BELL_A, ...TENT_A],
  [...BELL_B, ...TENT_B],
]

/* ------------------------------------------------------------------ */
/* Sprite catalogue                                                     */
/* ------------------------------------------------------------------ */

const DIVER_A = [
  '....BBBB....',
  '..BBBBBBBB..',
  '.BBBGGGGBBBL',
  '.BBGWGGGGBB.',
  '.BBGGGGggBB.',
  '.BBBGGggBBB.',
  '..BBBBBBBB..',
  '...bbbbbb...',
  '..YYYYYYYY..',
  '.YYYYyyYYYY.',
  'kYYYYyyYYYYk',
  '.YYYYYYYYYY.',
  '..YYYYYYYY..',
  '..YYY..YYY..',
  '..YYY..YYY..',
  '.kkkk..kkkk.',
]
const DIVER_B = [
  ...DIVER_A.slice(0, 13),
  '..YYY...YYY.',
  '..YYY...YYY.',
  '.kkkk...kkkk',
]

export const SPRITES = {
  diver: defineSprite('diver', [DIVER_A, DIVER_B], {
    B: '#e3b341',
    b: '#a97c1e',
    G: '#7fe9ff',
    g: '#2aa4c8',
    W: '#ffffff',
    Y: '#f2a33a',
    y: '#c4761c',
    k: '#2b2430',
    L: { c: '#fff2a8', glow: true },
  }),
  fishOrange: defineSprite('fishOrange', fishFrames(false), {
    o: '#ff9a3c',
    b: '#ffd08a',
    E: '#101020',
    T: '#ff6a2a',
    t: '#ff6a2a',
  }),
  fishTang: defineSprite('fishTang', fishFrames(false), {
    o: '#2f7df0',
    b: '#7fb6ff',
    E: '#101020',
    T: '#ffd23a',
    t: '#ffd23a',
  }),
  fishYellow: defineSprite('fishYellow', fishFrames(false), {
    o: '#ffe14d',
    b: '#fff3a8',
    E: '#101020',
    T: '#ff9a3c',
    t: '#ff9a3c',
  }),
  lantern: defineSprite('lantern', fishFrames(true), {
    o: '#5a7a98',
    b: '#a8c0d8',
    E: '#06101c',
    T: '#3d5670',
    t: '#3d5670',
    g: { c: '#7dffe9', glow: true },
  }),
  snail: defineSprite('snail', fishFrames(false), {
    o: { c: '#cfdcff', glow: true },
    b: { c: '#f0f4ff', glow: true },
    E: '#0b1020',
    T: { c: '#9db4ff', glow: true },
    t: { c: '#9db4ff', glow: true },
  }),
  jelly: defineSprite('jelly', JELLY_FRAMES, { b: '#f7b6ea', B: '#ffe9fb', t: '#d98ad2' }),
  jellyGlow: defineSprite('jellyGlow', JELLY_FRAMES, {
    b: { c: '#4fe8ff', glow: true },
    B: { c: '#d8ffff', glow: true },
    t: { c: '#2aa9d6', glow: true },
  }),
  jellyRare: defineSprite('jellyRare', JELLY_FRAMES, {
    b: { c: '#c58bff', glow: true },
    B: { c: '#f0dcff', glow: true },
    t: { c: '#8c58d6', glow: true },
  }),
  squid: defineSprite(
    'squid',
    [
      [
        '....m....',
        '...mmm...',
        '..mmmmm..',
        '..mmmmm..',
        '.mmmmmmm.',
        '.mmEmmEm.',
        '.mmmmmmm.',
        '..mmmmm..',
        '..t.t.t..',
        '..t.t.t..',
        '.t..t..t.',
        '.t..t..t.',
        '..t.t.t..',
      ],
      [
        '....m....',
        '...mmm...',
        '..mmmmm..',
        '..mmmmm..',
        '.mmmmmmm.',
        '.mmEmmEm.',
        '.mmmmmmm.',
        '..mmmmm..',
        '..t.t.t..',
        '.t.t.t.t.',
        '.t.....t.',
        '..t...t..',
        '...t.t...',
      ],
    ],
    { m: '#d4607a', E: '#ffffff', t: '#b24a64' },
  ),
  angler: defineSprite(
    'angler',
    [
      [
        '............ggg.',
        '............gGg.',
        '.............r..',
        '..........rrr...',
        '.....dddddd.....',
        '...dddddddddd...',
        '..dddddddEdddd..',
        '.dddddddddddddd.',
        '.tddddddwdwdwdw.',
        '.ttddddddddddd..',
        '..tt.dddddddd...',
        '...ttt..dd......',
      ],
      [
        '............ggg.',
        '............gGg.',
        '............r...',
        '..........rrr...',
        '.....dddddd.....',
        '...dddddddddd...',
        '..dddddddEdddd..',
        '.dddddddddddddd.',
        'ttddddddwdwdwdw.',
        '.ttddddddddddd..',
        '.ttt.dddddddd...',
        '..tt....dd......',
      ],
    ],
    {
      d: '#2b2347',
      t: '#3d3260',
      r: '#3d3260',
      w: '#e8f0ff',
      E: { c: '#ffe14d', glow: true },
      g: { c: '#8ff7ff', glow: true },
      G: { c: '#ffffff', glow: true },
    },
  ),
  dumbo: defineSprite(
    'dumbo',
    [
      [
        '.....ooo.....',
        '...ooooooo...',
        '.eeoooooooee.',
        'eeoooEoEoooee',
        '.eeoooooooee.',
        '...ooooooo...',
        '...o.o.o.o...',
        '..t.t.t.t.t..',
        '.t..t.t..t...',
      ],
      [
        '.....ooo.....',
        '...ooooooo...',
        '..eoooooooe..',
        '.eeoooEoEooee',
        'eeoooooooooee',
        '.e.ooooooo.e.',
        '...o.o.o.o...',
        '..t.t.t.t.t..',
        '.t..t.t..t...',
      ],
    ],
    { o: '#e9a8c8', e: '#f6c9e0', E: '#101018', t: '#c98bb0' },
  ),
  sub: defineSprite('sub', [submarine()], {
    W: '#f4f1e6',
    Y: '#f2c14e',
    O: '#d9822b',
    k: '#2a2a35',
    G: '#6fe3ff',
    H: '#ffffff',
    L: { c: '#fff6b0', glow: true },
  }),
  boat: defineSprite('boat', [boat()], {
    h: '#8a4b2a',
    r: '#d94b4b',
    d: '#5a2f1a',
    w: '#f4f1e6',
    g: '#5fb4e8',
    m: '#3a2a1e',
    f: '#ffd23a',
  }),
  coralPink: defineSprite('coralPink', [branchCoral(3, 14, 16)], { c: '#ff5f9a', t: '#ffc3da' }),
  coralOrange: defineSprite('coralOrange', [branchCoral(7, 12, 14)], { c: '#ff8a3d', t: '#ffd9a6' }),
  coralPurple: defineSprite('coralPurple', [branchCoral(11, 13, 15)], { c: '#a45df0', t: '#e0c2ff' }),
  fan: defineSprite('fan', [fanCoral(15, 12)], { c: '#d44fb0', t: '#ff9be0' }),
  moundOrange: defineSprite('moundOrange', [moundCoral(14, 8)], { c: '#ffae42', d: '#e07a1f' }),
  moundYellow: defineSprite('moundYellow', [moundCoral(12, 7)], { c: '#ffe066', d: '#e0a82e' }),
  sponge: defineSprite('sponge', [spongeTubes()], { c: '#f2c14e', l: '#fff0a0', i: '#7a5a12' }),
  anemone: defineSprite('anemone', [anemone(0), anemone(1)], { b: '#8a3a8a', a: '#ff6ec7', t: '#ffd0f0' }),
  glowAnemone: defineSprite('glowAnemone', [anemone(0), anemone(1)], {
    b: '#1e2a5a',
    a: { c: '#35d6ff', glow: true },
    t: { c: '#e0ffff', glow: true },
  }),
  tubeworm: defineSprite('tubeworm', [tubeworms(5)], { w: '#cfd3e6', r: { c: '#ff4a6a', glow: true } }),
  crystal: defineSprite('crystal', [crystals(9, 12, 14, 3)], {
    k: '#3a2a6a',
    g: { c: '#b58bff', glow: true },
  }),
  crystalBig: defineSprite('crystalBig', [crystals(21, 18, 28, 4)], {
    k: '#3a2a6a',
    g: { c: '#c8a2ff', glow: true },
  }),
  boulderS: defineSprite('boulderS', [boulder(4, 12, 9)], {
    a: '#8a97ad',
    b: '#6b7893',
    c: '#4d5974',
    d: '#353f58',
    s: '#252c40',
  }),
  boulderL: defineSprite('boulderL', [boulder(8, 22, 16)], {
    a: '#8a97ad',
    b: '#6b7893',
    c: '#4d5974',
    d: '#353f58',
    s: '#252c40',
  }),
} as const

export type SpriteKey = keyof typeof SPRITES
