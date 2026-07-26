import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-[64px] font-extrabold text-[var(--color-brand-500)]">404</div>
      <p className="text-[var(--color-text-secondary)]">Страница не найдена</p>
      <Link to="/">
        <Button>На главную</Button>
      </Link>
    </div>
  )
}
