import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-gold text-ink hover:bg-yellow-300',
  secondary: 'bg-sky-700 text-white hover:bg-sky-600',
  danger: 'bg-coral text-ink hover:bg-rose-400',
}

const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(
  { variant = 'primary', icon, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`pixel-text inline-flex items-center justify-center gap-2 px-4 py-3 text-[10px] shadow-pixel transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})

export default PixelButton
