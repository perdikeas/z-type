export const SETTINGS = {
  get canvasWidth() { return window.innerWidth },
  get canvasHeight() { return window.innerHeight },
  get dpr() { return Math.min(window.devicePixelRatio ?? 1, 2) },
} as const