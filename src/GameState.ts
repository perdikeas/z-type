import type { WordTier } from './config/words'

export type GamePhase = 'idle' | 'playing' | 'wave_complete' | 'paused' | 'gameover'

export interface GameState {
  phase: GamePhase
  score: number
  lives: number
  combo: number
  bestCombo: number
  wordsDestroyed: number
  wordsMissed: number
  keystrokes: number
  correctKeystrokes: number
  currentTier: WordTier
  elapsedTime: number
  wave: number
  wordsInWave: number
  wordsCompletedInWave: number
}

export function createInitialState(): GameState {
  return {
    phase: 'idle',
    score: 0,
    lives: 3,
    combo: 0,
    bestCombo: 0,
    wordsDestroyed: 0,
    wordsMissed: 0,
    keystrokes: 0,
    correctKeystrokes: 0,
    currentTier: 'easy',
    elapsedTime: 0,
    wave: 1,
    wordsInWave: 0,
    wordsCompletedInWave: 0,
  }
}

export function computeAccuracy(state: GameState): number {
  if (state.keystrokes === 0) return 100
  return Math.round((state.correctKeystrokes / state.keystrokes) * 100)
}

export function computeWPM(state: GameState): number {
  if (state.elapsedTime === 0) return 0
  const minutes = state.elapsedTime / 60000
  return Math.round(state.wordsDestroyed / minutes)
}

export function getWordsForWave(wave: number): number {
  return Math.min(12 + (wave - 1) * 4, 40)
}

export function getTierForWave(wave: number): WordTier {
  if (wave <= 1) return 'easy'
  if (wave <= 3) return 'medium'
  if (wave <= 6) return 'hard'
  return 'expert'
}

export function getMaxWordLengthForWave(wave: number): number {
  if (wave === 1) return 4
  if (wave <= 4) return 4 + wave
  return Math.min(10 + Math.floor((wave - 4) / 1.5), 22)
}