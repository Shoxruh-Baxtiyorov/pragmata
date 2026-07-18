import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader, Skeleton } from '@/shared/ui'
import { useCameras } from '../api/liveApi'
import { CameraTile } from '../components/CameraTile'

export function LivePage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { data, isLoading, isError } = useCameras()

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
        <EmptyState text={t('common.noConnection')} />
      ) : !data || data.length === 0 ? (
        <EmptyState text={t('live.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((cam) => (
            <CameraTile key={cam.id} camera={cam} onClick={() => nav(`/events?camera_id=${cam.id}`)} />
          ))}
        </div>
      )}
    </>
  )
}
