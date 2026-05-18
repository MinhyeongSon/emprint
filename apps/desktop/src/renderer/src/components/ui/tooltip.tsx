import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

export function Tooltip({
  label,
  side = 'top',
  multiline = false,
  children,
  className
}: {
  label: ReactNode
  side?: 'top' | 'bottom'
  /** Allow wrapped tooltip copy (e.g. multi-sentence help). */
  multiline?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-[200] rounded-md border border-border bg-panel px-2.5 py-1.5 text-[11px] leading-relaxed text-ink shadow-panel',
          'invisible opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100',
          multiline ? 'max-w-[min(18rem,calc(100vw-2rem))] whitespace-normal text-left' : 'whitespace-nowrap',
          side === 'top' ? 'bottom-full mb-1.5 -translate-x-1/2' : 'top-full mt-1.5 -translate-x-1/2'
        )}
      >
        {label}
      </span>
    </span>
  )
}
