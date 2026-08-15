import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Input,
  Modal,
  PageHeader,
} from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { apiErrorMessage } from '@/shared/lib/apiError'
import { Bot, MessageCircle, Plus, Send, Sparkles, Trash2, X } from '@/shared/ui/icons'
import type { AgentConversation, MediaEvidence } from '@/shared/api/types'
import {
  useAddMemory,
  useAgentEnabled,
  useAsk,
  useConversationMessages,
  useConversations,
  useDeleteConversation,
  useDeleteMemory,
  useMemory,
} from '../api/assistantApi'
import { EvidenceMedia } from '../components/EvidenceMedia'
import { AssistantText } from '../components/AssistantText'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  evidence?: MediaEvidence[]
  failed?: boolean
}

const SUGGESTION_KEYS = [
  'assistant.suggest1',
  'assistant.suggest2',
  'assistant.suggest3',
  'assistant.suggest4',
] as const

export function AssistantPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const enabled = useAgentEnabled()
  const ask = useAsk()
  const conversations = useConversations()
  const delConv = useDeleteConversation()

  const [convId, setConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState<AgentConversation | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // при выборе сохранённого диалога — подтягиваем его историю с сервера
  const stored = useConversationMessages(convId)
  useEffect(() => {
    if (stored.data) {
      setMessages(
        stored.data.map((m) => ({ role: m.role, text: m.content, evidence: m.evidence })),
      )
      scrollDown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored.data])

  function scrollDown() {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function newChat() {
    setConvId(null)
    setMessages([])
    setInput('')
  }

  function submit(question: string) {
    const q = question.trim()
    if (!q || ask.isPending) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    scrollDown()
    ask.mutate(
      { question: q, conversationId: convId },
      {
        onSuccess: (res) => {
          setMessages((m) => [...m, { role: 'assistant', text: res.text, evidence: res.evidence }])
          scrollDown()
          if (res.conversation_id && res.conversation_id !== convId) {
            setConvId(res.conversation_id)
          } else if (convId) {
            // существующий диалог — освежим серверную копию (для памяти/доков)
            void qc.invalidateQueries({ queryKey: ['agent-conversation', convId] })
          }
        },
        onError: () => {
          setMessages((m) => [...m, { role: 'assistant', text: t('assistant.error'), failed: true }])
          scrollDown()
        },
      },
    )
  }

  if (enabled.data && !enabled.data.enabled) {
    return (
      <>
        <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />
        <EmptyState text={`${t('assistant.disabled')} — ${t('assistant.disabledHint')}`} />
      </>
    )
  }

  const convList = conversations.data ?? []

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <PageHeader
        title={t('assistant.title')}
        subtitle={t('assistant.subtitle')}
        actions={
          <Button variant="ghost" onClick={() => setMemoryOpen(true)}>
            <Sparkles size={16} /> {t('assistant.memory')}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-4">
        {/* ── сайдбар сохранённых диалогов ─────────────────────────────── */}
        <aside className="hidden w-60 shrink-0 flex-col md:flex">
          <Button className="mb-2 w-full justify-start" onClick={newChat}>
            <Plus size={16} /> {t('assistant.newChat')}
          </Button>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {convList.length === 0 ? (
              <p className="px-2 py-2 text-caption text-[var(--color-text-subtle)]">
                {t('assistant.noChats')}
              </p>
            ) : (
              convList.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-[var(--radius-md)] pr-1 transition',
                    convId === c.id
                      ? 'bg-[var(--color-brand-500)]/12'
                      : 'hover:bg-[var(--color-bg-muted)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setConvId(c.id)}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 py-2 pl-2 text-left text-caption outline-none',
                      convId === c.id
                        ? 'font-medium text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)]',
                    )}
                  >
                    <MessageCircle size={16} className="shrink-0 text-[var(--color-text-subtle)]" />
                    <span className="truncate" title={c.title}>
                      {c.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(c)}
                    className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] opacity-0 transition hover:text-[var(--color-error-500)] group-hover:opacity-100"
                    title={t('assistant.deleteChat')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── область чата ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
                  <Sparkles size={24} />
                </span>
                <div className="space-y-1">
                  <p className="text-h3">{t('assistant.empty')}</p>
                  <p className="text-body text-[var(--color-text-secondary)]">
                    {t('assistant.emptyHint')}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTION_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => submit(t(key))}
                      className="rounded-pill border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-3 py-1.5 text-label text-[var(--color-text-secondary)] shadow-[var(--shadow-xs)] outline-none transition hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-text)] focus-visible:border-[var(--color-brand-500)] focus-visible:ring-3 focus-visible:ring-[var(--color-brand-ring)]"
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'assistant' && <Avatar />}
                <div className={cn('min-w-0', m.role === 'user' ? 'max-w-[85%]' : 'flex-1')}>
                  <div
                    className={cn(
                      'rounded-[var(--radius-lg)] px-4 py-2.5 text-body whitespace-pre-wrap',
                      m.role === 'user' &&
                        'bg-[var(--color-brand-500)] text-[var(--color-text-on-brand)] shadow-[var(--shadow-xs)]',
                      m.role === 'assistant' &&
                        !m.failed &&
                        'border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]',
                      m.failed &&
                        'border border-[var(--color-status-error-border)] bg-[var(--color-status-error-bg)] text-[var(--color-status-error-text)]',
                    )}
                  >
                    {m.role === 'assistant' && !m.failed ? <AssistantText text={m.text} /> : m.text}
                  </div>
                  {m.evidence && m.evidence.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {m.evidence.map((e, j) => (
                        <EvidenceMedia key={j} item={e} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {ask.isPending && (
              <div className="flex justify-start gap-2.5">
                <Avatar />
                <div className="flex items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
                  <Dot d={0} />
                  <Dot d={0.15} />
                  <Dot d={0.3} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              submit(input)
            }}
            className="flex gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-bg-app)] pt-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('assistant.placeholder')}
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="icon" disabled={ask.isPending || !input.trim()}>
              <Send size={20} />
            </Button>
          </form>
        </div>
      </div>

      {memoryOpen && <MemoryPanel onClose={() => setMemoryOpen(false)} />}

      <ConfirmDialog
        open={confirmDel !== null}
        title={t('assistant.deleteChat')}
        description={t('assistant.confirmDeleteChat')}
        confirmLabel={t('manage.delete')}
        busy={delConv.isPending}
        onConfirm={() => {
          if (confirmDel) {
            delConv.mutate(confirmDel.id)
            if (convId === confirmDel.id) newChat()
          }
          setConfirmDel(null)
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

// ── панель долговременной памяти ────────────────────────────────────────────

function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const memory = useMemory()
  const add = useAddMemory()
  const del = useDeleteMemory()
  const [text, setText] = useState('')

  const facts = memory.data ?? []

  const submit = () => {
    const v = text.trim()
    if (!v) return
    add.mutate(v, { onSuccess: () => setText('') })
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-1 flex items-center gap-2 pr-8 text-h2 font-semibold text-[var(--color-text-primary)]">
        <Sparkles size={20} className="text-[var(--color-brand-text)]" /> {t('assistant.memory')}
      </h2>
      <p className="mb-4 text-caption text-[var(--color-text-secondary)]">
        {t('assistant.memoryHint')}
      </p>

      {facts.length === 0 ? (
        <p className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-3 text-caption text-[var(--color-text-subtle)]">
          {t('assistant.memoryEmpty')}
        </p>
      ) : (
        <ul className="mb-4 max-h-72 space-y-1.5 overflow-y-auto">
          {facts.map((f) => (
            <li
              key={f.id}
              className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-surface)] px-3 py-2"
            >
              <span className="min-w-0 flex-1 break-words text-body text-[var(--color-text-primary)]">
                {f.text}
              </span>
              <button
                type="button"
                onClick={() => del.mutate(f.id)}
                className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-subtle)] transition hover:text-[var(--color-error-500)]"
                title={t('manage.delete')}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          className="flex-1"
          placeholder={t('assistant.memoryAdd')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <Button onClick={submit} loading={add.isPending} disabled={!text.trim()}>
          <Plus size={16} /> {t('people.add')}
        </Button>
      </div>
      {add.isError && <ErrorNote className="mt-2">{apiErrorMessage(add.error, t)}</ErrorNote>}
    </Modal>
  )
}

function Avatar() {
  return (
    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
      <Bot size={16} />
    </span>
  )
}

function Dot({ d }: { d: number }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-pill bg-[var(--color-text-subtle)]"
      style={{ animationDelay: `${d}s` }}
    />
  )
}
