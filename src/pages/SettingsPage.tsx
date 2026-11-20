import { useState } from 'react'
import { Settings as SettingsIcon, Trash2 } from 'lucide-react'
import PageTitle from '@/components/ui/PageTitle'
import PixelPanel from '@/components/ui/PixelPanel'
import PixelButton from '@/components/ui/PixelButton'
import { useSettings } from '@/context/SettingsContext'
import { clearAllProgress } from '@/lib/storage'

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-4 py-1">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-cyan-300"
      />
    </label>
  )
}

export default function SettingsPage() {
  const { settings, update, reset } = useSettings()
  const [cleared, setCleared] = useState(false)

  return (
    <div>
      <PageTitle title="Settings" subtitle="Stored locally in your browser." icon={<SettingsIcon size={22} />} />
      <div className="space-y-4">
        <PixelPanel>
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => update('reduceMotion', v)} />
          <Toggle label="Sound effects (not built yet)" checked={settings.soundEnabled} onChange={(v) => update('soundEnabled', v)} />
        </PixelPanel>

        <PixelPanel>
          <h2 className="pixel-text text-[10px] text-sonar">Dive rules</h2>
          <p className="mt-3 text-sm text-slate-300">
            Every dive has 7 questions, 25 seconds per question, and a maximum score of 700.
            Easy, Normal and Hard change which questions appear. Each accepted answer has its own
            rarity: common answers score little, niche answers score more, and the most obscure can
            reach One in a Krillion.
          </p>
        </PixelPanel>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PixelButton variant="secondary" onClick={reset} className="w-full sm:w-auto">
            Reset settings
          </PixelButton>
          <PixelButton
            variant="danger"
            icon={<Trash2 size={14} />}
            className="w-full sm:w-auto"
            onClick={() => {
              if (window.confirm('Delete all saved runs and statistics?')) {
                clearAllProgress()
                setCleared(true)
              }
            }}
          >
            Clear progress
          </PixelButton>
        </div>
        {cleared && <p className="text-sm text-kelp">Progress cleared.</p>}
      </div>
    </div>
  )
}
