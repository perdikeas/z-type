export class AudioManager {
  private audio: HTMLAudioElement | null = null
  private started: boolean = false
  private volume: number = 0.4

  init(src: string): void {
    this.audio = new Audio(src)
    this.audio.loop = true
    this.audio.volume = this.volume
    this.audio.preload = 'auto'
  }

  start(): void {
    if (!this.audio || this.started) return

    this.audio.play().then(() => {
      this.started = true
    }).catch(() => {
      // autoplay was blocked — we'll retry on first user interaction
    })
  }

  resume(): void {
    if (!this.audio) return
    if (this.audio.paused) {
      this.audio.play().catch(() => {})
    }
  }

  stop(): void {
    if (!this.audio) return
    this.audio.pause()
    this.audio.currentTime = 0
    this.started = false
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.audio) this.audio.volume = v
  }
}