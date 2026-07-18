import { useEffect, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

// Модалка: radius 24 (component/radius/modal), тень L, закрытие по Escape и оверлею
export function Modal({
  onClose,
  children,
  className,
}: {
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn('max-h-[85vh] w-full max-w-lg overflow-auto rounded-modal bg-surface p-6 shadow-l', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
