import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Languages } from '@/shared/ui/icons'
import { cn } from '@/shared/lib/utils'
import { setLang } from '@/shared/i18n'

type Lang = 'uz' | 'ru' | 'en'

// Родные названия: язык выбирают глазами, а не переводом на текущий язык
const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
]

export function LangSelect() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const current = LANGS.find((l) => l.code === i18n.language) ?? LANGS[0]

  // клик мимо и Esc закрывают — иначе меню «залипает»
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (code: Lang) => {
    setLang(code) // общий хелпер: и переключает, и запоминает выбор
    setOpen(false)
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-button px-2.5 text-label font-semibold',
          'text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary',
          open && 'bg-bg-secondary text-text-primary',
        )}
      >
        <Languages size={17} />
        <span className="hidden sm:inline">{current.short}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute right-0 top-full z-50 mt-1.5 min-w-44 overflow-hidden rounded-card',
            'border border-border-default bg-surface py-1 shadow-m',
          )}
        >
          {LANGS.map((l) => {
            const active = l.code === current.code
            return (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(l.code)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-body transition-colors',
                    active
                      ? 'font-semibold text-brand'
                      : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary',
                  )}
                >
                  <span className="w-7 text-caption font-bold text-text-placeholder">
                    {l.short}
                  </span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check size={16} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
