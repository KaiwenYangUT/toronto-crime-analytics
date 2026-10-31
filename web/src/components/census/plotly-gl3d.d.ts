// Minimal local types for the parts of Plotly the census scene uses; no @types/plotly.js needed.
declare module 'plotly.js-gl3d-dist-min' {
  export interface PlotlyDiv extends HTMLElement {
    layout?: { scene?: { camera?: { eye?: { x: number; y: number; z: number } } } }
    _fullLayout?: { scene?: { camera?: { eye?: { x: number; y: number; z: number } } } }
  }
  interface PlotlyStatic {
    newPlot(root: HTMLElement, data: unknown[], layout?: unknown, config?: unknown): Promise<PlotlyDiv>
    react(root: HTMLElement, data: unknown[], layout?: unknown, config?: unknown): Promise<PlotlyDiv>
    relayout(root: HTMLElement, update: Record<string, unknown>): Promise<PlotlyDiv>
    purge(root: HTMLElement): void
    Plots: { resize(root: HTMLElement): void }
  }
  const Plotly: PlotlyStatic
  export default Plotly
}
