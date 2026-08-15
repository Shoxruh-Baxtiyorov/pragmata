import { useMutation } from '@tanstack/react-query'
import { api } from '@/shared/api/client'

export interface ContactInput {
  name: string
  contact: string
  message: string
}

// публичная форма «Связаться» — без авторизации (лендинг открыт всем)
export function useSubmitContact() {
  return useMutation({
    mutationFn: (body: ContactInput) => api.post('/api/v1/contact', body),
  })
}
