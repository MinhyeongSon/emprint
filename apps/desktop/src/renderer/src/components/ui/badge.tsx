import type { HTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border border-border/90 bg-panel2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted',
        className
      )}
      {...props}
    />
  )
}
