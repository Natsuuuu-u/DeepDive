import { BG_TOP, DIVER_SCREEN_Y, FLOOR_Y, SURFACE_Y, WORLD_H } from './constants'
import { FOG_TARGETS, createBackground, rockStyle, zoneAt } from './palette'
import { clamp, hash1, lerp, mod, smoothNoise } from './rng'
import { mixRgb, rgbCss, type RGB } from './color'
import { FOG_LEVELS, MAX_FOG, SPRITES, drawSprite, type SpriteDef, type SpriteKey } from './sprites'
import { generateWorld, type Creature, type CreatureKind, type Prop } from './world'
import { getDepthFraction } from '../lib/depth'

interface Particle {
  u: number
  v: number
  layer: 0 | 1 | 2
  ph: number
  glow: boolean
}

interface Bubble {
  x: number
  y: number
  r: number
  age: number
  seed: number
}

const CREATURE_SPRITE: Record<Exclude<CreatureKind, 'eel'>, SpriteKey> = {
  fishOrange: 'fishOrange',
  fishTang: 'fishTang',
  fishYellow: 'fishYellow',
  lantern: 'lantern',
  snail: 'snail',
  jelly: 'jelly',
  jellyGlow: 'jellyGlow',
  jellyRare: 'jellyRare',
  squid: 'squid',
  angler: 'angler',
  dumbo: 'dumbo',
  sub: 'sub',
}

const PARTICLE_COLORS = ['#ffffff', '#cfe0ff', '#9fb6e8', '#7f9cd0', '#9a88d8']
const EEL_RGB: RGB = [74, 52, 104]
const KELP_A: RGB = [47, 158, 91]
const KELP_B: RGB = [82, 196, 122]
const RAYS = 6

const fogCache = new Map<string, string>()
function fogCss(base: RGB, level: number, zone: number): string {
  const key = `${base.join(',')}|${level}|${zone}`
  let s = fogCache.get(key)
  if (!s) {
    s = rgbCss(mixRgb(base, FOG_TARGETS[zone], (level / (FOG_LEVELS - 1)) * MAX_FOG))
    fogCache.set(key, s)
  }
  return s
}

const WALL_STOPS: Array<[number, number]> = [
  [-60, 5],
  [400, 9],
  [900, 12],
  [1500, 16],
  [2200, 22],
  [3000, 30],
  [3600, 40],
  [4200, 58],
  [4600, 74],
]

function wallBase(wy: number): number {
  if (wy <= WALL_STOPS[0][0]) return WALL_STOPS[0][1]
  for (let i = 1; i < WALL_STOPS.length; i++) {
    if (wy <= WALL_STOPS[i][0]) {
      const [y0, v0] = WALL_STOPS[i - 1]
      const [y1, v1] = WALL_STOPS[i]
      return lerp(v0, v1, (wy - y0) / (y1 - y0))
    }
  }
  return WALL_STOPS[WALL_STOPS.length - 1][1]
}

function wallW(wy: number, side: 0 | 1, scale: number): number {
  const base = wallBase(wy)
  const amp = 6 + clamp(wy / WORLD_H, 0, 1) * 14
  const n = smoothNoise(wy / 14, side * 977) * 0.9 + smoothNoise(wy / 5, side * 31 + 7) * 0.35
  return Math.max(2, Math.round((base + (n - 0.6) * amp) * scale))
}

function fillDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(r * r - dy * dy))
    ctx.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1)
  }
}

