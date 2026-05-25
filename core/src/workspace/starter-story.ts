import { BOOK_STORY_RELATIVE_PATH, type AppLocale, type WorkspaceConfig } from '@emprint/shared'

export interface StarterStoryArtifact {
  relativePath: typeof BOOK_STORY_RELATIVE_PATH
  content: string
}

export function createStarterStoryArtifact(config: WorkspaceConfig): StarterStoryArtifact {
  const body = STARTER_BODY[config.locale]
  const content = [
    '---',
    `title: ${config.title}`,
    `description: ${config.description}`,
    '---',
    '',
    body
  ].join('\n')

  return {
    relativePath: BOOK_STORY_RELATIVE_PATH,
    content
  }
}

const STARTER_BODY: Record<AppLocale, string> = {
  ko: [
    '# 이야기를 시작해 보세요',
    '',
    'Book 워크스페이스에는 이 파일 하나만 있습니다. 여기에 글과 이미지를 모두 담아 주세요.',
    '',
    '---',
    '',
    '페이지를 나누려면 위와 같이 줄만 있는 `---`를 넣으세요. Design → Template에서 **Pages** 레이아웃을 선택하면 종이를 넘기듯 한 장씩 읽을 수 있습니다.'
  ].join('\n'),
  en: [
    '# Begin your story',
    '',
    'A Book workspace has just this one file. Write your full narrative here, including images.',
    '',
    '---',
    '',
    'Add a line with only `---` to split pages. Choose **Pages** under Design → Template for a page-turn reading experience.'
  ].join('\n')
}
