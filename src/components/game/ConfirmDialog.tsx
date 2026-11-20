import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PixelButton from '@/components/ui/PixelButton'
import PixelPanel from '@/components/ui/PixelPanel'

interface Props {
  open: boolean
  title: string
  /** Short warning shown under the title. */
  children: ReactNode
  confirmLabel: string
  cancelLabel: string
  tone?: 'danger' | 'primary'
  icon?: ReactNode
  onCancel: () => void
  onConfirm: () => void
}

/** Themed confirmation dialog. The backdrop deliberately does not confirm or
 * close: only the explicit buttons (or Escape) can dismiss it. */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  icon,
  onCancel,
  onConfirm,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useRef(`confirm-${Math.random().toString(36).slice(2)}`)
  const cancelRefCallback = useRef(onCancel)
  cancelRefCallback.current = onCancel

  useEffect(() => {
    if (!open) return
    const focusId = window.setTimeout(() => cancelRef.current?.focus(), 40)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancelRefCallback.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusId)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm"
          className="fixed inset-0 z-[70] flex items-end justify-center px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[#02060f]/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId.current}
            className="relative w-full max-w-sm"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <PixelPanel className="max-h-[calc(100dvh-1.5rem)] space-y-4 overflow-y-auto bg-[#04182a]/95">
              <div className="flex items-start gap-3">
                {icon && (
                  <span className="mt-0.5 shrink-0 text-coral" aria-hidden>
                    {icon}
                  </span>
                )}
                <div className="space-y-2">
                  <h2 id={titleId.current} className="pixel-text text-[11px] leading-relaxed text-white">
                    {title}
                  </h2>
                  <div className="text-sm leading-relaxed text-slate-300">{children}</div>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <PixelButton
                  ref={cancelRef}
                  variant="secondary"
                  onClick={onCancel}
                  className="min-h-[48px] w-full sm:w-auto"
                >
                  {cancelLabel}
                </PixelButton>
                <PixelButton
                  variant={tone === 'danger' ? 'danger' : 'primary'}
                  onClick={onConfirm}
                  className="min-h-[48px] w-full sm:w-auto"
                >
                  {confirmLabel}
                </PixelButton>
              </div>
            </PixelPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
