import { cn } from '@/shared/lib/utils'

/**
 * Дайджест приходит текстом (общий генератор с Telegram-ботом), но на дашборде
 * он не должен выглядеть как вывод терминала: моноширинный <pre> с эмодзи.
 * Эмодзи снимает бэкенд (emoji=false), а здесь раскладываем строки по смыслу:
 * первая — заголовок, строки с отступом — вложенные пункты, пустые — разделители.
 */
export function DigestText({ text }: { text: string }) {
  const lines = text.split('\n')
  let headerUsed = false

  return (
    <div className="flex flex-col gap-1">
      {lines.map((raw, i) => {
        if (!raw.trim()) return <span key={i} className="h-2" />

        const nested = raw.startsWith('  ')
        const line = raw.trim()

        if (!headerUsed && !nested) {
          headerUsed = true
          return (
            <p key={i} className="mb-1 text-label font-semibold text-text-placeholder">
              {line}
            </p>
          )
        }

        // «Подпись: 12» → число выделяем, чтобы взгляд цеплялся за цифры
        const m = /^(.*?):\s*(\d+)(.*)$/.exec(line)
        const isSection = !nested && line.endsWith(':')

        return (
          <p
            key={i}
            className={cn(
              'text-body',
              nested ? 'pl-4 text-text-secondary' : 'text-text-primary',
              isSection && 'mt-2 text-label font-semibold text-text-placeholder',
            )}
          >
            {m ? (
              <>
                {m[1]}:{' '}
                <span className="font-semibold tabular-nums text-text-primary">{m[2]}</span>
                {m[3]}
              </>
            ) : (
              line
            )}
          </p>
        )
      })}
    </div>
  )
}
