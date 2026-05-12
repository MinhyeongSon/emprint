import type { InputHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-border bg-panel px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-accent/70 focus:ring-1 focus:ring-accent/40',
        className
      )}
      {...props}
    />
  )
}
