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
      className="sticky top-0 z-20 border-b-4 border-[#0b2a3d] bg-ink/90 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-2 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `pixel-text flex items-center gap-2 whitespace-nowrap px-3 py-2 text-[9px] transition-colors ${
                  isActive ? 'bg-sonar text-ink shadow-pixel-sm' : 'text-slate-200 hover:bg-white/10'
                }`
              }
            >
              <Icon size={14} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
