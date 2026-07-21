import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { ApiError } from '../api'
import { Button, Card } from '../ui'

// Единый рендер состояний страницы: скелетон → ошибка (403 — отдельно) → контент.
export function PageState({
  loading,
  error,
  reload,
  children,
}: {
  loading: boolean
  error: ApiError | null
  reload: () => void
  children: ReactNode
}) {
  if (loading) {
    // шиммер как в референсе (.sk), а не пульсация
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="sk h-24" />
          ))}
        </div>
        <div className="sk h-64" />
      </div>
    )
  }

  if (error) {
    const forbidden = error.status === 403
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <div className="mb-3 flex justify-center text-warning">
          <ShieldAlert size={40} />
        </div>
        <p className="mb-1 text-h4 font-semibold">
          {forbidden ? 'Доступ к бэкофису не выдан' : 'Не удалось загрузить'}
        </p>
        <p className="mb-5 text-label text-text-secondary">
          {forbidden
            ? 'Ваш аккаунт не в списке BACKOFFICE_USERS. Добавьте имя в env и перезапустите API.'
            : error.message}
        </p>
        {!forbidden && <Button onClick={reload}>Повторить</Button>}
      </Card>
    )
  }

  return <>{children}</>
}
