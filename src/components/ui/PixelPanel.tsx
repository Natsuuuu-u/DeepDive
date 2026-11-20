import type { HTMLAttributes } from 'react'

export default function PixelPanel({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`pixel-border bg-ink/80 p-4 backdrop-blur-sm ${className}`} {...rest}>
      {children}
    </div>
  )
}
