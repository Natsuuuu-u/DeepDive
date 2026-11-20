import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  icon?: ReactNode
}

export default function PageTitle({ title, subtitle, icon }: Props) {
  return (
    <header className="mb-4 sm:mb-6">
      <h1 className="pixel-text flex items-center gap-2.5 text-base leading-relaxed text-sonar sm:gap-3 sm:text-xl">
        {icon}
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-sm text-slate-300">{subtitle}</p>}
    </header>
  )
}
