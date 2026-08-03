import type { TFunction } from 'i18next'
import { ApiError } from '@/shared/api/client'

// Бэкенд всегда шлёт detail на русском (см. pragmata/api) — показывать его как
// есть нельзя в uz/en UI. Известные строки переводим по карте; неизвестные
// (ещё не занесённые сюда) прячем за общим сообщением, а не светим кириллицу.
const KNOWN_MESSAGES: Record<string, string> = {
  'выберите организацию: платформенный админ не владеет камерами': 'errors.noOrganization',
}

/** Безопасный текст ошибки API для показа пользователю — никогда не сырой backend detail. */
export function apiErrorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiError)) return t('common.noConnection')
  const key = KNOWN_MESSAGES[error.message]
  return key ? t(key) : t('errors.unexpected')
}
