export function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}