import type { DiveFrame, DiveTierConfig } from '@/lib/dive'

type Kind = 'bubble' | 'snow' | 'glow' | 'spark'

interface Particle {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  size: number
  age: number
  life: number
  color: string
  phase: number
}

/** Snap to a coarse grid so everything keeps the game's chunky pixel look. */
const GRID = 3
const MAX_PARTICLES = 260
const snap = (v: number) => Math.round(v / GRID) * GRID

export interface EmitContext {
  /** Where the diver's helmet is, in canvas px. */
  emitterX: number
  emitterY: number
  /** Bioluminescent colour for the current depth. */
  glowColor: string
}

/**
 * Small canvas particle system for the dive: bubbles, streaking marine snow,
 * bioluminescent motes and celebration sparks. Hard-capped for performance.
 */
export class DiveParticles {
  private ctx: CanvasRenderingContext2D | null
  private w = 0
  private h = 0
  private particles: Particle[] = []
  private carry = { bubble: 0, snow: 0, glow: 0 }

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')
  }

  get width() {
    return this.w
  }
  get height() {
    return this.h
  }

  resize(width: number, height: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = width
    this.h = height
    this.canvas.width = Math.max(1, Math.round(width * dpr))
    this.canvas.height = Math.max(1, Math.round(height * dpr))
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private add(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift()
    this.particles.push(p)
  }

  /** A burst of bubbles (and optionally sparks) from a point. */
  burst(x: number, y: number, count: number, opts: { sparks?: boolean; colors?: string[]; speed?: number } = {}) {
    const speed = opts.speed ?? 1
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const mag = (40 + Math.random() * 160) * speed
      if (opts.sparks) {
        const colors = opts.colors ?? ['#fde047', '#fb7185', '#67e8f9', '#ffffff']
        this.add({
          kind: 'spark', x, y,
          vx: Math.cos(angle) * mag, vy: Math.sin(angle) * mag,
          size: GRID * (1 + Math.floor(Math.random() * 2)),
          age: 0, life: 0.7 + Math.random() * 0.8,
          color: colors[i % colors.length], phase: Math.random() * 6,
        })
      } else {
        this.add({
          kind: 'bubble', x, y,
          vx: Math.cos(angle) * mag * 0.45, vy: Math.sin(angle) * mag * 0.45 - 40,
          size: GRID * (1 + Math.floor(Math.random() * 3)),
          age: 0, life: 1.1 + Math.random() * 1.2,
          color: '#ffffff', phase: Math.random() * 6,
        })
      }
    }
  }

  /** Advance the simulation and emit ambient particles for this frame. */
  step(dt: number, frame: DiveFrame, cfg: DiveTierConfig, emit: EmitContext) {
    const { phase, speed } = frame

    // Ambient emission rates (per second) for each phase.
    const bubbleScale = phase === 'confirm' ? 0.25 : phase === 'prepare' ? 1.3 : phase === 'descend' ? 0.6 + speed : 0.5
    const snowScale = phase === 'descend' ? speed : phase === 'arrive' ? 0.15 : 0
    const glowScale = phase === 'descend' || phase === 'arrive' ? 1 : phase === 'prepare' ? 0.4 : 0

    this.carry.bubble += cfg.bubbleRate * bubbleScale * dt
    this.carry.snow += cfg.snowRate * snowScale * dt
    this.carry.glow += cfg.glowRate * glowScale * dt

    while (this.carry.bubble >= 1) {
      this.carry.bubble -= 1
      const fromDiver = Math.random() < 0.55
      this.add({
        kind: 'bubble',
        x: fromDiver ? emit.emitterX + (Math.random() - 0.5) * 36 : Math.random() * this.w,
        y: fromDiver ? emit.emitterY : this.h + 6,
        vx: (Math.random() - 0.5) * 14,
        vy: -(50 + Math.random() * 70) - speed * 160,
        size: GRID * (1 + Math.floor(Math.random() * 3)),
        age: 0, life: 1.4 + Math.random() * 1.4,
        color: '#ffffff', phase: Math.random() * 6,
      })
    }
    while (this.carry.snow >= 1) {
      this.carry.snow -= 1
      this.add({
        kind: 'snow',
        x: Math.random() * this.w,
        y: this.h + 10,
        vx: (Math.random() - 0.5) * 10,
        vy: -(260 + Math.random() * 280) * (0.5 + speed),
        size: GRID,
        age: 0, life: 1.6, color: '#e0f2fe', phase: speed,
      })
    }
    while (this.carry.glow >= 1) {
      this.carry.glow -= 1
      this.add({
        kind: 'glow',
        x: Math.random() * this.w,
        y: this.h * (0.25 + Math.random() * 0.75),
        vx: (Math.random() - 0.5) * 18,
        vy: -(10 + Math.random() * 28),
        size: GRID * (1 + Math.floor(Math.random() * 2)),
        age: 0, life: 1.8 + Math.random() * 1.6,
        color: emit.glowColor, phase: Math.random() * 6,
      })
    }

    // Integrate.
    const next: Particle[] = []
    for (const p of this.particles) {
      p.age += dt
      if (p.age >= p.life) continue
      if (p.kind === 'bubble') {
        p.x += (p.vx + Math.sin(p.age * 5 + p.phase) * 14) * dt
        p.y += p.vy * dt
        p.vx *= 1 - Math.min(1, 1.5 * dt)
        p.vy *= 1 - Math.min(1, 0.4 * dt)
      } else if (p.kind === 'spark') {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - Math.min(1, 2.2 * dt)
        p.vy *= 1 - Math.min(1, 2.2 * dt)
      } else {
        p.x += p.vx * dt
        p.y += p.vy * dt
      }
      if (p.y < -20 || p.x < -20 || p.x > this.w + 20 || p.y > this.h + 40) continue
      next.push(p)
    }
    this.particles = next
  }

  render() {
    const ctx = this.ctx
    if (!ctx) return
    ctx.clearRect(0, 0, this.w, this.h)
    for (const p of this.particles) {
      const t = p.age / p.life
      const fade = t < 0.15 ? t / 0.15 : t > 0.7 ? Math.max(0, (1 - t) / 0.3) : 1
      const x = snap(p.x)
      const y = snap(p.y)
      switch (p.kind) {
        case 'bubble':
          ctx.globalAlpha = 0.85 * fade
          ctx.fillStyle = 'rgba(255,255,255,0.14)'
          ctx.fillRect(x, y, p.size, p.size)
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, p.size - 2, p.size - 2)
          break
        case 'snow': {
          // Streak length grows with descent speed (stored in phase).
          const len = GRID * (2 + Math.round(p.phase * 7))
          ctx.globalAlpha = 0.5 * fade
          ctx.fillStyle = p.color
          ctx.fillRect(x, y, GRID, len)
          break
        }
        case 'glow': {
          const twinkle = 0.55 + 0.45 * Math.sin(p.age * 6 + p.phase)
          ctx.fillStyle = p.color
          ctx.globalAlpha = 0.22 * fade * twinkle
          ctx.fillRect(x - GRID, y - GRID, p.size + GRID * 2, p.size + GRID * 2)
          ctx.globalAlpha = 0.95 * fade * twinkle
          ctx.fillRect(x, y, p.size, p.size)
          break
        }
        case 'spark':
          ctx.globalAlpha = fade
          ctx.fillStyle = p.color
          ctx.fillRect(x, y, p.size, p.size)
          break
      }
    }
    ctx.globalAlpha = 1
  }

  clear() {
    this.particles = []
    this.ctx?.clearRect(0, 0, this.w, this.h)
  }
}
