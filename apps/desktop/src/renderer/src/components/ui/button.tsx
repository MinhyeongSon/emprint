import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@renderer/lib/cn'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'border border-accent/70 bg-accent text-[#160d07] hover:bg-accent/90 disabled:border-accent/30 disabled:bg-accent/40 disabled:text-[#160d07]/60',
  outline:
    'border border-border bg-surface text-ink hover:border-accent/40 hover:bg-panel2/60 disabled:text-muted',
  ghost:
    'border border-transparent text-muted hover:border-border/80 hover:bg-panel2/60 hover:text-ink disabled:text-muted/60'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3.5 py-2 text-[13px] font-medium transition duration-150 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:cursor-not-allowed',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
