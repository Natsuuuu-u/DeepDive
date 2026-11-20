import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, EllipsisVertical, LogOut, RotateCcw } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  onRestart: () => void
  onExit: () => void
}

/** Small in-game menu: exit or restart the current dive, both behind a confirmation. */
export default function GameMenu({ onRestart, onExit }: Props) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<'restart' | 'exit' | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const focusId = window.setTimeout(() => firstItemRef.current?.focus(), 30)
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(focusId)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: 'restart' | 'exit') => {
    setOpen(false)
    setConfirming(action)
  }

  const closeDialog = () => {
    setConfirming(null)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const confirm = () => {
    const action = confirming
    closeDialog()
    if (action === 'restart') onRestart()
    else if (action === 'exit') onExit()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Game menu"
        title="Game menu"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center border-2 border-[#0b2a3d] bg-ink/70 text-slate-200 shadow-pixel-sm transition-colors hover:text-sonar"
      >
        <EllipsisVertical size={16} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="game-menu"
            role="menu"
            aria-label="Game options"
            className="absolute right-0 top-full z-40 mt-2 w-44 border-2 border-[#0b2a3d] bg-ink/95 p-1 shadow-pixel backdrop-blur-sm"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top right' }}
          >
            <button
              ref={firstItemRef}
              type="button"
              role="menuitem"
              onClick={() => choose('restart')}
              className="pixel-text flex min-h-[40px] w-full items-center gap-2 px-2 py-2.5 text-left text-[8px] text-slate-200 transition-colors hover:bg-white/10 hover:text-sonar focus-visible:bg-white/10 focus-visible:text-sonar"
            >
              <RotateCcw size={13} aria-hidden />
              Restart Game
            </button>
            <div className="my-1 h-px bg-white/10" aria-hidden />
            <button
              type="button"
              role="menuitem"
              onClick={() => choose('exit')}
              className="pixel-text flex min-h-[40px] w-full items-center gap-2 px-2 py-2.5 text-left text-[8px] text-coral transition-colors hover:bg-coral/15 focus-visible:bg-coral/15"
            >
              <LogOut size={13} aria-hidden />
              Exit Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirming === 'restart'}
        title="Restart this dive?"
        confirmLabel="Restart"
        cancelLabel="Cancel"
        tone="danger"
        icon={<RotateCcw size={20} />}
        onCancel={closeDialog}
        onConfirm={confirm}
      >
        Your score, answers and depth will be reset, and you’ll begin again at Question 1. The
        question set, difficulty and category for this mode stay the same.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirming === 'exit'}
        title="Exit this dive?"
        confirmLabel="Exit Game"
        cancelLabel="Continue Playing"
        tone="danger"
        icon={<AlertTriangle size={20} />}
        onCancel={closeDialog}
        onConfirm={confirm}
      >
        Your current progress, score and answers will be lost. This unfinished dive will not be
        scored, saved to your history, or count toward achievements or rewards.
      </ConfirmDialog>
    </div>
  )
}
