import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle, Check, X } from '@/shared/ui/icons'

type ToastKind = 'ok' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  text: string
}

const ToastCtx = createContext<(text: string, kind?: ToastKind) => void>(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((text: string, kind: ToastKind = 'ok') => {
    const id = ++seq
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500)
  }, [])

  const color: Record<ToastKind, string> = {
    ok: 'var(--color-success)',
    error: 'var(--color-danger)',
    info: 'var(--color-brand-500)',
  }

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm shadow-[var(--shadow-pop)]"
          >
            <span style={{ color: color[t.kind] }}>
              {t.kind === 'ok' ? <Check size={16} /> : t.kind === 'error' ? <AlertTriangle size={16} /> : <X size={16} />}
            </span>
            <span className="text-[var(--color-ink)]">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
