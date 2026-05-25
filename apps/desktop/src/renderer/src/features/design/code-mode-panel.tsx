import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type EditorProps } from '@monaco-editor/react'
import { monaco } from './monaco-workers'
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderPlus,
  Info,
  Loader2,
  Package,
  Pencil,
  RefreshCw,
  Save,
  Trash2
} from 'lucide-react'
import {
  canCreateUnderDesignParent,
  isWorkspaceContentConfigPath,
  isWorkspaceDesignTreeRootPath,
  type AppLocale,
  type WorkspaceSrcTreeNode
} from '@emprint/shared'
import { normalizeWorkspaceDesignPath, WORKSPACE_CONTENT_CONFIG_PATH } from './design-workspace-paths'
import {
  configureMonacoForWorkspace,
  resetMonacoWorkspaceConfig,
  workspaceFileToMonacoUri
} from './design-monaco-typescript'
import { Button } from '@renderer/components/ui/button'
import { Tooltip } from '@renderer/components/ui/tooltip'
import { useAppStore } from '@renderer/state/app-store'
import { pick } from '@renderer/lib/i18n'
import { ContextMenu, type ContextMenuItem } from '@renderer/components/ui/context-menu'


function languageForPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'ts' || ext === 'tsx') return 'typescript'
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'jsx') return 'javascript'
  if (ext === 'json') return 'json'
  if (ext === 'css') return 'css'
  if (ext === 'html' || ext === 'astro') return 'html'
  if (ext === 'md') return 'markdown'
  return 'plaintext'
}

function monacoTheme(): 'vs-dark' | 'light' {
  const scheme = document.documentElement.getAttribute('data-color-scheme')
  return scheme === 'light' ? 'light' : 'vs-dark'
}

type PendingCreate = {
  parentPath: string
  kind: 'file' | 'directory'
}

type PendingRename = {
  path: string
  kind: 'file' | 'directory'
  name: string
}

interface SrcTreeNodeProps {
  node: WorkspaceSrcTreeNode
  depth: number
  selectedPath: string | null
  expanded: Set<string>
  pendingCreate: PendingCreate | null
  pendingRename: PendingRename | null
  onToggleExpand: (path: string, open: boolean) => void
  onPickFile: (path: string) => void
  onContextMenu: (event: React.MouseEvent, node: WorkspaceSrcTreeNode) => void
  onSubmitCreate: (name: string) => Promise<void>
  onCancelCreate: () => void
  onSubmitRename: (name: string) => Promise<void>
  onCancelRename: () => void
}

