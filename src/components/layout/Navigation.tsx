import { NavLink } from 'react-router-dom'
import { Anchor, Archive, BarChart3, CalendarDays, Infinity as InfinityIcon, Settings, type LucideIcon } from 'lucide-react'

interface Item {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: Item[] = [
  { to: '/', label: 'Home', icon: Anchor },
  { to: '/daily', label: 'Daily Dive', icon: CalendarDays },
  { to: '/unlimited', label: 'Unlimited', icon: InfinityIcon },
  { to: '/archive', label: 'Archive', icon: Archive },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Navigation() {
  return (
    <nav
      aria-label="Main"
      className="pt-safe sticky top-0 z-30 border-b-4 border-[#0b2a3d] bg-ink/95 backdrop-blur"
    >
      <ul className="mx-auto grid max-w-5xl grid-cols-6 gap-0.5 px-1.5 py-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `pixel-text flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[9px] transition-colors active:brightness-95 sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-[10px] ${
                  isActive ? 'bg-sonar text-ink shadow-pixel-sm' : 'text-slate-200 hover:bg-white/10'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
