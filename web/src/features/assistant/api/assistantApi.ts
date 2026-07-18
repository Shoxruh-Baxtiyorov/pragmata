import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { AgentAnswer } from '@/shared/api/types'

// уникальная сессия на загрузку вкладки: своя история диалога, без чужого контекста
// (иначе модель пересказывает прошлые ответы из памяти, не вызвав инструмент → нет фото)
const SESSION_ID = crypto.randomUUID()

export function useAgentEnabled() {
  return useQuery({
    queryKey: ['agent-enabled'],
    queryFn: () => api.get<{ enabled: boolean }>('/api/v1/agent/enabled'),
    staleTime: 60_000,
  })
}

export function useAsk() {
  return useMutation({
    mutationFn: (question: string) =>
      api.post<AgentAnswer>('/api/v1/agent/ask', { question, session_id: SESSION_ID }),
  })
}
