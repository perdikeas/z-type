import type { Particle } from '../entities/Particle'
import { lerp } from '../utils/math'
import type { EnemySize } from '../entities/Enemy'

const PARTICLE_COLOR_PALETTE = [
  '#4fc3f7',
  '#81d4fa',
  '#b3e5fc',
  '#ffffff',
  '#e0f7fa',
  '#f48fb1',
  '#ffe082',
]

const EXPLOSION_CONFIG: Record<EnemySize, {
  count: number
  speedMin: number
  speedMax: number
  radiusMin: number
  radiusMax: number
  lifetimeMin: number
  lifetimeMax: number
}> = {
  small: {
    count: 10,
    speedMin: 40,  speedMax: 120,
    radiusMin: 1,  radiusMax: 2.5,
    lifetimeMin: 0.25, lifetimeMax: 0.45,
  },
  medium: {
    count: 20,
    speedMin: 60,  speedMax: 160,
    radiusMin: 1.5, radiusMax: 3.5,
    lifetimeMin: 0.35, lifetimeMax: 0.6,
  },
  large: {
    count: 35,
    speedMin: 80,  speedMax: 200,
    radiusMin: 2,  radiusMax: 4.5,
    lifetimeMin: 0.45, lifetimeMax: 0.8,
  },
  boss: {
    count: 55,
    speedMin: 100, speedMax: 260,
    radiusMin: 2.5, radiusMax: 6,
    lifetimeMin: 0.55, lifetimeMax: 1.1,
  },
}

export class ParticleSystem {
  private particles: Particle[] = []

  spawn(x: number, y: number): void {
    this.spawnExplosion(x, y, 'small')
  }

  spawnExplosion(x: number, y: number, size: EnemySize): void {
    const config = EXPLOSION_CONFIG[size]
    const color = PARTICLE_COLOR_PALETTE[
      Math.floor(Math.random() * PARTICLE_COLOR_PALETTE.length)
    ]

    for (let i = 0; i < config.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin)
      const lifetime = config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin)
      const radius = config.radiusMin + Math.random() * (config.radiusMax - config.radiusMin)

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        radius,
        color,
        lifetime,
        age: 0,
      })
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      p.age += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 30 * dt

      const progress = p.age / p.lifetime
      p.alpha = lerp(1, 0, progress)

      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()

    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  get count(): number {
    return this.particles.length
  }
}