export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  radius: number
  color: string
  lifetime: number
  age: number
}

export function createParticle(
  x: number,
  y: number,
  color: string,
): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = Math.random() * 120 + 40

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    alpha: 1,
    radius: Math.random() * 2.5 + 1,
    color,
    lifetime: Math.random() * 0.4 + 0.3,
    age: 0,
  }
}