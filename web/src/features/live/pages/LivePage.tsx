import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/shared/ui'

export function LivePage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('nav.live')} />
}