/** Soft, stepped halo in additive blend: reads as light, stays pixel-art. */
function halo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  alpha: number,
  steps = 3,
): void {
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = color
  ctx.globalAlpha = alpha
  for (let i = 0; i < steps; i++) fillDisc(ctx, Math.round(cx), Math.round(cy), Math.max(1, Math.round(r * (1 - i / steps))))
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

export class OceanRenderer {
  private w = 320
  private h = 200
  private t = 0
  private targetY = 0
  private diverY = 0
  private camY = 0
  private vy = 0
  private reduce = false
  private needSnap = true
  private readonly bg = createBackground()
  private readonly creatures: Creature[]
  private readonly props: Prop[]
  private readonly parts: Particle[]
  private bubbles: Bubble[] = []
  private bubbleTimer = 0
  private wl = new Int16Array(200)
  private wr = new Int16Array(200)
  private cx = 160
  private cy = 80
  private lampR = 30
  private ws = 1

  constructor() {
    const world = generateWorld()
    this.creatures = world.creatures
    this.props = world.props
    this.parts = Array.from({ length: 140 }, (_, i) => ({
      u: hash1(i * 3 + 1),
      v: hash1(i * 3 + 2),
      layer: (i % 3) as 0 | 1 | 2,
      ph: hash1(i * 3 + 3) * 6.28,
      glow: i % 7 === 0,
    }))
  }

  setSize(w: number, h: number): void {
    this.w = w
    this.h = h
    this.wl = new Int16Array(h)
    this.wr = new Int16Array(h)
    this.needSnap = true
  }

  setReduceMotion(v: boolean): void {
    this.reduce = v
  }

  setTargetScore(score: number, snap = false): void {
    this.targetY = getDepthFraction(score) * WORLD_H
    if (snap) this.needSnap = true
  }

  /** Test hook: jump straight to a world depth. */
  debugSetDepth(worldY: number): void {
    this.targetY = worldY
    this.needSnap = true
  }

  private camTarget(): number {
    return this.diverY - this.h * DIVER_SCREEN_Y
  }

  frame(ctx: CanvasRenderingContext2D, dtIn: number): void {
    const dt = Math.min(0.05, Math.max(0, dtIn))
    const { w, h } = this
    if (this.needSnap) {
      this.diverY = this.targetY
      this.camY = this.camTarget()
      this.needSnap = false
    }
    this.t += dt * (this.reduce ? 0.2 : 1)
    const t = this.t

    const prev = this.diverY
    this.diverY += (this.targetY - this.diverY) * (1 - Math.exp(-dt * (this.reduce ? 6 : 1.7)))
    this.vy = dt > 0 ? (this.diverY - prev) / dt : 0
    this.camY += (this.camTarget() - this.camY) * (1 - Math.exp(-dt * (this.reduce ? 6 : 0.85)))
    const ds = this.diverY - this.camY
    if (ds < h * 0.22) this.camY = this.diverY - h * 0.22
    else if (ds > h * 0.66) this.camY = this.diverY - h * 0.66

    let shakeX = 0
    let shakeY = 0
    if (!this.reduce && this.diverY > 3500) {
      const k = clamp((this.diverY - 3500) / 1000, 0, 1)
      const pulse = Math.pow(Math.max(0, Math.sin(t * 0.6)), 10)
      const amp = k * (0.6 + pulse * 1.6)
      shakeX = Math.round((smoothNoise(t * 14, 3) - 0.5) * 2 * amp)
      shakeY = Math.round((smoothNoise(t * 13, 9) - 0.5) * 2 * amp)
    }
    const camX = (this.reduce ? 0 : Math.round(Math.sin(t * 0.21) * 2)) + shakeX
    const camYi = Math.round(this.camY) + shakeY

    this.ws = clamp(w / 360, 0.5, 1.25)
    this.cx = Math.round(w / 2)
    this.cy = Math.round(this.diverY - camYi)
    const dark = clamp(this.diverY / 2400, 0, 1)
    this.lampR = Math.round(lerp(26, 62, dark))

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    this.drawBackground(ctx, camYi)
    this.drawSky(ctx, camYi, camX, t)
    this.drawRays(ctx, camYi, camX, t)
    this.drawParticles(ctx, camYi, camX, t, 0, 1)
    this.drawCreatures(ctx, camYi, camX, t)
    this.drawWalls(ctx, camYi, camX)
    this.drawProps(ctx, camYi, camX, t)
    this.drawFloor(ctx, camYi, camX, t)
    this.updateBubbles(dt)
    this.drawDiver(ctx, camYi, t)
    this.drawBubbles(ctx, camYi, camX)
    this.drawParticles(ctx, camYi, camX, t, 2, 2)
    this.drawLamp(ctx, camYi, dark)
  }

  /* ---------------------------- helpers ---------------------------- */

  private fogLevel(worldY: number, sx: number, sy: number): number {
    const base = Math.min(MAX_FOG, Math.pow(Math.max(0, worldY) / 3000, 0.85))
    const infl = clamp(1 - Math.hypot(sx - this.cx, sy - this.cy) / this.lampR, 0, 1)
    const f = base * (1 - 0.85 * infl)
    return clamp(Math.round((f / MAX_FOG) * (FOG_LEVELS - 1)), 0, FOG_LEVELS - 1)
  }

  /* --------------------------- background -------------------------- */

  private drawBackground(ctx: CanvasRenderingContext2D, camYi: number): void {
    const srcY = clamp(camYi + BG_TOP, 0, this.bg.height - this.h)
    for (let x = 0; x < this.w; x += 64) ctx.drawImage(this.bg, 0, srcY, 64, this.h, x, 0, 64, this.h)
  }

  private drawSky(ctx: CanvasRenderingContext2D, camYi: number, camX: number, t: number): void {
    const { w, h } = this
    const sy0 = SURFACE_Y - camYi
    if (sy0 < -34) return

    // sun + clouds (only while the surface is on screen)
    if (sy0 > 12) {
      const sx = Math.round(w * 0.2)
      const sy = Math.round(sy0 - 74)
      if (sy > -16) {
        halo(ctx, sx, sy, 26, '#fff2b0', 0.08, 4)
        ctx.fillStyle = '#fff6c4'
        fillDisc(ctx, sx, sy, 8)
        ctx.fillStyle = '#ffffff'
        fillDisc(ctx, sx - 1, sy - 1, 5)
      }
      for (let i = 0; i < 4; i++) {
        const cw = 26 + i * 9
        const x = mod(i * 97 + t * (2 + i * 0.7), w + 90) - 45 + camX
        const cy = Math.round(sy0 - 30 - i * 15)
        if (cy < -10 || cy > h) continue
        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.fillRect(Math.round(x + cw * 0.25), cy, Math.round(cw * 0.5), 3)
        ctx.fillRect(Math.round(x + cw * 0.1), cy + 3, Math.round(cw * 0.8), 3)
        ctx.fillRect(Math.round(x), cy + 6, cw, 3)
        ctx.fillStyle = 'rgba(190,225,255,0.9)'
        ctx.fillRect(Math.round(x + cw * 0.05), cy + 9, Math.round(cw * 0.9), 2)
      }
    }

    // boat
    const boat = SPRITES.boat
    const bx = Math.round(w * 0.78 + Math.sin(t * 0.3) * 3 + camX) - boat.w / 2
    const by = Math.round(sy0 - boat.h + 6 + Math.sin(t * 1.1) * 1)
    if (by + boat.h > 0) drawSprite(ctx, boat, 0, bx, by)

    // waterline + shimmer
    for (let x = 0; x < w; x += 2) {
      const off = Math.round(Math.sin((x + camX) * 0.12 + t * 1.6) * 1.2)
      ctx.fillStyle = '#f4fdff'
      ctx.fillRect(x, sy0 + off, 2, 1)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(x, sy0 + off + 1, 2, 1)
    }
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = '#ffffff'
    for (let k = 0; k < 46; k++) {
      const x = mod(hash1(k) * w + t * 6 * ((k % 3) + 1), w)
      const y = sy0 + 3 + Math.floor(hash1(k + 99) * 16)
      ctx.globalAlpha = 0.12 + 0.12 * Math.sin(t * 2 + k)
      ctx.fillRect(Math.round(x), y, 3, 1)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  private drawRays(ctx: CanvasRenderingContext2D, camYi: number, camX: number, t: number): void {
    if (camYi > 1700) return
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = '#d8f6ff'
    for (let i = 0; i < RAYS; i++) {
      const baseX = ((i + 0.5) / RAYS) * (this.w + 120) - 40
      const wd = 7 + ((i * 5) % 4) * 3
      for (let y = 0; y < this.h; y += 2) {
        const wy = camYi + y
        if (wy < SURFACE_Y) continue
        const f = 1 - (wy - SURFACE_Y) / 1500
        if (f <= 0) continue
        const a = Math.pow(f, 1.5) * 0.17 * (0.65 + 0.35 * Math.sin(t * 0.7 + i * 1.7))
        if (a < 0.01) continue
        ctx.globalAlpha = a
        const x = Math.round(baseX + (wy - SURFACE_Y) * 0.32 + Math.sin(t * 0.25 + i) * 8 + camX)
        ctx.fillRect(x, y, wd + Math.round((wy - SURFACE_Y) * 0.01), 2)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  /* ---------------------------- particles -------------------------- */

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    camYi: number,
    camX: number,
    t: number,
    minLayer: number,
    maxLayer: number,
  ): void {
    const { w, h } = this
    const zi = zoneAt(camYi + h / 2)
    const base = PARTICLE_COLORS[zi]
    for (const p of this.parts) {
      if (p.layer < minLayer || p.layer > maxLayer) continue
      if (p.glow && zi < 2) continue
      const par = [0.35, 0.7, 1.2][p.layer]
      const rise = [1.5, 3, 5][p.layer]
      const sx = mod(p.u * (w + 8) + Math.sin(t * 0.5 + p.ph) * 3 + camX * par * 0.5, w + 8) - 4
      const sy = mod(p.v * (h + 8) - camYi * par - t * rise, h + 8) - 4
      if (p.glow) {
        const tw = 0.3 + 0.55 * Math.pow(Math.sin(t * 2 + p.ph), 2)
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = tw
        ctx.fillStyle = p.ph > 3 ? '#78f6ff' : '#a0ffd8'
        ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1)
        ctx.globalAlpha = tw * 0.25
        ctx.fillRect(Math.round(sx) - 1, Math.round(sy), 3, 1)
        ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 3)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.globalAlpha = 0.22 + p.layer * 0.16
        ctx.fillStyle = base
        const s = p.layer === 2 && p.ph > 3 ? 2 : 1
        ctx.fillRect(Math.round(sx), Math.round(sy), s, s)
      }
    }
    ctx.globalAlpha = 1
  }

  /* ---------------------------- creatures -------------------------- */

  private drawCreatures(ctx: CanvasRenderingContext2D, camYi: number, camX: number, t: number): void {
    const { w, h } = this
    const strip = w + 80
    for (const c of this.creatures) {
      const wy = c.y + Math.sin(t * c.freq + c.phase) * c.amp
      if (wy < camYi - 40 || wy > camYi + h + 40) continue
      const x = mod(c.u * strip + c.xOff + c.dir * c.speed * t, strip) - 40 + camX

      if (c.kind === 'eel') {
        this.drawEel(ctx, c, x, wy - camYi, t)
        continue
      }

      const def: SpriteDef = SPRITES[CREATURE_SPRITE[c.kind]]
      const px = Math.round(x - def.w / 2)
      const py = Math.round(wy - camYi - def.h / 2)
      if (px < -def.w - 2 || px > w + 2) continue
      const flip = c.dir < 0
      const mx = px + def.w / 2
      const my = py + def.h / 2
      const zone = zoneAt(wy)
      const fog = this.fogLevel(wy, mx, my)
      let frame = 0
      let alpha = 1

      switch (c.kind) {
        case 'fishOrange':
        case 'fishTang':
        case 'fishYellow':
        case 'lantern':
          frame = Math.floor(t * 5 + c.phase) % 2
          if (c.kind === 'lantern') halo(ctx, mx, my + 1, 5, '#7dffe9', 0.06, 2)
          break
        case 'snail':
          frame = Math.floor(t * 4 + c.phase) % 2
          alpha = 0.7
          halo(ctx, mx, my, 11, '#a8b8ff', 0.07, 3)
          break
        case 'jelly':
          frame = Math.floor(t * 1.8 + c.phase) % 2
          alpha = 0.85
          break
        case 'jellyGlow':
          frame = Math.floor(t * 1.8 + c.phase) % 2
          alpha = 0.82
          halo(ctx, mx, my, 15, '#38e0ff', 0.1, 3)
          break
        case 'jellyRare':
          frame = Math.floor(t * 1.4 + c.phase) % 2
          alpha = 0.82
          halo(ctx, mx, my, 18, '#b07cff', 0.1, 3)
          break
        case 'squid':
          frame = Math.floor(t * 1.4 + c.phase) % 2
          break
        case 'dumbo':
          frame = Math.floor(t * 2.2 + c.phase) % 2
          break
        case 'angler': {
          frame = Math.floor(t * 2 + c.phase) % 2
          const lx = px + (flip ? def.w - 1 - 13 : 13)
          const ly = py + 1
          const flick = 0.7 + 0.3 * Math.sin(t * 3 + c.phase) + (Math.sin(t * 9 + c.phase) > 0.92 ? 0.3 : 0)
          halo(ctx, lx, ly, 20, '#9ff8ff', 0.14 * flick, 4)
          break
        }
        case 'sub':
          break
      }

      ctx.globalAlpha = alpha
      drawSprite(ctx, def, frame, px, py, { flip, fog, zone })
      ctx.globalAlpha = 1

      if (c.kind === 'sub') this.drawSubLights(ctx, px, py, def, flip, t)
    }
  }

  private drawSubLights(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    def: SpriteDef,
    flip: boolean,
    t: number,
  ): void {
    const d = flip ? -1 : 1
    const ox = flip ? px : px + def.w
    const oy = py + 9
    halo(ctx, ox, oy, 8, '#fff3c0', 0.12, 3)
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = '#fff3c0'
    for (let s = 0; s < 52; s++) {
      const hh = 1 + Math.floor(s * 0.24)
      ctx.globalAlpha = 0.11 * (1 - s / 56)
      ctx.fillRect(ox + d * s - (d < 0 ? 1 : 0), oy - hh, 1, hh * 2 + 1)
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    if (Math.sin(t * 3) > 0) {
      ctx.fillStyle = '#ff4040'
      ctx.fillRect(px + (flip ? def.w - 1 - 13 : 13), py, 1, 1)
    }
  }

  private drawEel(ctx: CanvasRenderingContext2D, c: Creature, x0: number, baseY: number, t: number): void {
    const n = 18
    const zone = zoneAt(c.y)
    const dark = Math.round(clamp(Math.hypot(x0 - this.cx, baseY - this.cy) / this.lampR, 0, 1) * 4) + 3
    const level = clamp(dark, 3, FOG_LEVELS - 1)
    for (let i = n - 1; i >= 0; i--) {
      const px = x0 - c.dir * i * 3
      const py = baseY + Math.sin(t * 2.4 + i * 0.55 + c.phase) * (2 + i * 0.15)
      const size = i < 2 ? 5 : i < 8 ? 4 : i < 13 ? 3 : 2
      ctx.fillStyle = fogCss(EEL_RGB, level, zone)
      ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, size)
      if (i < 14) {
        ctx.fillStyle = fogCss([120, 96, 160], level, zone)
        ctx.fillRect(Math.round(px - size / 2), Math.round(py - size / 2), size, 1)
      }
    }
    // eye + glowing tail tip
    ctx.fillStyle = '#ffe14d'
    ctx.fillRect(Math.round(x0 + c.dir * 1), Math.round(baseY - 2), 1, 1)
    const tx = x0 - c.dir * (n - 1) * 3
    const ty = baseY + Math.sin(t * 2.4 + (n - 1) * 0.55 + c.phase) * (2 + (n - 1) * 0.15)
    halo(ctx, tx, ty, 7, '#ff7ad0', 0.14, 3)
    ctx.fillStyle = '#ff9be0'
    ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1)
  }

  /* ------------------------------ walls ---------------------------- */

  private drawWalls(ctx: CanvasRenderingContext2D, camYi: number, camX: number): void {
    const { w, h, wl, wr, ws } = this
    for (let y = 0; y < h; y++) {
      const wy = camYi + y
      if (wy < SURFACE_Y) {
        wl[y] = 0
        wr[y] = 0
      } else {
        wl[y] = wallW(wy, 0, ws)
        wr[y] = wallW(wy, 1, ws)
      }
    }

    let cur = ''
    const use = (style: string): void => {
      if (style !== cur) {
        ctx.fillStyle = style
        cur = style
      }
    }

    // body
    for (let y = 0; y < h; y++) {
      if (wl[y] === 0) continue
      use(rockStyle(Math.floor((camYi + y) / 5)).fill)
      ctx.fillRect(-10, y, wl[y] + 10 + camX, 1)
      ctx.fillRect(w - wr[y] + camX, y, wr[y] + 10 - camX, 1)
    }
    // darker speckles then lighter speckles
    for (const pass of ['dark', 'light'] as const) {
      for (let y = 0; y < h; y++) {
        if (wl[y] === 0) continue
        const wy = camYi + y
        const r1 = hash1(wy * 13 + (pass === 'dark' ? 1 : 2))
        if (r1 > 0.55) continue
        use(rockStyle(Math.floor(wy / 5))[pass])
        ctx.fillRect(Math.floor(hash1(wy * 29 + 3) * Math.max(1, wl[y] - 2)) + camX, y, 1, 1)
        ctx.fillRect(w - 1 - Math.floor(hash1(wy * 31 + 5) * Math.max(1, wr[y] - 2)) + camX, y, 1, 1)
      }
    }
    // lit rim + ledges
    for (let y = 0; y < h; y++) {
      if (wl[y] === 0) continue
      use(rockStyle(Math.floor((camYi + y) / 5)).rim)
      ctx.fillRect(wl[y] + camX - 1, y, 1, 1)
      ctx.fillRect(w - wr[y] + camX, y, 1, 1)
      if (y > 0 && wl[y] - wl[y - 1] >= 2) ctx.fillRect(wl[y - 1] + camX, y, wl[y] - wl[y - 1], 1)
      if (y > 0 && wr[y] - wr[y - 1] >= 2) ctx.fillRect(w - wr[y] + camX, y, wr[y] - wr[y - 1], 1)
    }
  }

  private drawProps(ctx: CanvasRenderingContext2D, camYi: number, camX: number, t: number): void {
    const { w, h, ws } = this
    for (const p of this.props) {
      const bottom = Math.round(p.y - camYi)
      if (bottom < -4 || bottom - 40 > h) continue
      const ww = wallW(p.y, p.side, ws)
      const edgeX = p.side === 0 ? ww + camX : w - ww + camX
      const zone = zoneAt(p.y)
      const style = rockStyle(Math.floor(p.y / 5))

      if (p.sprite === 'kelp') {
        const ht = 18 + (p.seed % 14)
        const dirS = p.side === 0 ? 1 : -1
        const level = this.fogLevel(p.y, edgeX, bottom)
        for (let i = 0; i < ht; i += 1) {
          const sway = Math.sin(t * 1.3 + i * 0.18 + p.seed) * (1 + i * 0.12)
          const x = Math.round(edgeX + dirS * (1 + i * 0.12) + sway)
          ctx.fillStyle = fogCss(Math.floor(i / 3) % 2 ? KELP_A : KELP_B, level, zone)
          ctx.fillRect(x, bottom - i, 2, 1)
          if (i % 7 === 3) ctx.fillRect(x + dirS * 2, bottom - i, 2, 1)
        }
        continue
      }

      const def = SPRITES[p.sprite]
      if (bottom - def.h > h) continue
      const x = p.side === 0 ? edgeX - 2 : edgeX - def.w + 2
      const y = bottom - def.h
      const flip = p.side === 1
      const fog = this.fogLevel(p.y, x + def.w / 2, y + def.h / 2)
      const frame = p.sprite === 'anemone' || p.sprite === 'glowAnemone' ? Math.floor(t * 1.5 + p.seed) % 2 : 0

      // little rock shelf
      ctx.fillStyle = style.rim
      ctx.fillRect(p.side === 0 ? edgeX - 1 : x - 1, bottom, def.w + 2, 1)
      ctx.fillStyle = style.fill
      ctx.fillRect(p.side === 0 ? edgeX - 1 : x - 1, bottom + 1, def.w + 2, 2)

      if (def.hasGlow) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 2 + p.seed)
        const col = p.sprite === 'crystal' ? '#a67cff' : p.sprite === 'tubeworm' ? '#ff4a6a' : '#35d6ff'
        halo(ctx, x + def.w / 2, y + def.h * 0.3, 9, col, 0.1 * pulse, 3)
      }
      drawSprite(ctx, def, frame, x, y, { flip, fog, zone })
    }
  }

  private drawFloor(ctx: CanvasRenderingContext2D, camYi: number, camX: number, t: number): void {
    const { w, h } = this
    const top = FLOOR_Y - camYi
    if (top > h + 2) return
    const style = rockStyle(Math.floor(FLOOR_Y / 5))
    const tops: number[] = []
    for (let x = 0; x < w; x++) {
      const ft = Math.round(top + smoothNoise((x - camX) / 7, 5) * 9)
      tops.push(ft)
      ctx.fillStyle = style.fill
      ctx.fillRect(x, ft, 1, h - ft + 1)
      ctx.fillStyle = style.rim
      ctx.fillRect(x, ft, 1, 1)
      if (hash1(x * 7 + 1) < 0.18) {
        ctx.fillStyle = style.dark
        ctx.fillRect(x, ft + 2 + Math.floor(hash1(x + 40) * 10), 1, 1)
      }
    }
    // glowing crystal cluster: the bottom of the trench
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.4)
    const cx = Math.round(w * 0.5)
    halo(ctx, cx, tops[clamp(cx, 0, w - 1)] - 14, 54, '#8a4bff', 0.07 * pulse, 5)
    const big = SPRITES.crystalBig
    const placements: Array<[number, boolean]> = [
      [0.5, false],
      [0.34, true],
      [0.68, false],
    ]
    for (const [u, flip] of placements) {
      const x = Math.round(w * u - big.w / 2)
      const fx = clamp(Math.round(w * u), 0, w - 1)
      drawSprite(ctx, big, 0, x, tops[fx] - big.h + 3, { flip })
    }
  }

  /* ------------------------------ diver ---------------------------- */

  private drawDiver(ctx: CanvasRenderingContext2D, camYi: number, t: number): void {
    const { w, h } = this
    const def = SPRITES.diver
    const sx = this.cx + Math.round(Math.sin(t * 0.9) * 2.5)
    const sy = Math.round(this.diverY - camYi + Math.sin(t * 1.3) * 1.5)
    const left = sx - def.w / 2
    const top = sy - def.h / 2

    // lifeline up to the surface boat (or off the top of the screen)
    const surfaceY = SURFACE_Y - camYi
    const ox = left + 1
    const oy = top + 4
    const toBoat = surfaceY > -14
    const tx = toBoat ? w * 0.78 - 12 : sx - 26
    const ty = toBoat ? surfaceY + 1 : -8
    const N = 100
    let lastX = -999
    let lastY = -999
    for (let i = 0; i <= N; i++) {
      const s = i / N
      const bend = Math.sin(s * Math.PI) * (toBoat ? 14 : 18) + Math.sin(s * 7 + t * 1.1) * 4 * s * (1 - s)
      const x = Math.round(lerp(ox, tx, s) - bend * (1 - s * 0.4))
      const y = Math.round(lerp(oy, ty, s))
      if (x === lastX && y === lastY) continue
      lastX = x
      lastY = y
      if (y < -2 || y > h) continue
      ctx.fillStyle = i % 6 < 3 ? '#8c6d3d' : '#6b5230'
      ctx.fillRect(x, y, 1, 1)
    }

    // fast-descent speed streaks
    const speed = clamp(Math.abs(this.vy) / 60, 0, 1)
    if (speed > 0.15) {
      ctx.fillStyle = '#ffffff'
      for (let k = 0; k < 7; k++) {
        ctx.globalAlpha = 0.25 * speed
        const y = sy - 12 - ((t * 70 + k * 13) % 26)
        ctx.fillRect(sx - 9 + k * 3, Math.round(y), 1, 3)
      }
      ctx.globalAlpha = 1
    }

    drawSprite(ctx, def, Math.floor(t * 2.5) % 2, left, top)
  }

  private updateBubbles(dt: number): void {
    this.bubbleTimer -= dt
    if (this.bubbleTimer <= 0) {
      this.bubbles.push({
        x: this.cx + 2 + Math.random() * 2,
        y: this.diverY - 9,
        r: 2 + Math.floor(Math.random() * 3),
        age: 0,
        seed: Math.random() * 6.28,
      })
      this.bubbleTimer = Math.max(0.12, 0.42 - clamp(Math.abs(this.vy) / 200, 0, 0.3)) * (this.reduce ? 2.5 : 1)
    }
    for (const b of this.bubbles) {
      b.age += dt
      b.y -= (16 + b.r * 4) * dt
      b.x += Math.sin(b.age * 3 + b.seed) * 7 * dt
    }
    const limit = this.camY - 12
    this.bubbles = this.bubbles.filter((b) => b.age < 7 && b.y > limit)
  }

  private drawBubbles(ctx: CanvasRenderingContext2D, camYi: number, camX: number): void {
    ctx.fillStyle = '#dff8ff'
    for (const b of this.bubbles) {
      const x = Math.round(b.x + camX)
      const y = Math.round(b.y - camYi)
      ctx.globalAlpha = clamp(1 - b.age / 7, 0.2, 0.85)
      if (b.r <= 2) ctx.fillRect(x, y, 1, 1)
      else if (b.r === 3) {
        ctx.fillRect(x + 1, y, 1, 1)
        ctx.fillRect(x, y + 1, 1, 1)
        ctx.fillRect(x + 2, y + 1, 1, 1)
        ctx.fillRect(x + 1, y + 2, 1, 1)
      } else {
        ctx.fillRect(x + 1, y, 2, 1)
        ctx.fillRect(x, y + 1, 1, 2)
        ctx.fillRect(x + 3, y + 1, 1, 2)
        ctx.fillRect(x + 1, y + 3, 2, 1)
      }
    }
    ctx.globalAlpha = 1
  }

  private drawLamp(ctx: CanvasRenderingContext2D, camYi: number, dark: number): void {
    const x = this.cx + 5
    const y = Math.round(this.diverY - camYi) - 5
    halo(ctx, x, y, this.lampR, '#ffeab0', lerp(0.03, 0.08, dark), 5)
  }
}
