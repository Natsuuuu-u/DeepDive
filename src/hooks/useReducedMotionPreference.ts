import { useReducedMotion } from 'framer-motion'
import { useSettings } from '@/context/SettingsContext'

/** True when the in-app "reduce motion" setting or the OS preference asks for less motion. */
export function useReducedMotionPreference(): boolean {
  const { settings } = useSettings()
  const system = useReducedMotion()
  return settings.reduceMotion || Boolean(system)
}
