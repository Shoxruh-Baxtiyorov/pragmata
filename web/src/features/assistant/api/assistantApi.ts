import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { AgentAnswer } from '@/shared/api/types'

// Уникальная сессия на загрузку вкладки: своя история диалога, без чужого контекста.
// Не персистим — иначе модель пересказывает прошлые ответы из памяти, не вызвав инструмент → нет фото.
// randomUUID доступен только в secure context; по LAN через http без фолбэка падает весь бандл.
const SESSION_ID = crypto.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`

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
