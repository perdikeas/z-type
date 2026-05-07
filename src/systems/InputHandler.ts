import type { Enemy } from '../entities/Enemy'
import { advanceTyped, isFullyTyped } from '../entities/Enemy'

export type InputEvent =
  | { type: 'word_completed'; enemy: Enemy }
  | { type: 'letter_correct'; enemy: Enemy }
  | { type: 'letter_wrong' }
  | { type: 'no_target' }

export type InputCallback = (event: InputEvent) => void

export class InputHandler {
  private lockedEnemy: Enemy | null = null
  private callback: InputCallback
  private active: boolean = false

  constructor(callback: InputCallback) {
    this.callback = callback
  }

  start(): void {
    this.active = true
  }

  stop(): void {
    this.active = false
    this.lockedEnemy = null
  }

  unlock(): void {
    this.lockedEnemy = null
  }

  get locked(): Enemy | null {
    return this.lockedEnemy
  }

  processKey(key: string, enemies: Enemy[]): void {
    if (!this.active) return

    if (this.lockedEnemy !== null) {
      this.handleLockedInput(key)
    } else {
      this.handleFreeInput(key, enemies)
    }
  }

  private handleLockedInput(key: string): void {
    const enemy = this.lockedEnemy!
    const expected = enemy.word[enemy.typedIndex].toLowerCase()

    if (key === expected) {
      advanceTyped(enemy)

      if (isFullyTyped(enemy)) {
        this.lockedEnemy = null
        this.callback({ type: 'word_completed', enemy })
      } else {
        this.callback({ type: 'letter_correct', enemy })
      }
    } else {
      this.callback({ type: 'letter_wrong' })
    }
  }

  private handleFreeInput(key: string, enemies: Enemy[]): void {
    if (enemies.length === 0) {
      this.callback({ type: 'no_target' })
      return
    }

    const target = enemies.find(
      e =>
        e.status === 'active' &&
        !e.locked &&
        e.word[0].toLowerCase() === key
    )

    if (target) {
      target.locked = true
      this.lockedEnemy = target
      advanceTyped(target)

      if (isFullyTyped(target)) {
        this.lockedEnemy = null
        this.callback({ type: 'word_completed', enemy: target })
      } else {
        this.callback({ type: 'letter_correct', enemy: target })
      }
    } else {
      this.callback({ type: 'no_target' })
    }
  }
}