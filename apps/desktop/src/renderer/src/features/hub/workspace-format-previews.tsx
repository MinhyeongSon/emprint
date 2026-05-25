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

/** Dictionary · reference — centered index + entry layout. */
export function DictionaryLayoutPreview() {
  return (
    <div className={previewFrame}>
      <PreviewTrafficLights />
      <PreviewBody>
        <div className="flex w-[88%] max-w-[12rem] gap-2">
          <aside className="w-[34%] shrink-0 border-r border-[rgb(var(--border))]/60 pr-1.5">
            <div className="h-1 w-9 rounded-sm bg-[rgb(var(--ink))]/18" />
            <div className="mt-1 space-y-0.5">
              <div className="ml-0.5 h-0.5 w-7 rounded-full bg-[rgb(var(--muted))]/40" />
              <div className="ml-2 h-0.5 w-6 rounded-full bg-[rgb(var(--muted))]/32" />
              <div className="ml-1 h-0.5 w-8 rounded-full bg-[rgb(var(--accent))]/55" />
            </div>
          </aside>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="rounded border border-[rgb(var(--border))]/70 bg-[rgb(var(--panel))] p-1.5">
              <div className="h-1.5 w-[72%] rounded-sm bg-[rgb(var(--ink))]/18" />
              <div className="mt-0.5 h-0.5 w-10 rounded-full bg-[rgb(var(--muted))]/40" />
              <div className="mt-1 h-0.5 w-full rounded-full bg-[rgb(var(--ink))]/7" />
            </div>
            <div className="rounded border border-[rgb(var(--border))]/50 bg-[rgb(var(--panel))]/60 p-1.5 opacity-80">
              <div className="h-1 w-[58%] rounded-sm bg-[rgb(var(--ink))]/14" />
            </div>
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
