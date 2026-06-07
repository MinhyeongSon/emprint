import matter from 'gray-matter'

/** Strip keys YAML cannot encode so stringify stays stable. */
export function frontmatterForYaml(data: Record<string, unknown>, opts?: { dropEmptyStrings?: boolean }): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (opts?.dropEmptyStrings && value === '') continue
    out[key] = value
  }
  return out
}

export function parseMarkdown(content: string): { data: Record<string, unknown>; body: string } {
  try {
    const parsed = matter(content)
    return { data: (parsed.data ?? {}) as Record<string, unknown>, body: parsed.content ?? '' }
  } catch {
    return { data: {}, body: content }
  }
}

export function serializeMarkdown(input: {
  data: Record<string, unknown>
  body: string
  dropEmptyStrings?: boolean
}): string {
  const yamlOpts = input.dropEmptyStrings === undefined ? undefined : { dropEmptyStrings: input.dropEmptyStrings }
  return matter.stringify(input.body ?? '', frontmatterForYaml(input.data ?? {}, yamlOpts))
}
