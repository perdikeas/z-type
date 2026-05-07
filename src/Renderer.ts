import type { Enemy } from './entities/Enemy'
import { getTypedPortion, getRemainingPortion } from './entities/Enemy'
import type { GameState } from './GameState'
import { computeAccuracy, computeWPM } from './GameState'
import type { StarField } from './systems/StarField'
import type { ParticleSystem } from './systems/ParticleSystem'
import { SETTINGS } from './config/settings'

interface LaserBeam {
  x1: number
  y1: number
  x2: number
  y2: number
  alpha: number
}

const COLORS = {
  typedLetter:     '#4fc3f7',
  remainingLetter: '#ffffff',
  lockedGlow:      '#4fc3f7',
  unlockedGlow:    'rgba(255,255,255,0.5)',
  laser:           '#4fc3f7',
  laserGlow:       '#81d4fa',
  hudPrimary:      '#ffffff',
  hudSecondary:    '#4fc3f7',
  hudMuted:        'rgba(255,255,255,0.4)',
  danger:          '#ef5350',
  combo:           '#ffd54f',
  waveComplete:    '#69f0ae',
  shipSmall:       '#4fc3f7',
  shipMedium:      '#29b6f6',
  shipLarge:       '#0288d1',
  shipBoss:        '#ef5350',
}

