import './style.css'
import { resizeCanvas } from './utils/canvas'
import { createInitialState, getWordsForWave } from './GameState'
import type { GameState } from './GameState'
import { GameLoop } from './GameLoop'
import { StarField } from './systems/StarField'
import { EnemyManager } from './systems/EnemyManager'
import { ParticleSystem } from './systems/ParticleSystem'
import { DifficultyEngine } from './systems/DifficultyEngine'
import { AudioManager } from './systems/AudioManager'
import { Renderer } from './Renderer'
import { SETTINGS } from './config/settings'
import type { InputEvent } from './systems/InputHandler'

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

let state: GameState = createInitialState()

const starField = new StarField()
const particleSystem = new ParticleSystem()
const difficultyEngine = new DifficultyEngine()
const renderer = new Renderer(ctx)
const audioManager = new AudioManager()
audioManager.init('/audio/background.mp3')

function onInputEvent(event: InputEvent): void {
  switch (event.type) {
    case 'word_completed': {
      const enemy = event.enemy
      const comboBonus = Math.floor(state.combo / 3)
      const wordScore = enemy.word.length + comboBonus

      state.score += wordScore
      state.combo += 1
      state.bestCombo = Math.max(state.bestCombo, state.combo)
      state.wordsDestroyed += 1
      state.wordsCompletedInWave += 1

      // count the final letter that completed the word
      state.correctKeystrokes += 1
      state.keystrokes += 1

      particleSystem.spawnExplosion(enemy.x, enemy.y, enemy.size)
      renderer.triggerLaser(
        SETTINGS.canvasWidth / 2,
        SETTINGS.canvasHeight - 40,
        enemy.x,
        enemy.y,
      )
      enemyManager.removeEnemy(enemy.id)
      break
    }

    case 'letter_correct': {
      state.correctKeystrokes += 1
      state.keystrokes += 1
      break
    }

    case 'letter_wrong': {
      state.keystrokes += 1
      // no correctKeystrokes increment — this is the accuracy penalty
      state.combo = 0
      break
    }

    case 'no_target': {
      // deliberately not counted — pressing a key with no valid
      // target is not a typing mistake, it's a game state issue
      break
    }
  }
}

const enemyManager = new EnemyManager(onInputEvent)

function startWave(): void {
  state.wordsInWave = getWordsForWave(state.wave)
  state.wordsCompletedInWave = 0
  state.phase = 'playing'
  enemyManager.startWave(state.wave)
  enemyManager.start()
}

function update(dt: number): void {
  starField.update(dt)

  if (state.phase === 'idle') return
  if (state.phase === 'wave_complete') return
  if (state.phase === 'gameover') return
  if (state.phase === 'paused') return

  state.elapsedTime += dt * 1000
  renderer.update(dt)
  difficultyEngine.update(state, state.elapsedTime)

  const { missed } = enemyManager.update(dt, state)

  if (missed) {
    state.combo = 0
    state.wordsMissed += 1
    state.lives -= 1

    if (state.lives <= 0) {
      state.phase = 'gameover'
      enemyManager.stop()
      return
    }
  }

  if (enemyManager.isWaveComplete) {
    state.phase = 'wave_complete'
    enemyManager.stop()
  }
}

function render(): void {
  const W = SETTINGS.canvasWidth
  const H = SETTINGS.canvasHeight

  if (state.phase === 'idle') {
    renderer.render(starField, [], null, particleSystem, state)
    renderer.renderIdle(W, H)
    return
  }

  if (state.phase === 'wave_complete') {
    renderer.render(starField, [], null, particleSystem, state)
    renderer.renderWaveComplete(state, W, H)
    return
  }

  if (state.phase === 'gameover') {
    renderer.render(starField, [], null, particleSystem, state)
    renderer.renderGameOver(state, W, H)
    return
  }

  renderer.render(
    starField,
    enemyManager.activeEnemies,
    enemyManager.lockedEnemy,
    particleSystem,
    state,
  )
}

function startGame(): void {
  state = createInitialState()
  difficultyEngine.reset()
  enemyManager.reset()
  startWave()
}

function nextWave(): void {
  state.wave += 1
  startWave()
}

function handleGlobalKey(e: KeyboardEvent): void {
  if (e.key.length !== 1) return
  if (e.ctrlKey || e.metaKey || e.altKey) return

  audioManager.resume()

  if (state.phase === 'idle' || state.phase === 'gameover') {
    startGame()
    return
  }

  if (state.phase === 'wave_complete') {
    nextWave()
    return
  }

  if (state.phase === 'playing') {
    enemyManager.queueKey(e.key.toLowerCase())
  }
}

function handleResize(): void {
  resizeCanvas(canvas, ctx)
  starField.resize()
}

resizeCanvas(canvas, ctx)
window.addEventListener('keydown', handleGlobalKey)
window.addEventListener('resize', handleResize)

const gameLoop = new GameLoop(update, render)
gameLoop.start()