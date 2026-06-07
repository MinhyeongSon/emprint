import { cn } from '@renderer/lib/cn'

/** Mini browser frame in Hub format cards (Emprint palette via app CSS vars). */
const previewFrame =
  'pointer-events-none flex aspect-[16/10] w-full max-h-[140px] flex-col select-none overflow-hidden rounded-lg border border-border/80 bg-[rgb(var(--base))] text-[rgb(var(--ink))] shadow-inner sm:max-h-[168px]'

/** Traffic lights only — no site header chrome in the preview strip. */
function PreviewTrafficLights() {
  return (
    <div className="shrink-0 border-b border-[rgb(var(--border))]/50 px-2 py-1">
      <div className="flex items-center gap-1" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
      </div>
    </div>
  )
}

function PreviewBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 items-center justify-center p-2', className)}>{children}</div>
  )
}

/** Column · Reading Room — centered post list. */
export function ColumnReadingRoomPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="w-[78%] max-w-[11rem] space-y-2">
          {[0, 1, 2].map((i) => (
            <article key={i} className="border-b border-[rgb(var(--border))]/50 pb-1.5 last:border-0">
              <div
                className={cn(
                  'rounded-sm bg-[rgb(var(--ink))]/20',
                  i === 0 ? 'h-2 w-[82%]' : 'h-1.5 w-[68%]'
                )}
              />
              <div className="mt-0.5 h-0.5 w-12 rounded-full bg-[rgb(var(--muted))]/45" />
              {i === 0 ? (
                <div className="mt-1 space-y-0.5">
                  <div className="h-0.5 w-full rounded-full bg-[rgb(var(--ink))]/8" />
                  <div className="h-0.5 w-[45%] rounded-full bg-[rgb(var(--ink))]/6" />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Dictionary · Reference — sidebar index + recent entries (default home). */
export function DictionaryReferencePreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody className="!items-stretch !p-1.5">
        <div className="flex h-full w-[88%] max-w-[12rem] gap-1">
          <aside className="flex w-[32%] shrink-0 flex-col gap-0.5 rounded border border-[rgb(var(--border))]/60 bg-[rgb(var(--panel))]/80 p-1">
            <div className="h-0.5 w-[70%] rounded-full bg-[rgb(var(--ink))]/18" />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-0.5 rounded-full bg-[rgb(var(--muted))]/35"
                style={{ width: `${72 - i * 6}%`, marginLeft: i > 1 ? '0.25rem' : 0 }}
              />
            ))}
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="h-1 w-[45%] rounded-full bg-[rgb(var(--ink))]/15" />
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded border border-[rgb(var(--border))]/60 bg-[rgb(var(--panel))] p-1"
              >
                <div className="h-1 w-[78%] rounded-sm bg-[rgb(var(--ink))]/18" />
                <div className="mt-0.5 h-0.5 w-[55%] rounded-full bg-[rgb(var(--muted))]/35" />
              </div>
            ))}
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Dictionary · Graph — radial topic link graph (spatial home). */
export function DictionaryGraphPreview() {
  const nodes = [
    { cx: 36, cy: 36, r: 3.2, accent: true },
    { cx: 36, cy: 12, r: 2.2, accent: false },
    { cx: 56, cy: 28, r: 2, accent: false },
    { cx: 52, cy: 50, r: 2.2, accent: false },
    { cx: 20, cy: 48, r: 2, accent: false },
    { cx: 14, cy: 26, r: 1.8, accent: false }
  ] as const
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [1, 2],
    [3, 4]
  ]

  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center">
          <svg viewBox="0 0 72 72" className="h-full w-full" aria-hidden>
            {edges.map(([a, b], i) => {
              const from = nodes[a]
              const to = nodes[b]
              if (!from || !to) return null
              return (
                <line
                  key={i}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke="rgb(var(--border))"
                  strokeWidth="0.75"
                  opacity={0.85}
                />
              )
            })}
            {nodes.map((node, i) => (
              <circle
                key={i}
                cx={node.cx}
                cy={node.cy}
                r={node.r}
                fill={
                  node.accent ? 'rgb(var(--accent))' : 'rgb(var(--panel))'
                }
                stroke={node.accent ? 'rgb(var(--accent))' : 'rgb(var(--muted))'}
                strokeWidth="0.75"
                opacity={node.accent ? 1 : 0.9}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 w-1 rounded-full',
                  i === 0 ? 'bg-[rgb(var(--accent))]/70' : 'bg-[rgb(var(--muted))]/35'
                )}
              />
            ))}
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Dictionary · Atlas — top-level topic tiles (domain map). */
export function DictionaryAtlasPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="grid w-[82%] max-w-[11rem] grid-cols-3 gap-0.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded border border-[rgb(var(--border))]/65 bg-[rgb(var(--panel))] p-0.5"
            >
              <div className="h-2.5 w-full rounded-sm bg-[rgb(var(--accent))]/20" />
              <div className="mt-0.5 space-y-px px-0.5 pb-0.5">
                <div className="h-0.5 w-[80%] rounded-full bg-[rgb(var(--ink))]/16" />
                <div className="h-0.5 w-[45%] rounded-full bg-[rgb(var(--muted))]/32" />
              </div>
            </div>
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Hub card default — Graph (distinct spatial identity). */
export function DictionaryLayoutPreview() {
  return <DictionaryGraphPreview />
}

