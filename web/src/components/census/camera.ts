export interface Eye {
  x: number
  y: number
  z: number
}

export const DEFAULT_EYE: Eye = { x: 1.6, y: 1.6, z: 0.9 }
export const DEFAULT_CAMERA = { eye: DEFAULT_EYE, center: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 0, z: 1 } }
export const ROTATE_STEP_DEG = 15
const ZOOM_IN = 0.8
const ZOOM_OUT = 1.25
const MIN_DISTANCE = 0.8
const MAX_DISTANCE = 6

/** Turn the eye about the vertical (z) axis; positive degrees turn it counter-clockwise seen from above. */
export function rotateEye(eye: Eye, degrees: number): Eye {
  const a = (degrees * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: eye.x * c - eye.y * s, y: eye.x * s + eye.y * c, z: eye.z }
}

const norm = (e: Eye) => Math.hypot(e.x, e.y, e.z)

/** Move the eye towards or away from the centre, within a sensible range. */
export function zoomEye(eye: Eye, direction: 'in' | 'out'): Eye {
  const d = norm(eye)
  const target = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, d * (direction === 'in' ? ZOOM_IN : ZOOM_OUT)))
  const k = target / d
  return { x: eye.x * k, y: eye.y * k, z: eye.z * k }
}