function SrcTreeNode({
  node,
  depth,
  selectedPath,
  expanded,
  pendingCreate,
  pendingRename,
  onToggleExpand,
  onPickFile,
  onContextMenu,
  onSubmitCreate,
  onCancelCreate,
  onSubmitRename,
  onCancelRename
}: SrcTreeNodeProps) {
  const isRenaming = pendingRename?.path === node.path

  if (node.kind === 'file') {
    if (isRenaming) {
      return (
        <InlineNameInput
          depth={depth}
          kind="file"
          initialValue={pendingRename.name}
          onSubmit={onSubmitRename}
          onCancel={onCancelRename}
        />
      )
    }
    const active = selectedPath === node.path
    return (
      <button
        type="button"
        className={`flex w-full rounded px-2 py-1 text-left font-mono text-[11px] ${
          active ? 'bg-accent/20 text-ink' : 'text-muted hover:bg-panel2/80 hover:text-ink'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onPickFile(node.path)}
        onContextMenu={(event) => onContextMenu(event, node)}
      >
        {node.name}
      </button>
    )
  }

  const open = expanded.has(node.path)
  const showCreateRow = pendingCreate?.parentPath === node.path

  return (
    <div className="select-none">
      {isRenaming ? (
        <InlineNameInput
          depth={depth}
          kind="directory"
          initialValue={pendingRename.name}
          onSubmit={onSubmitRename}
          onCancel={onCancelRename}
        />
      ) : (
        <button
          type="button"
          className="flex w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-xs font-medium text-ink hover:bg-panel2/60"
          style={{ paddingLeft: 4 + depth * 10 }}
          onClick={() => onToggleExpand(node.path, !open)}
          onContextMenu={(event) => onContextMenu(event, node)}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
          )}
          <span className="font-mono">{node.name}</span>
        </button>
      )}
      {open ? (
        <div>
          {showCreateRow ? (
            <InlineNameInput
              depth={depth + 1}
              kind={pendingCreate.kind}
              placeholder={pendingCreate.kind === 'directory' ? 'new-folder' : 'new-file.ts'}
              onSubmit={onSubmitCreate}
              onCancel={onCancelCreate}
            />
          ) : null}
          {node.children?.map((child) => (
            <SrcTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              pendingCreate={pendingCreate}
              pendingRename={pendingRename}
              onToggleExpand={onToggleExpand}
              onPickFile={onPickFile}
              onContextMenu={onContextMenu}
              onSubmitCreate={onSubmitCreate}
              onCancelCreate={onCancelCreate}
              onSubmitRename={onSubmitRename}
              onCancelRename={onCancelRename}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function InlineNameInput({
  depth,
  kind,
  initialValue = '',
  placeholder,
  onSubmit,
  onCancel
}: {
  depth: number
  kind: 'file' | 'directory'
  initialValue?: string
  placeholder?: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    if (initialValue) {
      // Preselect the basename before the extension for fast renaming.
      const dot = initialValue.lastIndexOf('.')
      if (kind === 'file' && dot > 0) {
        input.setSelectionRange(0, dot)
      } else {
        input.select()
      }
    }
    // We intentionally run this only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const commit = useCallback(async () => {
    if (committedRef.current) return
    const name = value.trim()
    if (!name || name === initialValue) {
      committedRef.current = true
      onCancel()
      return
    }
    setBusy(true)
    setError(null)
    try {
      committedRef.current = true
      await onSubmit(name)
    } catch (caught) {
      committedRef.current = false
      setError(caught instanceof Error ? caught.message : 'Operation failed.')
      setBusy(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [initialValue, onCancel, onSubmit, value])

  return (
    <div
      className="flex flex-col gap-0.5 py-0.5"
      style={{ paddingLeft: 8 + depth * 12 }}
    >
      <div className="flex items-center gap-1.5">
        {kind === 'directory' ? (
          <FolderPlus className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        ) : (
          <FilePlus className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} aria-hidden />
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={busy}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="h-6 min-w-0 flex-1 rounded border border-accent/60 bg-panel px-1.5 font-mono text-[11px] text-ink outline-none placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/40"
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            if (busy) return
            void commit()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              committedRef.current = true
              onCancel()
            }
          }}
        />
      </div>
      {error ? <div className="pl-5 font-mono text-[10px] text-dangerInk">{error}</div> : null}
    </div>
  )
}

function joinDesignPath(parent: string, name: string): string {
  const base = parent.replace(/\/+$/, '')
  const joined = base && base !== '.' ? `${base}/${name}` : name
  return normalizeWorkspaceDesignPath(joined)
}

function findNodeByPath(root: WorkspaceSrcTreeNode | null, target: string): WorkspaceSrcTreeNode | null {
  if (!root) return null
  if (root.path === target) return root
  if (root.kind !== 'directory' || !root.children) return null
  for (const child of root.children) {
    const found = findNodeByPath(child, target)
    if (found) return found
  }
  return null
}

function parentDirPath(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/')
  return lastSlash < 0 ? '' : filePath.slice(0, lastSlash)
}

function collectDirectoryPaths(node: WorkspaceSrcTreeNode | null, into: string[] = []): string[] {
  if (!node) return into
  if (node.kind === 'directory') {
    into.push(node.path)
    node.children?.forEach((child) => collectDirectoryPaths(child, into))
  }
  return into
}

function isDesignTreeRoot(path: string): boolean {
  return isWorkspaceDesignTreeRootPath(path)
}

function isDescendantPath(child: string, ancestor: string): boolean {
  return child === ancestor || child.startsWith(`${ancestor}/`)
}

function replacePathPrefix(value: string, from: string, to: string): string {
  if (value === from) return to
  if (value.startsWith(`${from}/`)) return `${to}${value.slice(from.length)}`
  return value
}

export function CodeModePanel({ locale }: { locale: AppLocale }) {
  const bumpWorkspaceGitRefresh = useAppStore((state) => state.bumpWorkspaceGitRefresh)
  const api = window.emprint?.workspaceSrc
  const [tree, setTree] = useState<WorkspaceSrcTreeNode | null>(null)
  const [treeLoading, setTreeLoading] = useState(true)
  const [treeError, setTreeError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [committed, setCommitted] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [menu, setMenu] = useState<{ x: number; y: number; node: WorkspaceSrcTreeNode } | null>(null)
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null)
  const [pendingRename, setPendingRename] = useState<PendingRename | null>(null)
  const [monacoTsHint, setMonacoTsHint] = useState<string | null>(null)
  const [monacoWorkspaceRoot, setMonacoWorkspaceRoot] = useState<string | null>(null)
  const [installBusy, setInstallBusy] = useState(false)
  const [installError, setInstallError] = useState<string | null>(null)

  const dirty = content !== committed

  const refreshMonacoTypescript = useCallback(async () => {
    const payload = await configureMonacoForWorkspace(monaco)
    if (!payload) return
    setMonacoWorkspaceRoot(payload.workspaceRoot)
    if (payload.nodeModulesMissing) {
      setMonacoTsHint(
        pick(
          locale,
          'Run “Install code snippets” for full TypeScript checks (Astro types).',
          'Astro 타입 검사를 위해 “코드 조각 설치”를 실행하세요.'
        )
      )
    } else {
      setMonacoTsHint(null)
    }
  }, [locale])

  const handleInstallDependencies = useCallback(async () => {
    const install = window.emprint?.siteDev?.installDependencies
    if (!install) {
      setInstallError(pick(locale, 'Install API unavailable.', '설치 API를 사용할 수 없습니다.'))
      return
    }
    setInstallBusy(true)
    setInstallError(null)
    try {
      await install()
      await refreshMonacoTypescript()
    } catch (caught) {
      setInstallError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setInstallBusy(false)
    }
  }, [locale, refreshMonacoTypescript])

  useEffect(() => {
    let cancelled = false
    resetMonacoWorkspaceConfig()
    void configureMonacoForWorkspace(monaco).then((payload) => {
      if (cancelled || !payload) return
      setMonacoWorkspaceRoot(payload.workspaceRoot)
      if (payload.nodeModulesMissing) {
        setMonacoTsHint(
          pick(
            locale,
            'Run “Install code snippets” for full TypeScript checks (Astro types).',
            'Astro 타입 검사를 위해 “코드 조각 설치”를 실행하세요.'
          )
        )
      } else {
        setMonacoTsHint(null)
      }
    })
    return () => {
      cancelled = true
      resetMonacoWorkspaceConfig()
    }
  }, [locale])

  const loadTree = useCallback(async () => {
    if (!api?.listTree) {
      setTreeError(pick(locale, 'Workspace source API unavailable.', '워크스페이스 소스 API를 사용할 수 없습니다.'))
      setTreeLoading(false)
      return null
    }
    setTreeLoading(true)
    setTreeError(null)
    try {
      const next = await api.listTree()
      setTree(next)
      if (next) {
        setExpanded((prev) => {
          const set = new Set(prev)
          set.add(next.path)
          if (set.size === 1 && next.children) {
            for (const child of next.children) {
              if (child.kind === 'directory') set.add(child.path)
            }
          }
          return set
        })
      }
      return next
    } catch (caught) {
      setTreeError(caught instanceof Error ? caught.message : 'Failed to load site files.')
      return null
    } finally {
      setTreeLoading(false)
    }
  }, [api, locale])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  const handleToggleExpand = useCallback((path: string, open: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (open) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  const trySelectFile = useCallback(
    async (path: string) => {
      if (!api?.read) return
      if (dirty && selectedPath && selectedPath !== path) {
        const ok = window.confirm(
          pick(locale, 'You have unsaved changes. Switch files anyway?', '저장하지 않은 변경이 있습니다. 다른 파일로 이동할까요?')
        )
        if (!ok) return
      }
      const safePath = normalizeWorkspaceDesignPath(path)
      setSelectedPath(safePath)
      setFileLoading(true)
      setFileError(null)
      setSaveError(null)
      try {
        const res = await api.read({ path: safePath })
        setContent(res.content)
        setCommitted(res.content)
      } catch (caught) {
        setFileError(caught instanceof Error ? caught.message : 'Read failed.')
      } finally {
        setFileLoading(false)
      }
    },
    [api, dirty, locale, selectedPath]
  )

  const handleSave = useCallback(async () => {
    if (!api?.save || !selectedPath) return
    if (isWorkspaceContentConfigPath(selectedPath)) return
    setSaveBusy(true)
    setSaveError(null)
    try {
      await api.save({ path: normalizeWorkspaceDesignPath(selectedPath), content })
      bumpWorkspaceGitRefresh()
      setCommitted(content)
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Save failed.')
    } finally {
      setSaveBusy(false)
    }
  }, [api, bumpWorkspaceGitRefresh, content, selectedPath])

  const beginCreate = useCallback(
    (parentPath: string, kind: 'file' | 'directory') => {
      setPendingRename(null)
      setExpanded((prev) => {
        const next = new Set(prev)
        next.add(parentPath)
        return next
      })
      setPendingCreate({ parentPath, kind })
    },
    []
  )

  const beginRename = useCallback((node: WorkspaceSrcTreeNode) => {
    setPendingCreate(null)
    setPendingRename({ path: node.path, kind: node.kind, name: node.name })
  }, [])

  const handleContextMenu = useCallback((event: React.MouseEvent, node: WorkspaceSrcTreeNode) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY, node })
  }, [])

  const handlePanelContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!tree) return
      event.preventDefault()
      setMenu({ x: event.clientX, y: event.clientY, node: tree })
    },
    [tree]
  )

  const closeMenu = useCallback(() => setMenu(null), [])

  const handleSubmitCreate = useCallback(
    async (name: string) => {
      if (!api?.create || !pendingCreate) {
        return
      }
      if (!canCreateUnderDesignParent(pendingCreate.parentPath)) {
        throw new Error('Choose a folder (for example src/) to create a file or directory.')
      }
      const targetPath = joinDesignPath(pendingCreate.parentPath, name)
      const { kind } = pendingCreate
      const res = await api.create({ path: normalizeWorkspaceDesignPath(targetPath), kind })
      bumpWorkspaceGitRefresh()
      setPendingCreate(null)
      const refreshed = await loadTree()
      if (kind === 'directory') {
        setExpanded((prev) => {
          const next = new Set(prev)
          next.add(res.path)
          return next
        })
      } else if (refreshed && findNodeByPath(refreshed, res.path)) {
        void trySelectFile(res.path)
      }
    },
    [api, bumpWorkspaceGitRefresh, loadTree, pendingCreate, trySelectFile]
  )

  const handleCancelCreate = useCallback(() => {
    setPendingCreate(null)
  }, [])

  const handleSubmitRename = useCallback(
    async (newName: string) => {
      if (!api?.rename || !pendingRename) {
        return
      }
      const target = pendingRename
      const res = await api.rename({ path: normalizeWorkspaceDesignPath(target.path), newName })
      bumpWorkspaceGitRefresh()
      setPendingRename(null)

      // Keep the editor in sync if the renamed entry was (or contained) the selected file.
      setSelectedPath((prev) => (prev ? replacePathPrefix(prev, target.path, res.path) : prev))
      // Migrate expanded paths.
      setExpanded((prev) => {
        const next = new Set<string>()
        for (const p of prev) next.add(replacePathPrefix(p, target.path, res.path))
        return next
      })
      await loadTree()
    },
    [api, bumpWorkspaceGitRefresh, loadTree, pendingRename]
  )

  const handleCancelRename = useCallback(() => {
    setPendingRename(null)
  }, [])

  const handleDelete = useCallback(
    async (node: WorkspaceSrcTreeNode) => {
      if (!api?.delete) return
      const message =
        node.kind === 'directory'
          ? pick(
              locale,
              `Delete folder "${node.name}" and all of its contents? This cannot be undone.`,
              `폴더 "${node.name}"와 그 안의 모든 내용을 삭제할까요? 되돌릴 수 없습니다.`
            )
          : pick(locale, `Delete file "${node.name}"? This cannot be undone.`, `파일 "${node.name}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)
      if (!window.confirm(message)) return

      try {
        await api.delete({ path: normalizeWorkspaceDesignPath(node.path) })
        bumpWorkspaceGitRefresh()
      } catch (caught) {
        setTreeError(caught instanceof Error ? caught.message : 'Delete failed.')
        return
      }

      // Clear editor state if the deleted entry was (or contained) the selected file.
      setSelectedPath((prev) => (prev && isDescendantPath(prev, node.path) ? null : prev))
      setContent((prev) => (selectedPath && isDescendantPath(selectedPath, node.path) ? '' : prev))
      setCommitted((prev) => (selectedPath && isDescendantPath(selectedPath, node.path) ? '' : prev))
      setExpanded((prev) => {
        const next = new Set<string>()
        for (const p of prev) {
          if (!isDescendantPath(p, node.path)) next.add(p)
        }
        return next
      })
      await loadTree()
    },
    [api, bumpWorkspaceGitRefresh, loadTree, locale, selectedPath]
  )

  const menuItems = useMemo<ContextMenuItem[]>(() => {
    if (!menu) return []
    const target = menu.node
    const isDirectory = target.kind === 'directory'
    const isRoot = isDesignTreeRoot(target.path)
    const parentPath = isDirectory
      ? isRoot
        ? 'src'
        : target.path
      : parentDirPath(target.path) || 'src'

    if (isDirectory) {
      const items: ContextMenuItem[] = [
        {
          id: 'new-file',
          label: pick(locale, 'New File', '새 파일'),
          icon: <FilePlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
          onSelect: () => beginCreate(parentPath, 'file')
        },
        {
          id: 'new-folder',
          label: pick(locale, 'New Folder', '새 폴더'),
          icon: <FolderPlus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
          onSelect: () => beginCreate(parentPath, 'directory')
        }
      ]
      if (!isRoot) {
        items.push(
          {
            id: 'rename',
            label: pick(locale, 'Rename', '이름 바꾸기'),
            icon: <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
            onSelect: () => beginRename(target)
          },
          {
            id: 'delete',
            label: pick(locale, 'Delete', '삭제'),
            icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
            onSelect: () => void handleDelete(target)
          }
        )
      } else {
        items.push({
          id: 'refresh',
          label: pick(locale, 'Refresh', '새로고침'),
          icon: <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
          onSelect: () => void loadTree()
        })
      }
      return items
    }

    // File node: only rename + delete.
    return [
      {
        id: 'rename',
        label: pick(locale, 'Rename', '이름 바꾸기'),
        icon: <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
        onSelect: () => beginRename(target)
      },
      {
        id: 'delete',
        label: pick(locale, 'Delete', '삭제'),
        icon: <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
        onSelect: () => void handleDelete(target)
      }
    ]
  }, [beginCreate, beginRename, handleDelete, loadTree, locale, menu, tree])

  const editorLanguage = useMemo(() => (selectedPath ? languageForPath(selectedPath) : 'plaintext'), [selectedPath])

  const contentConfigLocked = selectedPath ? isWorkspaceContentConfigPath(selectedPath) : false

  const editorModelPath = useMemo(() => {
    if (!selectedPath) return undefined
    if (monacoWorkspaceRoot) {
      return workspaceFileToMonacoUri(monacoWorkspaceRoot, selectedPath)
    }
    return selectedPath
  }, [monacoWorkspaceRoot, selectedPath])

  const handleEditorMount = useCallback<NonNullable<EditorProps['onMount']>>(
    (editor, monaco) => {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        void handleSave()
      })
      void configureMonacoForWorkspace(monaco).then((payload) => {
        if (!payload) return
        setMonacoWorkspaceRoot(payload.workspaceRoot)
      })
    },
    [handleSave]
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-base lg:flex-row">
      <aside className="flex max-h-[min(40vh,320px)] min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-panel lg:h-full lg:max-h-none lg:w-80 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {pick(locale, 'Site project', '사이트 프로젝트')}
            </div>
            <div className="truncate text-sm font-semibold text-ink">
              {pick(locale, 'Code', '코드')}
            </div>
          </div>
          <Button
            variant="outline"
            type="button"
            className="h-8 w-8 shrink-0 p-0"
            title={pick(locale, 'Refresh tree', '트리 새로고침')}
            disabled={treeLoading}
            onClick={() => void loadTree()}
          >
            {treeLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            )}
          </Button>
        </div>
        <div className="space-y-1.5 overflow-visible border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={installBusy}
              onClick={() => void handleInstallDependencies()}
            >
              {installBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              ) : (
                <Package className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              )}
              {pick(locale, 'Install code snippets', '코드 조각 설치')}
            </Button>
            <Tooltip
              multiline
              side="bottom"
              label={
                locale === 'ko' ? (
                  <>
                    미리보기 전에 한 번 눌러 두면 좋습니다.
                    <br />
                    기본 구성 외에 필요한 코드 조각이 있으면 package.json에 추가하세요.
                  </>
                ) : (
                  <>
                    Run once before preview so dependencies are ready.
                    <br />
                    Add extra packages in package.json if you need more than the default setup.
                  </>
                )
              }
            >
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-panel2/40 text-muted transition-colors hover:bg-panel2 hover:text-ink"
                aria-label={
                  locale === 'ko' ? '코드 조각 설치 안내' : 'About installing code snippets'
                }
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          </div>
          {installError ? <div className="text-[11px] text-dangerInk">{installError}</div> : null}
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2"
          onContextMenu={handlePanelContextMenu}
        >
          {treeError ? <div className="px-2 py-2 text-xs text-dangerInk">{treeError}</div> : null}
          {!treeLoading && tree ? (
            <SrcTreeNode
              node={tree}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              pendingCreate={pendingCreate}
              pendingRename={pendingRename}
              onToggleExpand={handleToggleExpand}
              onPickFile={trySelectFile}
              onContextMenu={handleContextMenu}
              onSubmitCreate={handleSubmitCreate}
              onCancelCreate={handleCancelCreate}
              onSubmitRename={handleSubmitRename}
              onCancelRename={handleCancelRename}
            />
          ) : null}
          {treeLoading ? (
            <div className="flex items-center gap-2 px-2 py-4 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden />
              {pick(locale, 'Loading…', '불러오는 중…')}
            </div>
          ) : null}
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-panel px-3 py-2">
          <div className="min-w-0 font-mono text-[11px] text-muted">
            {selectedPath ?? pick(locale, 'Select a file', '파일을 선택하세요')}
          </div>
          <div className="flex items-center gap-2">
            {dirty ? (
              <span className="text-[10px] uppercase tracking-wide text-accent">
                {pick(locale, 'Unsaved', '저장 안 됨')}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-8 gap-1.5 px-2.5 text-xs"
              disabled={!selectedPath || !dirty || saveBusy || fileLoading || contentConfigLocked}
              onClick={() => void handleSave()}
            >
              {saveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} aria-hidden /> : null}
              <Save className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              {pick(locale, 'Save', '저장')}
            </Button>
          </div>
        </div>
        {fileError ? <div className="border-b border-danger/40 bg-dangerBg px-3 py-1.5 text-xs text-dangerInk">{fileError}</div> : null}
        {saveError ? <div className="border-b border-danger/40 bg-dangerBg px-3 py-1.5 text-xs text-dangerInk">{saveError}</div> : null}
        {monacoTsHint ? (
          <div className="border-b border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-muted">{monacoTsHint}</div>
        ) : null}
        {contentConfigLocked ? (
          <div className="border-b border-border bg-panel2/40 px-3 py-1.5 text-xs text-muted">
            {pick(
              locale,
              `${WORKSPACE_CONTENT_CONFIG_PATH} is locked: the site must load posts from ./posts. Edit writing in Posts/Drafts.`,
              `${WORKSPACE_CONTENT_CONFIG_PATH}는 잠겨 있습니다. 사이트는 ./posts만 읽습니다. 글은 Posts/Drafts에서 편집하세요.`
            )}
          </div>
        ) : null}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {fileLoading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-base/70">
              <Loader2 className="h-8 w-8 animate-spin text-muted" strokeWidth={2} aria-hidden />
            </div>
          ) : null}
          {selectedPath && editorModelPath ? (
            <div className="absolute inset-0 overflow-hidden">
              <Editor
                height="100%"
                theme={monacoTheme()}
                path={editorModelPath}
                language={editorLanguage}
                value={content}
                onChange={(v) => setContent(v ?? '')}
                onMount={handleEditorMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  automaticLayout: true,
                  readOnly: contentConfigLocked
                }}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
              {pick(
                locale,
                'Pick a file from the tree. Right-click to create, rename, or delete entries.',
                '왼쪽 트리에서 파일을 선택하세요. 우클릭으로 항목을 만들고 이름을 바꾸거나 삭제할 수 있습니다.'
              )}
            </div>
          )}
        </div>
      </section>

      {menu ? (
        <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />
      ) : null}
    </div>
  )
}
