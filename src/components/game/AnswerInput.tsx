import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import PixelButton from '@/components/ui/PixelButton'

interface Props {
  onSubmit: (value: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
  /** Changes when the question changes; clears the field for the next question. */
  resetKey?: string
  /** Refills the field, e.g. when the player rejects a spelling suggestion. */
  prefill?: { text: string; nonce: number } | null
}

export default function AnswerInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type answer…',
  autoFocus = true,
  resetKey,
  prefill,
}: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollTimer = useRef<number>()

  useEffect(() => {
    if (!autoFocus || disabled) return
    // A coarse pointer means a soft keyboard: focusing here would open it over
    // the question before the player is ready. They tap when they want to type.
    if (window.matchMedia('(pointer: coarse)').matches) return
    inputRef.current?.focus()
  }, [autoFocus, disabled])

  useEffect(() => {
    setValue('')
  }, [resetKey])

  useEffect(() => {
    if (!prefill) return
    setValue(prefill.text)
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [prefill])

  useEffect(() => () => window.clearTimeout(scrollTimer.current), [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    // Keep the text so a rejected answer can be corrected without retyping;
    // the field clears when the next question (or a restart) begins.
  }

  // On touch devices the soft keyboard can cover the field; nudge it into view.
  const handleFocus = () => {
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return
    window.clearTimeout(scrollTimer.current)
    scrollTimer.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 260)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-stretch gap-2 scroll-mb-[45dvh]">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Your answer"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="off"
        enterKeyHint="go"
        spellCheck={false}
        className="pixel-border min-h-[48px] w-full min-w-0 flex-1 touch-manipulation bg-black/60 px-3 py-3 text-base text-white placeholder:text-slate-500 focus:border-sonar disabled:opacity-50 sm:px-4"
      />
      <PixelButton
        type="submit"
        disabled={disabled || !value.trim()}
        icon={<Send size={14} />}
        className="min-w-[88px] shrink-0 px-4"
      >
        Dive
      </PixelButton>
    </form>
  )
}
