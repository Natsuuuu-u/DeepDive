import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:bg-yellow-300 active:bg-yellow-400',
  secondary: 'bg-sky-700 text-white hover:bg-sky-600 active:bg-sky-500',
  danger: 'bg-coral text-ink hover:bg-rose-400 active:bg-rose-500',
}

const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(
  { variant = 'primary', icon, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`pixel-text inline-flex min-h-[44px] select-none touch-manipulation items-center justify-center gap-2 px-4 py-2.5 text-[11px] shadow-pixel transition-[transform,filter] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})

export default PixelButton
