import { useLayoutEffect, useRef } from 'react'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'

interface Props {
  value: MotionValue<number>
  format: (value: number) => string
  className?: string
}

/** Text that follows a motion value frame by frame without re-rendering React. */
export default function MotionText({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const formatRef = useRef(format)
  formatRef.current = format

  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = formatRef.current(value.get())
  }, [value])

  useMotionValueEvent(value, 'change', (latest) => {
    if (ref.current) ref.current.textContent = formatRef.current(latest)
  })

  return <span ref={ref} className={className} />
}
