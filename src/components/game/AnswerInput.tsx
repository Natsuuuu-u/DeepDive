import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import PixelButton from '@/components/ui/PixelButton'

interface Props {
  onSubmit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export default function AnswerInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type your answer…',
  autoFocus = true,
}: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && !disabled) inputRef.current?.focus()
  }, [autoFocus, disabled])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  // On touch devices the soft keyboard can cover the field; nudge it into view.
  const handleFocus = () => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return
    window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 260)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Your answer"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        enterKeyHint="go"
        spellCheck={false}
        className="pixel-border min-w-0 flex-1 bg-black/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-sonar disabled:opacity-50"
      />
      <PixelButton type="submit" disabled={disabled || !value.trim()} icon={<Send size={14} />}>
        Dive
      </PixelButton>
    </form>
  )
}
