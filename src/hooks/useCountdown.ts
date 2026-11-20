import { useCallback, useEffect, useRef, useState } from 'react'

export function useCountdown(totalSeconds: number, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (running && secondsLeft === 0) {
      setRunning(false)
      expireRef.current?.()
    }
  }, [running, secondsLeft])

  const start = useCallback(() => setRunning(true), [])
  const pause = useCallback(() => setRunning(false), [])
  const reset = useCallback(
    (seconds = totalSeconds) => {
      setRunning(false)
      setSecondsLeft(seconds)
    },
    [totalSeconds],
  )

  return { secondsLeft, running, start, pause, reset }
}
