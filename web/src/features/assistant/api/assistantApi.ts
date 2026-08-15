import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type {
  AgentAnswer,
  AgentConversation,
  AgentMemoryItem,
  AgentMessage,
} from '@/shared/api/types'

export function useAgentEnabled() {
  return useQuery({
    queryKey: ['agent-enabled'],
    queryFn: () => api.get<{ enabled: boolean }>('/api/v1/agent/enabled'),
    staleTime: 60_000,
  })
}

// --- сохранённые диалоги ----------------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: ['agent-conversations'],
    queryFn: () => api.get<AgentConversation[]>('/api/v1/agent/conversations'),
  })
}

export function useConversationMessages(id: string | null) {
  return useQuery({
    queryKey: ['agent-conversation', id],
    queryFn: () => api.get<AgentMessage[]>(`/api/v1/agent/conversations/${id}`),
    enabled: !!id,
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/agent/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-conversations'] }),
  })
}

export function useRenameConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/api/v1/agent/conversations/${id}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-conversations'] }),
  })
}

// вопрос в конкретный диалог (conversationId=null → бэкенд создаст новый)
export function useAsk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ question, conversationId }: { question: string; conversationId: string | null }) =>
      api.post<AgentAnswer>('/api/v1/agent/ask', {
        question,
        conversation_id: conversationId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['agent-conversations'] })
      void qc.invalidateQueries({ queryKey: ['agent-memory'] })
    },
  })
}

// --- долговременная память ---------------------------------------------------

export function useMemory() {
  return useQuery({
    queryKey: ['agent-memory'],
    queryFn: () => api.get<AgentMemoryItem[]>('/api/v1/agent/memory'),
  })
}

export function useAddMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => api.post('/api/v1/agent/memory', { text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-memory'] }),
  })
}

export function useDeleteMemory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/agent/memory/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-memory'] }),
  })
}
