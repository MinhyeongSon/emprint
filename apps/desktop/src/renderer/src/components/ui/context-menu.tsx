import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@renderer/lib/cn'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  onSelect: () => void
}

interface ContextMenuProps {
  /** Page-space coordinates of the trigger point (typically the mouse event clientX/Y). */
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

const MENU_OFFSET = 2

/** Lightweight, keyboard-accessible context menu. Positioned in a portal and clamped to the viewport. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState({ x, y })
  const enabledIndices = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)
  const [focusIndex, setFocusIndex] = useState<number>(enabledIndices[0] ?? -1)

  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width - 4
    const maxY = window.innerHeight - rect.height - 4
    setPosition({
      x: Math.max(4, Math.min(x + MENU_OFFSET, maxX)),
      y: Math.max(4, Math.min(y + MENU_OFFSET, maxY))
    })
  }, [x, y, items.length])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current) return
      if (event.target instanceof Node && menuRef.current.contains(event.target)) return
      onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        if (enabledIndices.length === 0) return
        const currentPos = enabledIndices.indexOf(focusIndex)
        const delta = event.key === 'ArrowDown' ? 1 : -1
        const nextPos = (currentPos + delta + enabledIndices.length) % enabledIndices.length
        setFocusIndex(enabledIndices[nextPos]!)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const target = items[focusIndex]
        if (target && !target.disabled) {
          target.onSelect()
          onClose()
        }
      }
    }
    function onResize() {
      onClose()
    }

    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('contextmenu', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onClose)

    return () => {
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('contextmenu', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('blur', onClose)
    }
  }, [enabledIndices, focusIndex, items, onClose])

  const node = (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-panel/95 py-1 text-[12px] text-ink shadow-lg backdrop-blur-sm"
      style={{ top: position.y, left: position.x }}
    >
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onMouseEnter={() => !item.disabled && setFocusIndex(index)}
          onClick={() => {
            if (item.disabled) return
            item.onSelect()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors',
            'disabled:cursor-not-allowed disabled:text-muted/60',
            !item.disabled && focusIndex === index && 'bg-panel2/80 text-ink',
            !item.disabled && focusIndex !== index && 'text-ink/90 hover:bg-panel2/60'
          )}
        >
          {item.icon ? <span className="flex h-3.5 w-3.5 items-center justify-center text-muted">{item.icon}</span> : <span className="w-3.5" />}
          <span className="flex-1 truncate">{item.label}</span>
          {item.shortcut ? (
            <span className="ml-2 shrink-0 font-mono text-[10px] text-muted">{item.shortcut}</span>
          ) : null}
        </button>
      ))}
    </div>
  )

  return createPortal(node, document.body)
}
