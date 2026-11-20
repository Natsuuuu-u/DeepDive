/** Cinematic dive-in sequence shown before the first question. */
export const INTRO_DURATION_MS = 4600
/** Reduced-motion intro: a short, still title card. */
export const REDUCED_INTRO_DURATION_MS = 900
/** The overlay begins fading this long before the intro completes. */
export const INTRO_EXIT_MS = 380

export function getIntroDurationMs(reduceMotion: boolean): number {
  return reduceMotion ? REDUCED_INTRO_DURATION_MS : INTRO_DURATION_MS
}