/** Memoir · grid — masonry-style blocks. */
export function MemoirGridPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="grid w-[78%] max-w-[11rem] grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded border border-[rgb(var(--border))]/70 bg-[rgb(var(--panel))] p-1',
                i === 0 && 'col-span-2'
              )}
            >
              <div className={cn('rounded-sm bg-[rgb(var(--accent))]/20', i === 0 ? 'h-6' : 'h-4')} />
              <div className="mt-1 h-1 w-[70%] rounded-full bg-[rgb(var(--ink))]/15" />
            </div>
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Memoir · editorial — hero + quote side by side. */
export function MemoirEditorialPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody className="!items-stretch !p-1.5">
        <div className="flex h-full w-[88%] max-w-[12rem] gap-1.5">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 rounded border border-[rgb(var(--border))]/70 bg-[rgb(var(--panel))] p-1.5">
            <div className="h-1.5 w-[75%] rounded-full bg-[rgb(var(--ink))]/22" />
            <div className="h-1 w-[55%] rounded-full bg-[rgb(var(--muted))]/40" />
          </div>
          <div className="flex w-[38%] flex-col justify-center rounded border border-dashed border-[rgb(var(--accent))]/35 bg-[rgb(var(--accent))]/8 p-1">
            <div className="h-0.5 w-full rounded-full bg-[rgb(var(--ink))]/12" />
            <div className="mt-0.5 h-0.5 w-[80%] rounded-full bg-[rgb(var(--ink))]/8" />
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Memoir · timeline — centered spine + cards. */
export function MemoirLayoutPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="relative w-[70%] max-w-[10rem] pl-3">
          <div className="absolute bottom-0 left-1 top-0 w-px bg-[rgb(var(--accent))]/40" aria-hidden />
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="relative pl-2.5">
                <div
                  className="absolute -left-[0.35rem] top-2 h-1.5 w-1.5 rounded-full border border-[rgb(var(--accent))]/60 bg-[rgb(var(--panel))]"
                  aria-hidden
                />
                <div className="rounded-md border border-[rgb(var(--border))]/70 bg-[rgb(var(--panel))] p-1.5 shadow-sm">
                  <div className="h-1.5 w-[58%] rounded-full bg-[rgb(var(--ink))]/18" />
                  <div className="mt-1 space-y-0.5">
                    <div className="h-0.5 w-full rounded-full bg-[rgb(var(--ink))]/8" />
                    <div className="h-0.5 w-[65%] rounded-full bg-[rgb(var(--ink))]/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Column · Magazine — hero + two columns. */
