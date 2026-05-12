import { useEffect, useState, type ReactNode } from 'react'
import { Maximize2, Minus, Shrink, X } from 'lucide-react'
import { cn } from '@renderer/lib/cn'

export type TitlebarChrome = 'mac' | 'windows'

export function Titlebar({
  center,
  right,
  chrome = 'windows'
}: {
  center?: ReactNode
  right?: ReactNode
  /** macOS: native traffic lights on the left; Windows: custom controls on the right */
  chrome?: TitlebarChrome
}) {
  const [isMaximized, setIsMaximized] = useState(false)
  const windowApi = typeof window !== 'undefined' ? (window.emprint as any)?.window : null

  useEffect(() => {
    if (chrome === 'mac') return
    let alive = true
    if (windowApi?.isMaximized) {
      void windowApi.isMaximized().then((value: boolean) => {
        if (!alive) return
        setIsMaximized(Boolean(value))
      })
    }
    return () => {
      alive = false
    }
  }, [windowApi, chrome])

  if (chrome === 'mac') {
    return (
      <header
        className={cn(
          'sticky top-0 z-40 relative flex h-10 items-center gap-2 border-b border-border bg-panel pr-2',
          // Reserve space for native traffic lights (hiddenInset)
          'pl-[78px]'
        )}
      >
        <div className="min-w-0 flex-1 [-webkit-app-region:drag]" />

        {center ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
            <div className="pointer-events-auto [-webkit-app-region:no-drag]">{center}</div>
          </div>
        ) : null}

        <div className="relative z-10 flex min-w-0 shrink-0 items-center gap-2 [-webkit-app-region:no-drag]">
          {right}
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 relative flex h-10 items-center justify-between gap-2 border-b border-border bg-panel px-2 [-webkit-app-region:drag]">
      <div className="min-w-0 flex-1" />

      {center ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
          <div className="pointer-events-auto [-webkit-app-region:no-drag]">{center}</div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
        {right}
        <div className="flex items-center gap-1">
          <WindowButton
            ariaLabel="Minimize"
            onClick={() => windowApi?.minimize?.()}
            disabled={!windowApi?.minimize}
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
          </WindowButton>
          <WindowButton
            ariaLabel={isMaximized ? 'Restore' : 'Maximize'}
            onClick={() => {
              if (!windowApi?.toggleMaximize) return
              void windowApi.toggleMaximize().then((value: boolean) => setIsMaximized(Boolean(value)))
            }}
            disabled={!windowApi?.toggleMaximize}
          >
            {isMaximized ? (
              <Shrink className="h-3.5 w-3.5" strokeWidth={2.25} />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.25} />
            )}
          </WindowButton>
          <WindowButton
            ariaLabel="Close"
            onClick={() => windowApi?.close?.()}
            variant="danger"
            disabled={!windowApi?.close}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </WindowButton>
        </div>
      </div>
    </header>
  )
}

function WindowButton({
  ariaLabel,
  children,
  onClick,
  disabled,
  variant
}: {
  ariaLabel: string
  children: ReactNode
  onClick(): void
  disabled?: boolean
  variant?: 'danger'
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-7 w-9 items-center justify-center rounded-md border border-border bg-panel2 text-[12px] text-muted transition hover:border-accent/35 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'danger' ? 'hover:border-danger/60 hover:text-dangerInk' : ''
      )}
    >
      {children}
    </button>
  )
}
