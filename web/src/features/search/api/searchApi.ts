import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, ApiError } from '@/shared/api/client'
import { apiErrorMessage } from '@/shared/lib/apiError'
import type { FindItem } from '@/shared/api/types'

export interface SearchState {
  items: FindItem[]
  disabled: boolean // 501 — поиск выключен на сервере
  message: string | null // 422 и т.п. — уже переведённый текст, не сырой backend detail
}

export function useSearch() {
  const { t } = useTranslation()
  return useMutation<SearchState, ApiError, { description: string; hours: number }>({
    mutationFn: async ({ description, hours }) => {
      try {
        const items = await api.get<FindItem[]>(
          `/api/v1/find?description=${encodeURIComponent(description)}&hours=${hours}`,
        )
        return { items, disabled: false, message: null }
      } catch (e) {
        if (e instanceof ApiError && e.status === 501)
          return { items: [], disabled: true, message: null }
        if (e instanceof ApiError && e.status === 422)
          return { items: [], disabled: false, message: apiErrorMessage(e, t) }
        throw e
      }
    },
  })
}