const SHIP_SCALE: Record<string, number> = {
  small:  0.6,
  medium: 1.0,
  large:  1.5,
  boss:   2.2,
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private laser: LaserBeam | null = null
  private laserDecay: number = 0
  private readonly laserDuration: number = 0.12

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  triggerLaser(x1: number, y1: number, x2: number, y2: number): void {
    this.laser = { x1, y1, x2, y2, alpha: 1 }
    this.laserDecay = 0
  }

  update(dt: number): void {
    if (this.laser) {
      this.laserDecay += dt
      const progress = this.laserDecay / this.laserDuration
      this.laser.alpha = Math.max(0, 1 - progress)
      if (this.laserDecay >= this.laserDuration) {
        this.laser = null
        this.laserDecay = 0
      }
    }
  }

  render(
    starField: StarField,
    enemies: Enemy[],
    lockedEnemy: Enemy | null,
    particles: ParticleSystem,
    state: GameState,
  ): void {
    const W = SETTINGS.canvasWidth
    const H = SETTINGS.canvasHeight

    this.clearCanvas(W, H)
    starField.render(this.ctx)
    this.renderEnemies(enemies, lockedEnemy)
    particles.render(this.ctx)
    this.renderLaser()
    this.renderHUD(state, W, H)
  }

  private clearCanvas(W: number, H: number): void {
    this.ctx.clearRect(0, 0, W, H)
  }

  private drawShip(
    x: number,
    y: number,
    size: string,
    isLocked: boolean,
    opacity: number,
  ): void {
    const ctx = this.ctx
    const scale = SHIP_SCALE[size] ?? 1.0
    const colorKey = `ship${size.charAt(0).toUpperCase() + size.slice(1)}` as keyof typeof COLORS
    const color = COLORS[colorKey] ?? COLORS.shipMedium

    ctx.save()
    ctx.globalAlpha = opacity
    ctx.translate(x, y)
    ctx.scale(scale, scale)

    ctx.shadowColor = color
    ctx.shadowBlur = isLocked ? 18 : 6
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.5 / scale

    // Hull
    ctx.beginPath()
    ctx.moveTo(0, -22)
    ctx.lineTo(6, -10)
    ctx.lineTo(10, 0)
    ctx.lineTo(8, 14)
    ctx.lineTo(0, 18)
    ctx.lineTo(-8, 14)
    ctx.lineTo(-10, 0)
    ctx.lineTo(-6, -10)
    ctx.closePath()
    ctx.globalAlpha = opacity * 0.25
    ctx.fill()
    ctx.globalAlpha = opacity
    ctx.stroke()

    // Cockpit
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(3, -10)
    ctx.lineTo(0, -6)
    ctx.lineTo(-3, -10)
    ctx.closePath()
    ctx.globalAlpha = opacity * 0.6
    ctx.fill()
    ctx.globalAlpha = opacity
    ctx.stroke()

    // Left wing
    ctx.beginPath()
    ctx.moveTo(-6, 0)
    ctx.lineTo(-18, 8)
    ctx.lineTo(-14, 14)
    ctx.lineTo(-8, 10)
    ctx.closePath()
    ctx.globalAlpha = opacity * 0.2
    ctx.fill()
    ctx.globalAlpha = opacity
    ctx.stroke()

    // Right wing
    ctx.beginPath()
    ctx.moveTo(6, 0)
    ctx.lineTo(18, 8)
    ctx.lineTo(14, 14)
    ctx.lineTo(8, 10)
    ctx.closePath()
    ctx.globalAlpha = opacity * 0.2
    ctx.fill()
    ctx.globalAlpha = opacity
    ctx.stroke()

    // Engine glow
    ctx.beginPath()
    ctx.arc(0, 18, 3, 0, Math.PI * 2)
    ctx.globalAlpha = opacity * 0.8
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    ctx.restore()
  }

  private renderEnemies(enemies: Enemy[], lockedEnemy: Enemy | null): void {
    const ctx = this.ctx

    for (const enemy of enemies) {
      if (enemy.status !== 'active') continue

      const isLocked = lockedEnemy?.id === enemy.id
      const scale = SHIP_SCALE[enemy.size] ?? 1.0

      this.drawShip(enemy.x, enemy.y, enemy.size, isLocked, enemy.opacity)

      const fontSize = Math.round(12 + scale * 3)
      ctx.font = `${fontSize}px monospace`
      ctx.textBaseline = 'top'
      ctx.textAlign = 'center'

      const typed = getTypedPortion(enemy)
      const remaining = getRemainingPortion(enemy)
      const labelY = enemy.y + Math.round(22 * scale) + 8

      ctx.save()
      ctx.globalAlpha = enemy.opacity

      if (isLocked) {
        ctx.shadowColor = COLORS.lockedGlow
        ctx.shadowBlur = 10
      }

      if (typed.length > 0) {
        const fullWidth = ctx.measureText(enemy.word).width
        const typedWidth = ctx.measureText(typed).width
        const startX = enemy.x - fullWidth / 2

        ctx.fillStyle = COLORS.typedLetter
        ctx.textAlign = 'left'
        ctx.fillText(typed, startX, labelY)

        ctx.fillStyle = COLORS.remainingLetter
        ctx.fillText(remaining, startX + typedWidth, labelY)
      } else {
        ctx.fillStyle = COLORS.remainingLetter
        ctx.textAlign = 'center'
        ctx.fillText(remaining, enemy.x, labelY)
      }

      ctx.restore()
    }

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }

  private renderLaser(): void {
    if (!this.laser) return
    const ctx = this.ctx
    const l = this.laser

    ctx.save()
    ctx.globalAlpha = l.alpha

    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.strokeStyle = COLORS.laserGlow
    ctx.lineWidth = 6
    ctx.shadowColor = COLORS.laserGlow
    ctx.shadowBlur = 20
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.strokeStyle = COLORS.laser
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 4
    ctx.stroke()

    ctx.restore()
  }

  private renderHUD(state: GameState, W: number, H: number): void {
    const ctx = this.ctx

    ctx.save()
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    // Score — large, top left, Z-Type style
    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('SCORE', 24, 24)
    ctx.font = '36px monospace'
    ctx.fillStyle = COLORS.hudPrimary
    ctx.shadowColor = COLORS.hudSecondary
    ctx.shadowBlur = 10
    ctx.fillText(String(state.score).padStart(6, '0'), 24, 42)

    ctx.shadowBlur = 0

    // Wave indicator
    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('WAVE', 24, 90)
    ctx.font = '22px monospace'
    ctx.fillStyle = COLORS.waveComplete
    ctx.shadowColor = COLORS.waveComplete
    ctx.shadowBlur = 8
    ctx.fillText(String(state.wave).padStart(2, '0'), 24, 108)

    ctx.shadowBlur = 0
    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('WPM', 24, 142)
    ctx.font = '18px monospace'
    ctx.fillStyle = COLORS.hudSecondary
    ctx.fillText(String(computeWPM(state)), 24, 158)

    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('ACC', 24, 184)
    ctx.font = '18px monospace'
    ctx.fillStyle = COLORS.hudSecondary
    ctx.fillText(`${computeAccuracy(state)}%`, 24, 200)

    // Wave progress — right side
    const wordsLeft = state.wordsInWave - state.wordsCompletedInWave
    ctx.textAlign = 'right'
    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('REMAINING', W - 24, 24)
    ctx.font = '22px monospace'
    ctx.fillStyle = COLORS.hudPrimary
    ctx.fillText(String(Math.max(0, wordsLeft)), W - 24, 42)
    ctx.textAlign = 'left'

    this.renderLives(state.lives, W, H)

    if (state.combo >= 3) {
      this.renderCombo(state.combo, W)
    }

    ctx.restore()
  }

  private renderLives(lives: number, W: number, H: number): void {
    const ctx = this.ctx
    const size = 8
    const gap = 14
    const totalWidth = (size * 2 * lives) + (gap * (lives - 1))
    let x = W / 2 - totalWidth / 2

    for (let i = 0; i < lives; i++) {
      ctx.beginPath()
      ctx.arc(x + size, H - 32, size, 0, Math.PI * 2)
      ctx.fillStyle = COLORS.danger
      ctx.shadowColor = COLORS.danger
      ctx.shadowBlur = 10
      ctx.fill()
      x += size * 2 + gap
    }
  }

  private renderCombo(combo: number, W: number): void {
    const ctx = this.ctx

    ctx.textAlign = 'right'
    ctx.font = '13px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('COMBO', W - 24, 90)
    ctx.font = '28px monospace'
    ctx.fillStyle = COLORS.combo
    ctx.shadowColor = COLORS.combo
    ctx.shadowBlur = 12
    ctx.fillText(`x${combo}`, W - 24, 108)
    ctx.textAlign = 'left'
    ctx.shadowBlur = 0
  }

  renderWaveComplete(state: GameState, W: number, H: number): void {
    const ctx = this.ctx

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = '14px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText(`WAVE ${state.wave} COMPLETE`, W / 2, H / 2 - 80)

    ctx.font = '52px monospace'
    ctx.fillStyle = COLORS.waveComplete
    ctx.shadowColor = COLORS.waveComplete
    ctx.shadowBlur = 28
    ctx.fillText('CLEARED', W / 2, H / 2 - 30)

    ctx.shadowBlur = 0
    ctx.font = '16px monospace'
    ctx.fillStyle = COLORS.hudPrimary

    const lines = [
      `SCORE       ${String(state.score).padStart(6, '0')}`,
      `ACCURACY    ${computeAccuracy(state)}%`,
      `WPM         ${computeWPM(state)}`,
    ]

    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H / 2 + 50 + i * 30)
    })

    ctx.font = '14px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('press any key for next wave', W / 2, H / 2 + 160)

    ctx.restore()
  }

  renderGameOver(state: GameState, W: number, H: number): void {
    const ctx = this.ctx

    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, W, H)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = '48px monospace'
    ctx.fillStyle = COLORS.danger
    ctx.shadowColor = COLORS.danger
    ctx.shadowBlur = 20
    ctx.fillText('GAME OVER', W / 2, H / 2 - 80)

    ctx.shadowBlur = 0
    ctx.font = '18px monospace'
    ctx.fillStyle = COLORS.hudPrimary

    const lines = [
      `SCORE       ${String(state.score).padStart(6, '0')}`,
      `WAVE        ${state.wave}`,
      `WORDS       ${state.wordsDestroyed}`,
      `WPM         ${computeWPM(state)}`,
      `ACCURACY    ${computeAccuracy(state)}%`,
      `BEST COMBO  x${state.bestCombo}`,
    ]

    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H / 2 - 20 + i * 32)
    })

    ctx.font = '14px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('press any key to play again', W / 2, H / 2 + 195)

    ctx.restore()
  }

  renderIdle(W: number, H: number): void {
    const ctx = this.ctx

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    ctx.font = '52px monospace'
    ctx.fillStyle = COLORS.hudPrimary
    ctx.shadowColor = COLORS.lockedGlow
    ctx.shadowBlur = 24
    ctx.fillText('Z-TYPE', W / 2, H / 2 - 60)

    ctx.shadowBlur = 0
    ctx.font = '16px monospace'
    ctx.fillStyle = COLORS.hudMuted
    ctx.fillText('type to shoot', W / 2, H / 2)
    ctx.fillText('press any key to begin', W / 2, H / 2 + 32)

    ctx.restore()
  }
}