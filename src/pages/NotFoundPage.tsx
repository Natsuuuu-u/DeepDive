import { Link } from 'react-router-dom'
import PageTitle from '@/components/ui/PageTitle'

export default function NotFoundPage() {
  return (
    <div className="pt-10 text-center">
      <PageTitle title="Lost at sea" subtitle="That page doesn't exist." />
      <Link to="/" className="pixel-text text-xs text-gold underline">
        Back to the surface
      </Link>
    </div>
  )
}
