import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import OceanBackground from '@/components/ocean/OceanBackground'

export default function AppShell() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <OceanBackground />
      <Navigation />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
      <footer className="pixel-text pb-safe px-3 pt-2 text-center text-[8px] text-slate-400">
        Deep Dive Trivia · personal edition
      </footer>
    </div>
  )
}
