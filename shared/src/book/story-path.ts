/** Single Book story markdown — fixed path for IPC and bootstrap. */
export const BOOK_STORY_RELATIVE_PATH = 'story/story.md' as const

export function isBookStoryPath(relativePath: string): boolean {
  return relativePath.replace(/\\/g, '/').replace(/^\/+/, '') === BOOK_STORY_RELATIVE_PATH
}
