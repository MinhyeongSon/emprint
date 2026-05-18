import type { MemoirSectionFile, MemoirSectionSummary, WorkspaceConfig } from '@emprint/shared'
import { memoirSectionRelativePath, sectionTitleFromProps } from '@emprint/shared'

export interface StarterMemoirArtifact {
  relativePath: string
  content: string
  summary: MemoirSectionSummary
}

function sectionArtifact(file: MemoirSectionFile): StarterMemoirArtifact {
  const relativePath = memoirSectionRelativePath(file.id)
  const content = `${JSON.stringify(file, null, 2)}\n`
  return {
    relativePath,
    content,
    summary: {
      path: relativePath,
      id: file.id,
      type: file.type,
      order: file.order,
      published: file.published,
      title: sectionTitleFromProps(file.type, file.props)
    }
  }
}

export function createStarterMemoirArtifacts(config: WorkspaceConfig): StarterMemoirArtifact[] {
  const name = config.title.trim() || 'You'
  const files: MemoirSectionFile[] = [
    {
      id: 'hero',
      type: 'Hero',
      order: 0,
      published: true,
      props: {
        eyebrow: config.locale === 'ko' ? 'Memoir' : 'Memoir',
        title: name,
        subtitle: config.description
      }
    },
    {
      id: 'intro',
      type: 'Introduction',
      order: 1,
      published: true,
      props: {
        title: config.locale === 'ko' ? '소개' : 'Introduction',
        body:
          config.locale === 'ko'
            ? '이 Memoir는 의미 있는 섹션 조합으로 프로필과 작업을 소개합니다. Emprint에서 섹션을 편집하고 발행하세요.'
            : 'This Memoir introduces you through semantic sections—not a post feed. Edit sections in Emprint and publish when ready.'
      }
    },
    {
      id: 'work',
      type: 'ProjectGroup',
      order: 2,
      published: true,
      children: ['project-1'],
      props: { title: config.locale === 'ko' ? '프로젝트' : 'Selected work' }
    },
    {
      id: 'project-1',
      type: 'Project',
      order: 0,
      published: true,
      props: {
        title: config.locale === 'ko' ? '첫 번째 프로젝트' : 'First project',
        body:
          config.locale === 'ko'
            ? '프로젝트 설명을 적어 주세요. 테마는 레이아웃만 바꾸고 이 구조는 유지됩니다.'
            : 'Describe a project here. Themes change presentation—not this structure.'
      }
    },
    {
      id: 'contact',
      type: 'Contact',
      order: 3,
      published: true,
      props: {
        title: config.locale === 'ko' ? '연락' : 'Contact',
        body: config.locale === 'ko' ? '이메일 또는 링크를 추가하세요.' : 'Add your email or links.'
      }
    }
  ]

  return files.map(sectionArtifact)
}
