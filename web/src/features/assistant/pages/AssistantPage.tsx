import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, EmptyState, Input, PageHeader } from '@/shared/ui'
import { Send, Sparkles } from '@/shared/ui/icons'
import type { MediaEvidence } from '@/shared/api/types'
import { useAgentEnabled, useAsk } from '../api/assistantApi'
import { EvidenceMedia } from '../components/EvidenceMedia'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  evidence?: MediaEvidence[]
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
        setMessages((m) => [...m, { role: 'assistant', text: t('assistant.error') }])
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
            <span className="flex h-14 w-14 items-center justify-center rounded-card bg-brand-10 text-brand">
              <Sparkles size={24} />
            </span>
            <div>
              <p className="text-h3">{t('assistant.empty')}</p>
              <p className="text-body text-text-secondary">{t('assistant.emptyHint')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => submit(t(key))}
                  className="rounded-pill border border-border-default bg-surface px-3 py-1.5 text-label text-text-secondary hover:border-brand hover:text-brand"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? '' : 'w-full'}`}>
              <div
                className={`rounded-card px-4 py-2.5 text-body whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand text-on-brand'
                    : 'border border-border-default bg-surface text-text-primary shadow-s'
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
            <div className="flex gap-1 rounded-card border border-border-default bg-surface px-4 py-3 shadow-s">
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
        className="flex gap-2 border-t border-border-default bg-bg-app pt-3"
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

function Dot({ d }: { d: number }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-pill bg-text-placeholder"
      style={{ animationDelay: `${d}s` }}
    />
  )
}