export function ColumnMagazinePreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody className="!items-stretch !p-1.5">
        <div className="flex h-full w-[82%] max-w-[11rem] flex-col gap-1">
          <div className="h-5 rounded border border-[rgb(var(--border))]/70 bg-[rgb(var(--accent))]/15" />
          <div className="grid flex-1 grid-cols-2 gap-1">
            <div className="space-y-0.5 rounded border border-[rgb(var(--border))]/60 bg-[rgb(var(--panel))] p-1">
              <div className="h-1 w-[80%] rounded-full bg-[rgb(var(--ink))]/18" />
              <div className="h-0.5 w-[60%] rounded-full bg-[rgb(var(--ink))]/8" />
            </div>
            <div className="rounded border border-[rgb(var(--border))]/60 bg-[rgb(var(--panel))]/80 p-1">
              <div className="h-0.5 w-full rounded-full bg-[rgb(var(--muted))]/35" />
              <div className="mt-0.5 h-0.5 w-[70%] rounded-full bg-[rgb(var(--muted))]/25" />
            </div>
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Column · Journal — year groups. */
export function ColumnJournalPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="w-[72%] max-w-[10rem] space-y-2">
          {['2025', '2024'].map((year) => (
            <div key={year}>
              <div className="text-[8px] font-semibold text-[rgb(var(--muted))]/70">{year}</div>
              <div className="mt-0.5 space-y-1 border-l border-[rgb(var(--border))]/60 pl-1.5">
                {[0, 1].map((i) => (
                  <div key={i} className="h-1 w-[85%] rounded-full bg-[rgb(var(--ink))]/12" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Book · Pages — centered page sheet + nav. */
export function BookPagesPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="flex w-[72%] max-w-[11rem] flex-col items-center gap-1">
          <div className="h-16 w-full rounded border border-[rgb(var(--border))]/80 bg-[rgb(var(--panel))] shadow-sm">
            <div className="mx-auto mt-3 h-1 w-[70%] rounded-sm bg-[rgb(var(--ink))]/15" />
            <div className="mx-auto mt-1.5 h-0.5 w-[55%] rounded-full bg-[rgb(var(--ink))]/8" />
            <div className="mx-auto mt-1 h-0.5 w-[80%] rounded-full bg-[rgb(var(--ink))]/6" />
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-[rgb(var(--muted))]/60">
            <span>‹</span>
            <span className="tabular-nums">2 / 5</span>
            <span>›</span>
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}

/** Book · Scroll — continuous column. */
export function BookScrollPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="w-[52%] max-w-[5rem] space-y-1 rounded border border-[rgb(var(--border))]/80 bg-[rgb(var(--panel))] p-1.5 shadow-sm">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-0.5 rounded-full bg-[rgb(var(--ink))]/10"
              style={{ width: `${88 - i * 8}%` }}
            />
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Fragments · Gallery — masonry tiles. */
export function FragmentsGalleryPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="grid w-[78%] max-w-[11rem] grid-cols-3 gap-0.5">
          {[
            'col-span-2 h-5',
            'h-3',
            'h-4',
            'col-span-2 h-3',
            'h-5',
            'h-3 col-span-2'
          ].map((cls, i) => (
            <div key={i} className={cn('rounded-sm bg-[rgb(var(--accent))]/25', cls)} />
          ))}
        </div>
      </PreviewBody>
    </div>
  )
}

/** Fragments · LP Shelf — centered vinyl + compact side preview. */
export function FragmentsShelfPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="flex items-center justify-center gap-1">
          <span className="shrink-0 text-[9px] leading-none text-[rgb(var(--muted))]/60" aria-hidden>
            ‹
          </span>
          <div className="relative h-11 w-11 shrink-0">
            <div className="absolute inset-[16%] rounded-full bg-[rgb(var(--ink))]/15 shadow-inner" />
            <div className="absolute inset-[16%] rounded-full border border-[rgb(var(--border))]/40" />
            {[0, 72, 144, 216, 288].map((deg) => (
              <div
                key={deg}
                className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/50"
                style={{ transform: `rotate(${deg}deg) translateY(-125%)` }}
              />
            ))}
            <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--accent))]" />
          </div>
          <span className="shrink-0 text-[9px] leading-none text-[rgb(var(--muted))]/60" aria-hidden>
            ›
          </span>
          <div className="ml-0.5 flex w-[2.75rem] shrink-0 flex-col gap-0.5 rounded border border-[rgb(var(--border))]/80 bg-[rgb(var(--panel))] p-1">
            <div className="h-7 w-full rounded-sm bg-[rgb(var(--accent))]/22" />
            <div className="h-0.5 w-[85%] rounded-sm bg-[rgb(var(--accent))]/55" />
            <div className="h-0.5 w-[60%] rounded-full bg-[rgb(var(--muted))]/40" />
          </div>
        </div>
      </PreviewBody>
    </div>
  )
}
