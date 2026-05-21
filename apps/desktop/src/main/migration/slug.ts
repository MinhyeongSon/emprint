/** Slug for post filenames and asset base names (unicode-aware). */
export function slugifyForPath(value: string): string {
  return (
    value
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'post'
  )
}

export function postFilenameFromTitleAndDate(title: string, date: string, used: Set<string>): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10)
  let slug = slugifyForPath(title.replace(/^\[[^\]]+\]\s*/, ''))
  let base = `${day}-${slug}`
  let n = 2
  while (used.has(base)) {
    base = `${day}-${slug}-${n}`
    n += 1
  }
  used.add(base)
  return `${base}.md`
}
