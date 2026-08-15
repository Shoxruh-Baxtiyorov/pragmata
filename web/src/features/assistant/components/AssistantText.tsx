import type { ReactNode } from 'react'

// Агент отвечает лёгким Markdown (жирный, курсив, таблицы). Раньше пузырь
// показывал сырой текст с «|» и «**» — рендерим нужное подмножество без
// внешних зависимостей и без dangerouslySetInnerHTML (строим React-узлы).

function inline(s: string, key: string): ReactNode[] {
  // **bold** и *italic* — простое, непересекающееся разбиение
  return s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return (
        <em key={`${key}-${i}`} className="text-[var(--color-text-secondary)]">
          {part.slice(1, -1)}
        </em>
      )
    return part
  })
}

const cells = (row: string) =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

const isSep = (l?: string) => !!l && /-/.test(l) && /^[\s:|-]+$/.test(l.trim())

export function AssistantText({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    // таблица: строка с «|», следующая — разделитель «|---|»
    if (lines[i].includes('|') && isSep(lines[i + 1])) {
      const head = cells(lines[i])
      const rows: string[][] = []
      let j = i + 2
      while (j < lines.length && lines[j].includes('|')) rows.push(cells(lines[j++]))
      out.push(
        <div key={`t${i}`} className="my-1 overflow-x-auto">
          <table className="w-full border-collapse text-caption">
            <thead>
              <tr>
                {head.map((h, k) => (
                  <th
                    key={k}
                    className="border border-[var(--color-border-soft)] bg-[var(--color-bg-muted)] px-2.5 py-1.5 text-left font-semibold"
                  >
                    {inline(h, `h${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} className="border border-[var(--color-border-soft)] px-2.5 py-1.5">
                      {inline(c, `c${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j
    } else if (lines[i].trim() === '') {
      out.push(<div key={`s${i}`} className="h-1.5" />)
      i++
    } else {
      out.push(<p key={`p${i}`}>{inline(lines[i], `p${i}`)}</p>)
      i++
    }
  }
  return <div className="space-y-0.5">{out}</div>
}
