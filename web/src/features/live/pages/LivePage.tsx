import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EmptyState, Spinner } from '@/shared/ui'
import { useCameras } from '../api/liveApi'
import { CameraTile } from '../components/CameraTile'

export function LivePage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { data, isLoading, isError } = useCameras()

  if (isLoading) return <Spinner />
  if (isError) return <EmptyState title={t('common.noConnection')} />
  if (!data || data.length === 0) return <EmptyState title={t('live.empty')} />

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map((cam) => (
        <CameraTile
          key={cam.id}
          camera={cam}
          onClick={() => nav(`/events?camera_id=${cam.id}`)}
        />
      ))}
    </div>
  )
}
