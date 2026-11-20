import { useMemo } from 'react'
import { useMotionValue, type MotionValue } from 'framer-motion'

/**
 * Shared, frame-rate motion values for the underwater scene. They are updated
 * imperatively (no React re-render per frame) and read by the background,
 * depth gauge and header.
 */
export interface OceanMotion {
  /** Current depth in metres (continuous). */
  depth: MotionValue<number>
  camScale: MotionValue<number>
  camX: MotionValue<number>
  camY: MotionValue<number>
}

export function useOceanMotion(initialDepth = 0): OceanMotion {
  const depth = useMotionValue(initialDepth)
  const camScale = useMotionValue(1)
  const camX = useMotionValue(0)
  const camY = useMotionValue(0)
  return useMemo(() => ({ depth, camScale, camX, camY }), [depth, camScale, camX, camY])
}
