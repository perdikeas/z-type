import {createEnemy } from '../entities/Enemy'
import type {Enemy} from '../entities/Enemy'
import type { GameState } from '../GameState'
import { WORD_POOLS } from '../config/words'
import { getWordsForWave, getTierForWave, getMaxWordLengthForWave } from '../GameState'
import { SETTINGS } from '../config/settings'
import { randomBetween, clamp } from '../utils/math'
import { InputHandler } from './InputHandler'
import type { InputCallback } from './InputHandler'

interface SwarmConfig {
  // how many enemies spawn in one burst
  swarmSize: number
  // seconds between individual enemies within a burst
  intraSwarmDelay: number
  // seconds between bursts
  interSwarmDelay: number
  minSpeed: number
  maxSpeed: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getSwarmConfig(wave: number): SwarmConfig {
  const t = clamp((wave - 1) / 10, 0, 1)
  return {
    swarmSize:       Math.floor(lerp(2, 8, t)),
    intraSwarmDelay: lerp(0.35, 0.1, t),
    interSwarmDelay: lerp(4.0, 1.4, t),
    minSpeed:        lerp(22, 70, t),
    maxSpeed:        lerp(42, 105, t),
  }
}

export class EnemyManager {
  private enemies: Enemy[] = []
  private inputHandler: InputHandler
  private usedWords: Set<string> = new Set()
  private keyBuffer: string[] = []

  // wave tracking
  private totalWordsForWave: number = 0
  private wordsSpawnedInWave: number = 0
  private spawningComplete: boolean = false

  // swarm state
  private currentSwarmQueue: string[] = []
  private intraSwarmTimer: number = 0
  private interSwarmTimer: number = 0
  private betweenSwarms: boolean = true

  constructor(inputCallback: InputCallback) {
    this.inputHandler = new InputHandler(inputCallback)
  }

  start(): void {
    this.inputHandler.start()
  }

  stop(): void {
    this.inputHandler.stop()
  }

  reset(): void {
    this.enemies = []
    this.usedWords = new Set()
    this.keyBuffer = []
    this.totalWordsForWave = 0
    this.wordsSpawnedInWave = 0
    this.spawningComplete = false
    this.currentSwarmQueue = []
    this.intraSwarmTimer = 0
    this.interSwarmTimer = 0
    this.betweenSwarms = true
    this.inputHandler.stop()
  }

  startWave(wave: number): void {
    this.enemies = []
    this.usedWords = new Set()
    this.totalWordsForWave = getWordsForWave(wave)
    this.wordsSpawnedInWave = 0
    this.spawningComplete = false
    this.currentSwarmQueue = []
    this.intraSwarmTimer = 0
    // small initial delay before first swarm so screen isn't
    // immediately flooded the moment the wave starts
    this.interSwarmTimer = 1.0
    this.betweenSwarms = true
  }

  get activeEnemies(): Enemy[] {
    return this.enemies
  }

  get lockedEnemy(): Enemy | null {
    return this.inputHandler.locked
  }

  get isWaveComplete(): boolean {
    return (
      this.spawningComplete &&
      this.enemies.filter(e => e.status === 'active').length === 0
    )
  }

  private wordsRemaining(): number {
    return this.totalWordsForWave - this.wordsSpawnedInWave
  }

  private pickWord(wave: number): string | null {
    const tier = getTierForWave(wave)
    const maxLen = getMaxWordLengthForWave(wave)

    const primaryPool = WORD_POOLS[tier].filter(w => w.length <= maxLen)
    const useEasy = wave > 2 && Math.random() < 0.12
    const easyPool = WORD_POOLS['easy'].filter(w => !this.usedWords.has(w))

    const lockedNext = this.inputHandler.locked
      ? this.inputHandler.locked.word[
          this.inputHandler.locked.typedIndex
        ]?.toLowerCase()
      : null

    const basePool = (useEasy && easyPool.length > 0)
      ? easyPool
      : primaryPool.filter(w => !this.usedWords.has(w))

    const available = basePool.filter(word => {
      if (this.usedWords.has(word)) return false
      if (lockedNext && word[0].toLowerCase() === lockedNext) return false
      return true
    })

    if (available.length === 0) {
      const fallback = primaryPool.filter(w => !this.usedWords.has(w))
      if (fallback.length === 0) return null
      return fallback[Math.floor(Math.random() * fallback.length)]
    }

    return available[Math.floor(Math.random() * available.length)]
  }

  private buildSwarm(wave: number): string[] {
    const config = getSwarmConfig(wave)
    const count = Math.min(config.swarmSize, this.wordsRemaining())
    const words: string[] = []

    for (let i = 0; i < count; i++) {
      const word = this.pickWord(wave)
      if (!word) break
      // reserve immediately so siblings in same swarm don't duplicate
      this.usedWords.add(word)
      words.push(word)
    }

    return words
  }

  private spawnFromQueue(wave: number): void {
    if (this.currentSwarmQueue.length === 0) return

    const word = this.currentSwarmQueue.shift()!
    const config = getSwarmConfig(wave)
    const padding = 80
    const x = randomBetween(padding, SETTINGS.canvasWidth - padding)
    const speed = randomBetween(config.minSpeed, config.maxSpeed)

    const enemy = createEnemy(word, x, speed)
    this.enemies.push(enemy)
    this.wordsSpawnedInWave++

    if (this.wordsSpawnedInWave >= this.totalWordsForWave) {
      this.spawningComplete = true
      this.currentSwarmQueue = []
    }
  }

  update(dt: number, state: GameState): { missed: boolean } {
    let missed = false

    if (!this.spawningComplete) {
      if (this.betweenSwarms) {
        // waiting between swarms
        this.interSwarmTimer -= dt
        if (this.interSwarmTimer <= 0) {
          // build the next swarm and begin releasing it
          this.currentSwarmQueue = this.buildSwarm(state.wave)
          this.betweenSwarms = false
          this.intraSwarmTimer = 0
        }
      } else {
        // releasing enemies from the current swarm queue
        this.intraSwarmTimer -= dt
        if (this.intraSwarmTimer <= 0) {
          this.spawnFromQueue(state.wave)
          const config = getSwarmConfig(state.wave)
          this.intraSwarmTimer = config.intraSwarmDelay

          // swarm exhausted — start inter-swarm pause
          if (this.currentSwarmQueue.length === 0 && !this.spawningComplete) {
            this.betweenSwarms = true
            this.interSwarmTimer = getSwarmConfig(state.wave).interSwarmDelay
          }
        }
      }
    }

    // move enemies
    for (const enemy of this.enemies) {
      if (enemy.status !== 'active') continue
      enemy.y += enemy.speed * dt

      if (enemy.y > SETTINGS.canvasHeight + 20) {
        enemy.status = 'missed'
        missed = true

        if (this.inputHandler.locked?.id === enemy.id) {
          this.inputHandler.unlock()
        }

        this.usedWords.delete(enemy.word)
      }
    }

    this.enemies = this.enemies.filter(e => e.status === 'active')

    const keys = this.drainKeyBuffer()
    for (const key of keys) {
      this.inputHandler.processKey(key, this.enemies)
    }

    return { missed }
  }

  queueKey(key: string): void {
    this.keyBuffer.push(key)
  }

  private drainKeyBuffer(): string[] {
    const keys = this.keyBuffer
    this.keyBuffer = []
    return keys
  }

  removeEnemy(id: number): void {
    const enemy = this.enemies.find(e => e.id === id)
    if (enemy) {
      this.usedWords.delete(enemy.word)
      enemy.status = 'dying'
    }
  }
}