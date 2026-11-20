import { useEffect, useRef, useState } from 'react'

function getSecondsLeft(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export function useDeadlineTimer(deadline: number, active: boolean, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft(deadline))
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(deadline))
    if (!active) return

    let timeoutId = 0
    let expired = false
    const update = () => {
      const remaining = getSecondsLeft(deadline)
      setSecondsLeft(remaining)
      if (remaining === 0) {
        if (!expired) {
          expired = true
          expireRef.current()
        }
        return
      }
      timeoutId = window.setTimeout(update, Math.min(1000, deadline - Date.now()))
    }

    update()
    return () => window.clearTimeout(timeoutId)
  }, [active, deadline])

  return secondsLeft
}
