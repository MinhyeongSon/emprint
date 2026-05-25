import type { WorkspaceArtifact } from '@emprint/core'
import { EpBookClasses } from './contract'

export function createBookPageArtifacts(): WorkspaceArtifact[] {
  const EP = EpBookClasses
  return [
    {
      relativePath: 'src/pages/index.astro',
      content: `---
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'
import BookPages from '../components/BookPages.astro'
import BookScroll from '../components/BookScroll.astro'
import themeFile from '../../config/theme.json'

const stories = await getCollection('story')
const story = stories[0]
const composition = themeFile.layoutComposition === 'scroll' ? 'scroll' : 'pages'
const emptyMsg = 'No story yet. Write in Emprint under Story.'

let storyRaw = ''
if (story) {
  try {
    storyRaw = await readFile(path.join(process.cwd(), 'story', 'story.md'), 'utf8')
  } catch {
    storyRaw = typeof story.body === 'string' ? story.body : ''
  }
}
---

<Layout title={story?.data.title ?? 'Story'} current="home">
  <div class="${EP.StoryInner}">
    {!story ? (
      <p class="${EP.Empty}">{emptyMsg}</p>
    ) : composition === 'scroll' ? (
      <BookScroll title={story.data.title} raw={storyRaw} />
    ) : (
      <BookPages title={story.data.title} raw={storyRaw} />
    )}
  </div>
</Layout>
`
    }
  ]
}

export function getBookPageTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return createBookPageArtifacts()
}
