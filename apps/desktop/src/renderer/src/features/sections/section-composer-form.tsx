import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { pick } from '@renderer/lib/i18n'
import type { AppLocale, MemoirSectionFieldDef, MemoirSectionFile } from '@emprint/shared'
import {
  isMemoirContainerSectionType,
  MEMOIR_SECTION_FIELD_DEFS,
  memoirChildLeafTypesForContainer,
  parseMemoirContactLinksEditor
} from '@emprint/shared'
import { MemoirMarkdownEditor } from '@renderer/components/editor/memoir-markdown-editor'
import { Input } from '@renderer/components/ui/input'
import { Textarea } from '@renderer/components/ui/textarea'
import { cn } from '@renderer/lib/cn'
import { SectionAssetPicker } from './section-asset-picker'
import { SectionContactLinksEditor } from './section-contact-links-editor'


function fieldLabel(locale: AppLocale, field: MemoirSectionFieldDef) {
  return locale === 'ko' ? field.labelKo : field.labelEn
}

function fieldPlaceholder(locale: AppLocale, field: MemoirSectionFieldDef) {
  if (locale === 'ko') return field.placeholderKo
  return field.placeholderEn
}

export interface SectionComposerFormProps {
  locale: AppLocale
  section: MemoirSectionFile
  allSections: MemoirSectionFile[]
  /** When this section is listed under a container. */
  parentId?: string
  onChange(section: MemoirSectionFile): void
}

