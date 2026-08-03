import { useCallback } from 'react'
import { DigestText } from '../components/DigestText'
import { useTranslation } from 'react-i18next'
import {
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  SkeletonGrid,
  StaleBadge,
  StatTile,
} from '@/shared/ui'
// Напрямую из кита, а не через '@/shared/ui': барель тянет recharts во все чанки
import { CategoryBarChart } from '@/shared/ds/charts'
import { eventLabel, type EventType } from '@/shared/lib/format'
import { eventIcon } from '@/shared/ui/icons'
import { useDigest, useStats } from '../api/insightsApi'

// Иконка типа события от языка не зависит — держим её вне компонента, чтобы
// проп графика не менялся на каждом опросе (раз в 30с).
const iconForType = (key: string) => eventIcon[key as EventType]

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const lang = (['ru', 'uz', 'en'].includes(i18n.language) ? i18n.language : 'uz') as 'ru' | 'uz' | 'en'
  const formatType = useCallback((key: string) => eventLabel(key, lang), [lang])
  const stats = useStats(24)
  const digest = useDigest(24, lang)
  const data = stats.data

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('stats.title')}
        subtitle={t('stats.subtitle')}
        // цифры на экране уже устарели — говорим об этом, а не стираем весь экран
        actions={<StaleBadge show={stats.isError && !!data} />}
      />

      {stats.isLoading ? (
        <>
          {/* сетки скелетонов повторяют боевые — иначе на загрузке плитки прыгают */}
          <SkeletonGrid count={3} item="h-24" cols="gap-4 sm:grid-cols-3" />
          <SkeletonGrid count={2} item="h-56" cols="gap-4 lg:grid-cols-2" />
        </>
      ) : !data ? (
        <EmptyState text={t('common.noConnection')} onRetry={stats.refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile label={t('stats.visitors')} value={data.visitors_entered} />
            <StatTile label={t('stats.alerts')} value={data.alerts} />
            <StatTile label={t('stats.fp')} value={data.false_positives} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="text-h4">{t('stats.byType')}</h2>
              <CategoryBarChart
                data={data.by_type}
                ariaLabel={t('stats.byType')}
                emptyText={t('common.empty')}
                formatLabel={formatType}
                icon={iconForType}
              />
            </Card>
            <Card>
              <h2 className="text-h4">{t('stats.byCamera')}</h2>
              <CategoryBarChart
                data={data.by_camera}
                ariaLabel={t('stats.byCamera')}
                emptyText={t('common.empty')}
              />
            </Card>
          </div>
        </>
      )}

      {/* дайджест — независимый запрос: своя загрузка/ошибка/пустота, не зависит от stats */}
      <Card>
        <h2 className="text-h4">{t('stats.digest')}</h2>
        {digest.isLoading ? (
          <Skeleton className="h-40" />
        ) : digest.isError ? (
          <EmptyState text={t('common.noConnection')} onRetry={digest.refetch} />
        ) : digest.data?.text.trim() ? (
          <DigestText text={digest.data.text} />
        ) : (
          <EmptyState text={t('common.empty')} />
        )}
      </Card>
    </div>
  )
}
