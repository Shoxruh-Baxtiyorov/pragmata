import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, SkeletonGrid, StaleBadge } from '@/shared/ui'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { cn } from '@/shared/lib/utils'
import type { Camera } from '@/shared/api/types'
import { useCameras } from '../api/liveApi'
import { CameraTile } from '../components/CameraTile'
import { LiveViewModal } from '../components/LiveViewModal'

// Одна сетка для скелетона и стены — плитки не «прыгают» при появлении данных.
const GRID_COLS = 'grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'

export function LivePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, error, refetch } = useCameras()
  const [selected, setSelected] = useState<Camera | null>(null)
  const online = data?.reduce((n, c) => n + (c.online ? 1 : 0), 0) ?? 0

  return (
    <>
      <PageHeader
        title={t('live.title')}
        subtitle={t('live.subtitle')}
        actions={
          data && data.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Список камер опрашивается 4×/сек: обрыв показываем меткой, стену не гасим */}
              <StaleBadge show={isError} />
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t('live.online')}:{' '}
                <span className="tabular-nums text-[var(--color-text-primary)]">
                  {online}/{data.length}
                </span>
              </span>
            </div>
          ) : undefined
        }
      />
      {isLoading ? (
        <SkeletonGrid count={6} item="aspect-video" cols={GRID_COLS} />
      ) : isError && !data ? (
        <EmptyState text={apiErrorMessage(error, t)} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState text={t('live.empty')} />
      ) : (
        <div className={cn('grid', GRID_COLS)}>
          {data.map((cam) => (
            <CameraTile key={cam.id} camera={cam} onOpen={setSelected} />
          ))}
        </div>
      )}
      {selected && <LiveViewModal camera={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
