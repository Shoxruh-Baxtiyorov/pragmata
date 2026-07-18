import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, PageHeader } from '@/shared/ui'
import { Send, Sparkles } from '@/shared/ui/icons'
import type { MediaEvidence } from '@/shared/api/types'
import { useAgentEnabled, useAsk } from '../api/assistantApi'
import { EvidenceMedia } from '../components/EvidenceMedia'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  evidence?: MediaEvidence[]
}

const SUGGESTIONS = [
  'Сколько тревог было за сутки?',
  'Кто заходил в запретную зону?',
  'найди человека в белой рубашке',
  'Bugun nechta odam kirdi?',
]

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
        setMessages((m) => [...m, { role: 'assistant', text: t('assistant.error') }])
        scrollDown()
      },
    })
  }

  if (enabled.data && !enabled.data.enabled) {
    return (
      <>
        <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />
        <EmptyState title={t('assistant.disabled')} hint={t('assistant.disabledHint')} />
      </>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col">
      <PageHeader title={t('assistant.title')} subtitle={t('assistant.subtitle')} />

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 pt-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
              <Sparkles size={26} />
            </span>
            <div>
              <p className="font-heading text-lg font-bold">{t('assistant.empty')}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{t('assistant.emptyHint')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-[var(--color-border-strong)] bg-white px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-brand-300)] hover:text-[var(--color-brand-600)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-[var(--color-brand-500)] text-white'
                    : 'border border-[var(--color-border-soft)] bg-white text-[var(--color-text-primary)] shadow-[var(--shadow-xs)]'
                }`}
              >
                {m.text}
              </div>
              {m.evidence && m.evidence.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {m.evidence.map((e, j) => (
                    <EvidenceMedia key={j} item={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {ask.isPending && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-white px-4 py-3 shadow-[var(--shadow-xs)]">
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('assistant.placeholder')}
          className="h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-white px-4 text-sm focus:border-[var(--color-brand-500)] focus:outline-none"
        />
        <Button type="submit" disabled={ask.isPending || !input.trim()}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  )
}

function Dot({ d }: { d: number }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-subtle)]"
      style={{ animationDelay: `${d}s` }}
    />
  )
}
