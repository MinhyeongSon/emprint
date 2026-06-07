import { parseKnowledgeSummary, parsePostSummary } from '@emprint/core'
import type { KnowledgeSummary, PostSummary } from '@emprint/shared'

export function summarizeMarkdown(relativePath: string, content: string, fallbackUpdatedAt: string): PostSummary {
  const summary = parsePostSummary(relativePath, content)
  if (!summary.updatedAt && fallbackUpdatedAt) {
    return { ...summary, updatedAt: fallbackUpdatedAt }
  }
  return summary
}

export function summarizeKnowledge(
  relativePath: string,
  content: string,
  fallbackUpdatedAt: string
): KnowledgeSummary {
  const summary = parseKnowledgeSummary(relativePath, content)
  if (!summary.updatedAt && fallbackUpdatedAt) {
    return { ...summary, updatedAt: fallbackUpdatedAt }
  }
  return summary
}

export function inferTitleFromPath(relativePath: string): string {
  const name = relativePath.split('/').pop() ?? relativePath
  return name.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ') || 'Untitled'
}
