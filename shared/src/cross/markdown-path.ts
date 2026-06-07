/** Pick a unique dated markdown path under a workspace content folder (e.g. knowledge/, posts/). */
export function allocateDatedMarkdownPath(
  directory: string,
  existingRelativePaths: Iterable<string>,
  date = new Date()
): string {
  const folder = directory.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const day = date.toISOString().slice(0, 10)
  const base = `${folder}/${day}-new`
  const existing = new Set(
    Array.from(existingRelativePaths, (path) => path.replace(/\\/g, '/').toLowerCase())
  )

  let candidate = `${base}.md`
  if (!existing.has(candidate.toLowerCase())) return candidate

  for (let n = 2; n < 10_000; n++) {
    candidate = `${base}-${n}.md`
    if (!existing.has(candidate.toLowerCase())) return candidate
  }

  throw new Error('Could not allocate a unique markdown path.')
}