export function SectionComposerForm({
  locale,
  section,
  allSections,
  parentId,
  onChange
}: SectionComposerFormProps) {
  const [childDragId, setChildDragId] = useState<string | null>(null)
  const [childDropId, setChildDropId] = useState<string | null>(null)
  const fields = MEMOIR_SECTION_FIELD_DEFS[section.type]

  const setProp = (key: string, value: string) => {
    onChange({ ...section, props: { ...section.props, [key]: value } })
  }

  const childOfOther = new Map<string, string>()
  for (const candidate of allSections) {
    for (const childId of candidate.children ?? []) {
      if (!childOfOther.has(childId)) childOfOther.set(childId, candidate.id)
    }
  }

  const containerType = isMemoirContainerSectionType(section.type) ? section.type : null
  const allowedChildTypes = containerType ? memoirChildLeafTypesForContainer(containerType) : []

  const eligibleChildren = containerType
    ? allSections.filter((candidate) => {
        if (candidate.id === section.id) return false
        if (candidate.children?.length) return false
        const parentId = childOfOther.get(candidate.id)
        if (parentId && parentId !== section.id) return false
        return allowedChildTypes.includes(candidate.type as (typeof allowedChildTypes)[number])
      })
    : []

  const childIds = section.children ?? []

  const addChild = (childId: string) => {
    if (childIds.includes(childId)) return
    onChange({ ...section, children: [...childIds, childId] })
  }

  const removeChild = (childId: string) => {
    onChange({ ...section, children: childIds.filter((id) => id !== childId) })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">{pick(locale, 'Section ID', '섹션 ID')}</span>
          <Input value={section.id} readOnly className="bg-panel2 font-mono text-[12px]" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">{pick(locale, 'Type', '유형')}</span>
          <Input value={section.type} readOnly className="bg-panel2" />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border accent-accent"
          checked={section.published}
          onChange={(e) => onChange({ ...section, published: e.target.checked })}
        />
        <span className="text-sm text-ink">{pick(locale, 'Published on site', '사이트에 공개')}</span>
      </label>

      {parentId && !isMemoirContainerSectionType(section.type) ? (
        <label className="block max-w-[8rem] space-y-1.5">
          <span className="text-xs font-medium text-muted">
            {pick(locale, 'Order in group', '그룹 내 순서')}
          </span>
          <Input
            type="number"
            min={0}
            value={section.order}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10)
              onChange({ ...section, order: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 })
            }}
          />
          <p className="text-[10px] text-muted">
            {pick(locale, '0 = first in the parent group.', '0 = 부모 그룹에서 첫 번째.')}
          </p>
        </label>
      ) : null}

      <div className="space-y-4 border-t border-border pt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {pick(locale, 'Content', '콘텐츠')}
        </h2>
        {fields.map((field) => {
          if (field.kind === 'asset') {
            return (
              <SectionAssetPicker
                key={field.key}
                locale={locale}
                label={fieldLabel(locale, field)}
                value={String(section.props[field.key] ?? '')}
                onChange={(path) => setProp(field.key, path)}
              />
            )
          }
          if (field.kind === 'url') {
            return (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-xs font-medium text-ink">{fieldLabel(locale, field)}</span>
                <Input
                  type="url"
                  value={String(section.props[field.key] ?? '')}
                  placeholder={fieldPlaceholder(locale, field)}
                  onChange={(e) => setProp(field.key, e.target.value)}
                />
              </label>
            )
          }
          return (
            <label key={field.key} className="block space-y-1.5">
              <span className="text-xs font-medium text-ink">
                {fieldLabel(locale, field)}
                {field.required ? <span className="text-dangerInk"> *</span> : null}
              </span>
              {field.kind === 'markdown' ? (
                <MemoirMarkdownEditor
                  locale={locale}
                  value={String(section.props[field.key] ?? '')}
                  {...(fieldPlaceholder(locale, field)
                    ? { placeholder: fieldPlaceholder(locale, field) }
                    : {})}
                  onChange={(next) => setProp(field.key, next)}
                />
              ) : field.kind === 'textarea' ? (
                <Textarea
                  rows={5}
                  value={String(section.props[field.key] ?? '')}
                  placeholder={fieldPlaceholder(locale, field)}
                  onChange={(e) => setProp(field.key, e.target.value)}
                />
              ) : (
                <Input
                  value={String(section.props[field.key] ?? '')}
                  placeholder={fieldPlaceholder(locale, field)}
                  onChange={(e) => setProp(field.key, e.target.value)}
                />
              )}
            </label>
          )
        })}

        {section.type === 'Contact' ? (
          <SectionContactLinksEditor
            locale={locale}
            links={parseMemoirContactLinksEditor(section.props)}
            onChange={(links) =>
              onChange({
                ...section,
                props: { ...section.props, links }
              })
            }
          />
        ) : null}
      </div>

      {isMemoirContainerSectionType(section.type) ? (
        <div className="space-y-3 border-t border-border pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {pick(locale, 'Child sections', '하위 섹션')}
          </h2>
          <p className="text-xs text-muted">
            {pick(
              locale,
              'Drag to reorder children. In the section list, hold Alt (⌥) while dropping onto this group to add a matching section.',
              '드래그로 하위 순서를 바꿉니다. 섹션 목록에서 Alt(⌥)를 누른 채 이 그룹에 드롭하면 맞는 유형의 섹션을 추가할 수 있습니다.'
            )}
          </p>
          {childIds.length === 0 ? (
            <p className="text-sm text-muted">{pick(locale, 'No children yet.', '하위 섹션이 없습니다.')}</p>
          ) : (
            <ul className="space-y-2">
              {childIds.map((childId, index) => {
                const child = allSections.find((s) => s.id === childId)
                const childTitle =
                  (typeof child?.props.title === 'string' && child.props.title) ||
                  (typeof child?.props.name === 'string' && child.props.name) ||
                  childId
                const childPeriod =
                  typeof child?.props.period === 'string' && child.props.period.trim()
                    ? child.props.period.trim()
                    : null
                const isDropTarget = childDropId === childId && childDragId !== childId
                const isDragging = childDragId === childId
                return (
                  <li
                    key={childId}
                    draggable
                    onDragStart={(e) => {
                      setChildDragId(childId)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', childId)
                    }}
                    onDragEnd={() => {
                      setChildDragId(null)
                      setChildDropId(null)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (childDragId && childDragId !== childId) setChildDropId(childId)
                    }}
                    onDragLeave={() => {
                      if (childDropId === childId) setChildDropId(null)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const source = childDragId ?? e.dataTransfer.getData('text/plain')
                      setChildDragId(null)
                      setChildDropId(null)
                      if (!source || source === childId) return
                      const from = childIds.indexOf(source)
                      const to = childIds.indexOf(childId)
                      if (from < 0 || to < 0) return
                      const reordered = [...childIds]
                      const [item] = reordered.splice(from, 1)
                      if (!item) return
                      reordered.splice(to, 0, item)
                      onChange({ ...section, children: reordered })
                    }}
                    className={cn(
                      'titlebar-nodrag flex items-center gap-2 rounded-md border border-border bg-panel px-2 py-1.5',
                      isDropTarget && 'border-accent ring-2 ring-dashed ring-accent/40',
                      isDragging && 'opacity-50'
                    )}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-ink">{childTitle}</div>
                      <div className="font-mono text-[10px] text-muted">
                        {child?.type ?? '?'} · {childId}
                        {childPeriod ? ` · ${childPeriod}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-dangerInk hover:bg-dangerBg/50"
                      onClick={() => removeChild(childId)}
                    >
                      {pick(locale, 'Remove', '제거')}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {eligibleChildren.filter((c) => !childIds.includes(c.id)).length > 0 ? (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">{pick(locale, 'Add child', '하위 섹션 추가')}</span>
              <select
                className={cn(
                  'w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-accent/70'
                )}
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value
                  if (id) addChild(id)
                  e.target.value = ''
                }}
              >
                <option value="">{pick(locale, 'Select a section…', '섹션 선택…')}</option>
                {eligibleChildren
                  .filter((c) => !childIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {String(c.props.title || c.props.name || c.id)} ({c.type})
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <p className="text-xs text-muted">
              {pick(
                locale,
                'Create a matching leaf section first (e.g. Project for a project group).',
                '먼저 맞는 리프 섹션을 만드세요 (예: 프로젝트 그룹에는 Project).'
              )}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
