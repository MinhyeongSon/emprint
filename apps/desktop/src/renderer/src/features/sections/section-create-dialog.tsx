import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus, X } from 'lucide-react'
import type { AppLocale, MemoirContainerSectionType, MemoirSectionSummary, MemoirSectionType } from '@emprint/shared'
import {
  defaultPropsForMemoirSectionType,
  isMemoirContainerSectionType,
  MEMOIR_CONTAINER_SECTION_TYPES,
  MEMOIR_LEAF_SECTION_TYPES,
  memoirChildLeafTypesForContainer,
  slugifyMemoirSectionId
} from '@emprint/shared'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'

function t(locale: AppLocale, en: string, ko: string) {
  return locale === 'ko' ? ko : en
}

const ROOT_TYPES: MemoirSectionType[] = [...MEMOIR_CONTAINER_SECTION_TYPES, ...MEMOIR_LEAF_SECTION_TYPES]

interface SectionCreateDialogProps {
  open: boolean
  locale: AppLocale
  existingIds: string[]
  containers: MemoirSectionSummary[]
  parentId?: string
  creating: boolean
  onCancel(): void
  onConfirm(input: { id: string; type: MemoirSectionType; parentId?: string }): void
}

export function SectionCreateDialog({
  open,
  locale,
  existingIds,
  containers,
  parentId: initialParentId,
  creating,
  onCancel,
  onConfirm
}: SectionCreateDialogProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const [parentId, setParentId] = useState<string | undefined>(initialParentId)
  const [type, setType] = useState<MemoirSectionType>('Project')
  const [idInput, setIdInput] = useState('new-project')
  const [idError, setIdError] = useState<string | null>(null)

  const containerParents = useMemo(
    () => containers.filter((c) => isMemoirContainerSectionType(c.type)),
    [containers]
  )

  const typeOptions: MemoirSectionType[] = useMemo(() => {
    if (!parentId) return ROOT_TYPES
    const parent = containerParents.find((c) => c.id === parentId)
    if (!parent || !isMemoirContainerSectionType(parent.type)) {
      return [...MEMOIR_LEAF_SECTION_TYPES]
    }
    return [...memoirChildLeafTypesForContainer(parent.type as MemoirContainerSectionType)]
  }, [parentId, containerParents])

  useEffect(() => {
    if (!open) return
    setParentId(initialParentId)
    const defaultType = initialParentId ? (typeOptions[0] ?? 'Project') : 'Project'
    setType(defaultType)
    const defaults = defaultPropsForMemoirSectionType(defaultType)
    const seed =
      (typeof defaults.title === 'string' && defaults.title) ||
      (typeof defaults.name === 'string' && defaults.name) ||
      defaultType
    setIdInput(slugifyMemoirSectionId(String(seed)))
    setIdError(null)
    const id = window.setTimeout(() => cancelRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open, initialParentId, typeOptions])

  useEffect(() => {
    if (!typeOptions.includes(type)) {
      setType(typeOptions[0] ?? 'Project')
    }
  }, [type, typeOptions])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !creating) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, creating, onCancel])

  if (!open) return null

  const submit = () => {
    const id = slugifyMemoirSectionId(idInput)
    if (!id) {
      setIdError(t(locale, 'Enter a section id.', '섹션 ID를 입력하세요.'))
      return
    }
    if (existingIds.includes(id)) {
      setIdError(t(locale, 'This id is already in use.', '이 ID는 이미 사용 중입니다.'))
      return
    }
    setIdError(null)
    onConfirm({ id, type, ...(parentId ? { parentId } : {}) })
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-create-title"
      className="emprint-scrim titlebar-nodrag fixed inset-0 z-[70] flex items-start justify-center px-4 py-16 backdrop-blur-[2px]"
      onClick={() => {
        if (!creating) onCancel()
      }}
    >
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div id="section-create-title" className="text-sm font-semibold text-ink">
                {parentId
                  ? t(locale, 'Add child section', '하위 섹션 추가')
                  : t(locale, 'Add section', '섹션 추가')}
              </div>
              <p className="mt-1 text-xs text-muted">
                {parentId
                  ? t(
                      locale,
                      'Creates a leaf section and attaches it to the selected group.',
                      '리프 섹션을 만들고 선택한 그룹에 연결합니다.'
                    )
                  : t(
                      locale,
                      'Pick a semantic type. Structure stays stable when you change themes.',
                      '시맨틱 유형을 고릅니다. 테마를 바꿔도 구조는 유지됩니다.'
                    )}
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              disabled={creating}
              aria-label={t(locale, 'Close', '닫기')}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted hover:text-ink disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {containerParents.length > 0 ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">
                {t(locale, 'Parent group (optional)', '부모 그룹 (선택)')}
              </span>
              <select
                className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent/70"
                value={parentId ?? ''}
                disabled={Boolean(initialParentId)}
                onChange={(e) => setParentId(e.target.value || undefined)}
              >
                <option value="">{t(locale, 'Root section', '루트 섹션')}</option>
                {containerParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title} ({parent.type})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">{t(locale, 'Type', '유형')}</span>
            <select
              className="w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent/70"
              value={type}
              onChange={(e) => {
                const next = e.target.value as MemoirSectionType
                setType(next)
                const defaults = defaultPropsForMemoirSectionType(next)
                const seed =
                  (typeof defaults.title === 'string' && defaults.title) ||
                  (typeof defaults.name === 'string' && defaults.name) ||
                  next
                setIdInput(slugifyMemoirSectionId(String(seed)))
              }}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">{t(locale, 'Section ID', '섹션 ID')}</span>
            <Input
              value={idInput}
              onChange={(e) => {
                setIdInput(e.target.value)
                setIdError(null)
              }}
              className="font-mono text-[12px]"
              placeholder="my-section"
            />
            {idError ? <p className="text-xs text-red-600">{idError}</p> : null}
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              ref={cancelRef}
              variant="outline"
              type="button"
              className="h-8 px-3 text-xs"
              onClick={onCancel}
              disabled={creating}
            >
              {t(locale, 'Cancel', '취소')}
            </Button>
            <Button type="button" className="h-8 gap-1.5 px-3 text-xs" disabled={creating} onClick={submit}>
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t(locale, 'Create', '만들기')}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
