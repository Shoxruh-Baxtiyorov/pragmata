import type { HTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

// Карточка: radius 16 (component/radius/card), тень M на фрейме (не на внутренних слоях)
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card bg-surface p-4 shadow-m', className)}
      {...props}
    />
  )
}
