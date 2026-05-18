import { cn } from '@renderer/lib/cn'

const previewShell =
  'pointer-events-none aspect-[16/10] w-full max-h-[140px] select-none overflow-hidden rounded-lg border border-border/80 bg-base/40 p-2.5 shadow-inner sm:max-h-[160px]'

/** Browser window chrome — close · minimize · maximize (decorative). */
function PreviewWindowChrome() {
  return (
    <div className="mb-2 flex items-center gap-1 border-b border-border/40 pb-1.5">
      <div className="flex items-center gap-1" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
        <span className="h-2 w-2 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
      </div>
      <div className="ml-2 h-1 min-w-0 flex-1 rounded-full bg-muted/20" />
    </div>
  )
}

/** Column · Reading Room — minimal header, narrow measure, article-first list. */
export function ColumnReadingRoomPreview() {
  return (
    <div className={previewShell}>
      <PreviewWindowChrome />
      <div className="mb-2 flex items-baseline justify-between border-b border-border/40 pb-1.5">
        <div className="h-1 w-10 rounded-sm bg-ink/18" />
        <div className="flex gap-1">
          <div className="h-0.5 w-3 rounded-full bg-muted/30" />
          <div className="h-0.5 w-3 rounded-full bg-muted/30" />
          <div className="h-0.5 w-3 rounded-full bg-muted/30" />
        </div>
      </div>
      <div className="mx-auto max-w-[90%] space-y-2.5 pt-0.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1 py-0.5">
            <div
              className={cn('rounded-sm bg-ink/14', i === 0 ? 'h-1.5 w-[78%]' : 'h-1 w-[62%]')}
            />
            <div className="h-0.5 w-14 rounded-full bg-muted/35" />
            {i === 0 ? (
              <>
                <div className="h-0.5 w-full rounded-full bg-ink/7" />
                <div className="h-0.5 w-[48%] rounded-full bg-ink/6" />
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Memoir · timeline — spine, nodes, floating section cards. */
export function MemoirLayoutPreview() {
  return (
    <div className={previewShell}>
      <PreviewWindowChrome />
      <div className="relative pl-3.5">
        <div
          className="absolute bottom-1 left-1 top-1 w-px rounded-full bg-accent/45"
          aria-hidden
        />
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="relative pl-2">
              <div
                className="absolute -left-[0.4rem] top-2 h-1.5 w-1.5 rounded-full border border-accent/55 bg-panel shadow-[0_0_0_2px_rgb(var(--base)/0.9)]"
                aria-hidden
              />
              <div className="rounded-md border border-border/70 bg-panel/90 p-2 shadow-[0_2px_8px_rgb(0_0_0/0.06)]">
                <div className="h-1 w-[55%] rounded-full bg-ink/16" />
                <div className="mt-1.5 space-y-0.5">
                  <div className="h-0.5 w-full rounded-full bg-ink/8" />
                  <div className="h-0.5 w-[70%] rounded-full bg-ink/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
