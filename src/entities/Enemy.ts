export type EnemyStatus = 'active' | 'dying' | 'missed'
export type EnemySize = 'small' | 'medium' | 'large' | 'boss'

export interface Enemy {
  id: number
  word: string
  x: number
  y: number
  speed: number
  typedIndex: number
  status: EnemyStatus
  locked: boolean
  opacity: number
  size: EnemySize
}

let nextId = 0

function getSizeForWord(word: string): EnemySize {
  if (word.length <= 3) return 'small'
  if (word.length <= 6) return 'medium'
  if (word.length <= 10) return 'large'
  return 'boss'
}

export function createEnemy(
  word: string,
  x: number,
  speed: number,
): Enemy {
  return {
    id: nextId++,
    word,
    x,
    y: -20,
    speed,
    typedIndex: 0,
    status: 'active',
    locked: false,
    opacity: 1,
    size: getSizeForWord(word),
  }
}

export function getTypedPortion(enemy: Enemy): string {
  return enemy.word.slice(0, enemy.typedIndex)
}

export function getRemainingPortion(enemy: Enemy): string {
  return enemy.word.slice(enemy.typedIndex)
}

export function isFullyTyped(enemy: Enemy): boolean {
  return enemy.typedIndex >= enemy.word.length
}

export function advanceTyped(enemy: Enemy): void {
  if (enemy.typedIndex < enemy.word.length) {
    enemy.typedIndex++
  }
}