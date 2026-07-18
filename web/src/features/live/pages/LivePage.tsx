import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, Skeleton } from '@/shared/ui'
import type { Camera } from '@/shared/api/types'
import { useCameras } from '../api/liveApi'
import { CameraTile } from '../components/CameraTile'
import { LiveViewModal } from '../components/LiveViewModal'

export function LivePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useCameras()
  const [selected, setSelected] = useState<Camera | null>(null)

  return (
    <>
      <PageHeader title={t('live.title')} subtitle={t('live.subtitle')} />
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState text={t('common.noConnection')} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState text={t('live.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((cam) => (
            <CameraTile key={cam.id} camera={cam} onOpen={setSelected} />
          ))}
        </div>
      )}
      {selected && <LiveViewModal camera={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
