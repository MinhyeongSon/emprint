import { describe, expect, it } from 'vitest'
import { parseMarkdown, serializeMarkdown } from './markdown-frontmatter'

describe('markdown-frontmatter', () => {
  it('round-trips title and body', () => {
    const source = '---\ntitle: Hello\ndraft: false\n---\n\nBody line\n'
    const parsed = parseMarkdown(source)
    expect(parsed.data.title).toBe('Hello')
    expect(parsed.body.trim()).toBe('Body line')
    const out = serializeMarkdown({ data: parsed.data, body: parsed.body })
    expect(out).toContain('title: Hello')
    expect(out).toContain('Body line')
  })

  it('strips undefined keys on serialize', () => {
    const out = serializeMarkdown({
      data: { title: 'T', removed: undefined },
      body: 'x'
    })
    expect(out).toContain('title: T')
    expect(out).not.toContain('removed')
  })

  it('drops empty strings when requested', () => {
    const out = serializeMarkdown({
      data: { title: 'T', subtitle: '' },
      body: 'x',
      dropEmptyStrings: true
    })
    expect(out).toContain('title: T')
    expect(out).not.toContain('subtitle')
  })
})
