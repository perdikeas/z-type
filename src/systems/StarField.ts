import { SETTINGS } from '../config/settings'
import { randomBetween } from '../utils/math'

interface Star {
  x: number
  y: number
  radius: number
  speed: number
  opacity: number
}

const LAYERS = [
  { count: 80,  speedMin: 10,  speedMax: 20,  radiusMin: 0.2, radiusMax: 0.8,  opacityMin: 0.2, opacityMax: 0.5 },
  { count: 50,  speedMin: 25,  speedMax: 45,  radiusMin: 0.5, radiusMax: 1.2,  opacityMin: 0.4, opacityMax: 0.7 },
  { count: 25,  speedMin: 55,  speedMax: 90,  radiusMin: 1.0, radiusMax: 2.0,  opacityMin: 0.6, opacityMax: 1.0 },
]

export class StarField {
  private stars: Star[] = []

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    this.stars = []

    for (const layer of LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push(this.createStar(layer, true))
      }
    }
  }

  private createStar(layer: typeof LAYERS[0], randomY: boolean): Star {
    return {
      x: randomBetween(0, SETTINGS.canvasWidth),
      y: randomY
        ? randomBetween(0, SETTINGS.canvasHeight)
        : randomBetween(-10, -2),
      radius: randomBetween(layer.radiusMin, layer.radiusMax),
      speed: randomBetween(layer.speedMin, layer.speedMax),
      opacity: randomBetween(layer.opacityMin, layer.opacityMax),
    }
  }

  update(dt: number): void {
    const height = SETTINGS.canvasHeight

    for (const star of this.stars) {
      star.y += star.speed * dt

      if (star.y > height + 2) {
        const layer = LAYERS.find(
          l => star.speed >= l.speedMin && star.speed <= l.speedMax
        ) ?? LAYERS[0]

        star.x = randomBetween(0, SETTINGS.canvasWidth)
        star.y = randomBetween(-10, -2)
        star.radius = randomBetween(layer.radiusMin, layer.radiusMax)
        star.opacity = randomBetween(layer.opacityMin, layer.opacityMax)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
      ctx.fill()
    }
  }

  resize(): void {
    this.initialize()
  }
}