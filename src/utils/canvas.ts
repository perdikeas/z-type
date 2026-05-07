import { SETTINGS } from '../config/settings'

export function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D):
void{
    const dpr = SETTINGS.dpr
    
    canvas.width = SETTINGS.canvasWidth * dpr
    canvas.height = SETTINGS.canvasHeight * dpr

    canvas.style.width = `${SETTINGS.canvasWidth}px`
    canvas.style.height = `${SETTINGS.canvasHeight}px`

    ctx.scale(dpr, dpr)
}