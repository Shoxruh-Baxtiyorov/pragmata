import { useTranslation } from 'react-i18next'
import { PlaceholderPage } from '@/shared/ui'

export function AssistantPage() {
  const { t } = useTranslation()
  return <PlaceholderPage title={t('nav.assistant')} />
}
