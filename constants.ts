/** Shared world geometry. Everything is measured in logical (pre-upscale) pixels. */
export const ZONE_COUNT = 5
export const ZONE_H = 900
export const WORLD_H = ZONE_H * ZONE_COUNT
export const SURFACE_Y = -28
export const FLOOR_Y = WORLD_H + 48
/** Sky pixels stored above the waterline in the background strip. */
export const BG_TOP = 160
/** Where the diver sits on screen when the camera has caught up (0..1 of height). */
export const DIVER_SCREEN_Y = 0.42
