import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import OceanBackground from '@/components/ocean/OceanBackground'

export default function AppShell() {
  return (
    <div className="relative flex min-h-full flex-col">
      <OceanBackground />
      <Navigation />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="pixel-text py-4 text-center text-[8px] text-slate-400">
        Deep Dive Trivia · personal edition
      </footer>
    </div>
  )
}
