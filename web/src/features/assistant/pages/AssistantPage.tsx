import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Input, PageHeader } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'
import { Bot, Send, Sparkles } from '@/shared/ui/icons'
import type { MediaEvidence } from '@/shared/api/types'
import { useAgentEnabled, useAsk } from '../api/assistantApi'
import { EvidenceMedia } from '../components/EvidenceMedia'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  evidence?: MediaEvidence[]
  // ответ не пришёл — пузырь красится в тон ошибки, чтобы его не приняли за ответ
  failed?: boolean
}

// Подсказки — только ключи; тексты приходят из i18n (assistant.suggest1..4)
const SUGGESTION_KEYS = [
  'assistant.suggest1',
  'assistant.suggest2',
  'assistant.suggest3',
  'assistant.suggest4',
] as const

export function AssistantPage() {
  const { t } = useTranslation()
  const enabled = useAgentEnabled()
  const ask = useAsk()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  function scrollDown() {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function submit(question: string) {
    const q = question.trim()
    if (!q || ask.isPending) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setInput('')
    scrollDown()
    ask.mutate(q, {
      onSuccess: (res) => {
        setMessages((m) => [...m, { role: 'assistant', text: res.text, evidence: res.evidence }])
        scrollDown()
      },
      onError: () => {
        setMessages((m) => [...m, { role: 'assistant', text: t('assistant.error'), failed: true }])
        scrollDown()
      },
    })
  }

  if (enabled.data && !enabled.data.enabled) {
    return (
      <>
        <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />
        <EmptyState text={`${t('assistant.disabled')} — ${t('assistant.disabledHint')}`} />
      </>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-10 text-center">
            <span className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]">
              <Sparkles size={24} />
            </span>
            <div className="space-y-1">
              <p className="text-h3">{t('assistant.empty')}</p>
              <p className="text-body text-[var(--color-text-secondary)]">{t('assistant.emptyHint')}</p>
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
                {m.text}
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
  )
}

// Аватар ассистента: отличает ответ от вопроса без цвета — только форма и иконка
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
