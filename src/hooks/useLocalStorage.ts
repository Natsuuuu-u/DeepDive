import { useCallback, useState } from 'react'
import { readJSON, writeJSON } from '@/lib/storage'

export function useLocalStorage<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readJSON<T>(key, initial))

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        writeJSON(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
