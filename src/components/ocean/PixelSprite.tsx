import type { CSSProperties } from 'react'
import { spriteSize, spriteUrl, type SpriteKey } from './spriteArt'

interface Props {
  sprite: SpriteKey
  /** Rendered pixel size per sprite cell. */
  pixel?: number
  flip?: boolean
  className?: string
  style?: CSSProperties
}

export default function PixelSprite({ sprite, pixel = 4, flip = false, className = '', style }: Props) {
  const { cols, rows } = spriteSize(sprite)
  return (
    <img
      src={spriteUrl(sprite)}
      alt=""
      aria-hidden
      draggable={false}
      width={cols * pixel}
      height={rows * pixel}
      className={`select-none ${className}`}
      style={{
        imageRendering: 'pixelated',
        width: cols * pixel,
        height: rows * pixel,
        maxWidth: 'none',
        transform: flip ? 'scaleX(-1)' : undefined,
        ...style,
      }}
    />
  )
}
