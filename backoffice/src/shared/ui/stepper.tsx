import { Check } from '@/shared/ui/icons'
import { cn } from '@/shared/lib/utils'

/**
 * Small numbered-step indicator — built for the year-end wizard but generic
 * enough for any linear wizard. Purely presentational by default; pass
 * `onStepClick` to let completed steps be clicked to go back. Steps AHEAD of
 * the current one stay locked unless `maxClickableIndex` says their data is
 * already saved (e.g. a resumed wizard lets you jump around freely up to the
 * furthest step you have reached).
 */
export interface StepperStep {
  key: string
  label: string
  /** Secondary line under the label — vertical orientation only. */
  description?: string
}

export interface StepperProps {
  steps: StepperStep[]
  /** 0-based index of the current step. */
  currentIndex: number
  /**
   * 0-based index of the LAST step visually covered by the current logical
   * step (inclusive). Lets a single screen present as several adjacent
   * stepper entries at once — e.g. when a design's step breakdown is finer
   * than the app's actual screens, every index in
   * `[currentIndex, currentIndexEnd]` renders as "current" together.
   * Defaults to `currentIndex` (one entry per screen, the common case).
   */
  currentIndexEnd?: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
  onStepClick?: (index: number) => void
  /**
   * 0-based index of the furthest step reachable by clicking (inclusive).
   * Defaults to `currentIndex - 1` — i.e. only completed steps are clickable.
   */
  maxClickableIndex?: number
}

type StepState = 'done' | 'current' | 'upcoming'

export function Stepper({
  steps,
  currentIndex,
  currentIndexEnd,
  orientation = 'horizontal',
  className,
  onStepClick,
  maxClickableIndex,
}: StepperProps) {
  const end = currentIndexEnd ?? currentIndex
  const stateOf = (index: number): StepState =>
    index < currentIndex ? 'done' : index <= end ? 'current' : 'upcoming'
  const clickLimit = maxClickableIndex ?? currentIndex - 1
  const isClickable = (index: number, state: StepState) =>
    Boolean(onStepClick) && state !== 'current' && index <= clickLimit

  if (orientation === 'vertical') {
    return (
      <ol className={cn('flex flex-col', className)} aria-label="steps">
        {steps.map((step, index) => {
          const state = stateOf(index)
          const clickable = isClickable(index, state)
          const isLast = index === steps.length - 1
          return (
            <li key={step.key} className="flex gap-3">
              <div className="flex flex-none flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    'flex size-[30px] shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    state === 'done' &&
                      'bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)]',
                    state === 'current' && 'bg-[var(--color-brand-500)] text-white shadow-[var(--shadow-brand)]',
                    state === 'upcoming' && 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
                  )}
                >
                  {state === 'done' ? <Check size={14} aria-hidden /> : index + 1}
                </span>
                {!isLast && (
                  <span
                    aria-hidden
                    className={cn(
                      'my-1 w-0.5 flex-1 rounded-full',
                      state === 'done' ? 'bg-[var(--color-status-success-border)]' : 'bg-[var(--color-border-soft)]',
                    )}
                  />
                )}
              </div>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(index)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex flex-col items-start gap-0.5 pb-[18px] text-left',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <span
                  className={cn(
                    'text-[13.5px] leading-snug',
                    state === 'current' && 'font-extrabold text-[var(--color-text-primary)]',
                    state === 'done' && 'font-bold text-[var(--color-text-secondary)]',
                    state === 'upcoming' && 'font-bold text-[var(--color-text-muted)]',
                  )}
                >
                  {index + 1}. {step.label}
                </span>
                {step.description && (
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      state === 'done'
                        ? 'text-[var(--color-status-success-text)]'
                        : 'text-[var(--color-text-muted)]',
                    )}
                  >
                    {step.description}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    )
  }

  return (
    <ol className={cn('flex w-full items-center', className)} aria-label="steps">
      {steps.map((step, index) => {
        const state = stateOf(index)
        const clickable = isClickable(index, state)
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(index)}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-full',
                clickable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  state === 'done' && 'bg-[var(--color-brand-500)] text-white',
                  state === 'current' &&
                    'border-2 border-[var(--color-brand-500)] text-[var(--color-brand-text)]',
                  state === 'upcoming' && 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
                )}
              >
                {state === 'done' ? <Check size={14} aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  'hidden text-sm font-semibold whitespace-nowrap sm:inline',
                  state === 'upcoming' ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]',
                )}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full',
                  state === 'done' ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--color-border-soft)]',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
