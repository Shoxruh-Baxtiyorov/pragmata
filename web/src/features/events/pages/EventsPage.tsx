import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/shared/ui'

export function EventsPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('nav.events')} />
}
