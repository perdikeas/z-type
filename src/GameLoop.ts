export type UpdateFn = (dt: number) => void
export type RenderFn = () => void

export class GameLoop {
  private updateFn: UpdateFn
  private renderFn: RenderFn
  private lastTimestamp: number = 0
  private rafId: number = 0
  private running: boolean = false
  private readonly maxDt: number = 1 / 20

  constructor(updateFn: UpdateFn, renderFn: RenderFn) {
    this.updateFn = updateFn
    this.renderFn = renderFn
    this.tick = this.tick.bind(this)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTimestamp = performance.now()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.rafId = 0
  }

  private tick(timestamp: number): void {
    if (!this.running) return

    const rawDt = (timestamp - this.lastTimestamp) / 1000
    const dt = Math.min(rawDt, this.maxDt)
    this.lastTimestamp = timestamp

    this.updateFn(dt)
    this.renderFn()

    this.rafId = requestAnimationFrame(this.tick)
  }
}