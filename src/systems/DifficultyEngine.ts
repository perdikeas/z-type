import type { GameState } from '../GameState'
import { computeAccuracy, computeWPM } from '../GameState'
import { clamp, lerp } from '../utils/math'

interface PerformanceSnapshot {
  wpm: number
  accuracy: number
  combo: number
  timestamp: number
}

interface DifficultyProfile {
  spawnIntervalMultiplier: number
  speedMultiplier: number
  maxActiveMultiplier: number
}

const SNAPSHOT_INTERVAL = 5000
const HISTORY_LENGTH = 6
const TARGET_PERFORMANCE_MIN = 0.35
const TARGET_PERFORMANCE_MAX = 0.65
const ADJUSTMENT_RATE = 0.08
const MAX_PRESSURE = 1.8
const MIN_PRESSURE = 0.4

export class DifficultyEngine {
  private pressure: number = 1.0
  private snapshots: PerformanceSnapshot[] = []
  private lastSnapshotTime: number = 0
  private enabled: boolean = true

  update(state: GameState, elapsedMs: number): void {
    if (!this.enabled) return
    if (state.wordsDestroyed < 3) return

    if (elapsedMs - this.lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      this.takeSnapshot(state, elapsedMs)
      this.lastSnapshotTime = elapsedMs
      this.adjustPressure()
    }
  }

  private takeSnapshot(state: GameState, timestamp: number): void {
    this.snapshots.push({
      wpm: computeWPM(state),
      accuracy: computeAccuracy(state),
      combo: state.combo,
      timestamp,
    })

    if (this.snapshots.length > HISTORY_LENGTH) {
      this.snapshots.shift()
    }
  }

  private computePerformanceScore(): number {
    if (this.snapshots.length === 0) return 0.5

    const recent = this.snapshots.slice(-3)

    const avgWpm = recent.reduce((sum, s) => sum + s.wpm, 0) / recent.length
    const avgAccuracy = recent.reduce((sum, s) => sum + s.accuracy, 0) / recent.length
    const avgCombo = recent.reduce((sum, s) => sum + s.combo, 0) / recent.length

    const wpmScore = clamp(avgWpm / 60, 0, 1)
    const accuracyScore = clamp(avgAccuracy / 100, 0, 1)
    const comboScore = clamp(avgCombo / 10, 0, 1)

    return (wpmScore * 0.45) + (accuracyScore * 0.40) + (comboScore * 0.15)
  }

  private adjustPressure(): void {
    const performance = this.computePerformanceScore()

    if (performance > TARGET_PERFORMANCE_MAX) {
      this.pressure = clamp(
        lerp(this.pressure, this.pressure + ADJUSTMENT_RATE, 0.8),
        MIN_PRESSURE,
        MAX_PRESSURE
      )
    } else if (performance < TARGET_PERFORMANCE_MIN) {
      this.pressure = clamp(
        lerp(this.pressure, this.pressure - ADJUSTMENT_RATE, 0.8),
        MIN_PRESSURE,
        MAX_PRESSURE
      )
    }
  }

  getProfile(): DifficultyProfile {
    return {
      spawnIntervalMultiplier: 1 / this.pressure,
      speedMultiplier: lerp(0.8, 1.3, (this.pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE)),
      maxActiveMultiplier: lerp(0.7, 1.4, (this.pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE)),
    }
  }

  reset(): void {
    this.pressure = 1.0
    this.snapshots = []
    this.lastSnapshotTime = 0
  }

  disable(): void { this.enabled = false }
  enable(): void { this.enabled = true }

  get currentPressure(): number {
    return this.pressure
  }
}