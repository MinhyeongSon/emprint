import type { ReactNode } from 'react'
import { cn } from '@renderer/lib/cn'

export function Tooltip({
  label,
  side = 'top',
  children,
  className
}: {
  label: string
  side?: 'top' | 'bottom'
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className="group inline-flex">{children}</span>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-panel px-2 py-1 text-[11px] text-ink shadow-panel group-hover:inline-flex',
          side === 'top' ? '-top-2 -translate-y-full' : '-bottom-2 translate-y-full'
        )}
      >
        {label}
      </span>
    </span>
  )
}

