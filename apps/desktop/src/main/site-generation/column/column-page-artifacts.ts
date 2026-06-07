import type { WorkspaceArtifact } from '@emprint/core'
import { EpColumnClasses } from './contract'
import { createColumnSearchPageArtifact } from './column-search-artifacts'

const COLUMN_PAGE_SYNC_PATHS = new Set([
  'src/pages/index.astro',
  'src/pages/posts/index.astro',
  'src/pages/tags/[tag].astro',
  'src/pages/search/index.astro'
])

export function getColumnPageTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return createColumnPageArtifacts().filter((a) => COLUMN_PAGE_SYNC_PATHS.has(a.relativePath))
}

export function createColumnPageArtifacts(lang: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/pages/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'
import ColumnPostFeed from '../components/ColumnPostFeed.astro'
import themeFile from '../../config/theme.json'

const all = await getCollection('posts', ({ data }) => !data.draft)
const sorted = all.sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})

const composition =
  themeFile.layoutComposition === 'magazine' ? 'magazine' : themeFile.layoutComposition === 'journal' ? 'journal' : 'readingRoom'
const recentLimit = composition === 'magazine' ? 7 : composition === 'journal' ? 12 : 5
const recent = sorted.slice(0, recentLimit)
const hasMore = sorted.length > recent.length
---

<Layout current="home">
  <section class="${EpColumnClasses.Container}">
    <div class="${EpColumnClasses.SectionHead}">
      <h2 class="${EpColumnClasses.SectionHeadTitle}">
        {composition === 'journal' ? 'Journal' : composition === 'magazine' ? 'Latest' : 'Recent'}
      </h2>
      {hasMore ? (
        <a class="${EpColumnClasses.SectionHeadLink}" href={\`\${import.meta.env.BASE_URL}posts/\`}>See all →</a>
      ) : null}
    </div>
    {recent.length === 0 ? (
      <div class="${EpColumnClasses.Empty}">No posts yet. Write something in Emprint and publish.</div>
    ) : (
      <ColumnPostFeed posts={recent} catalog={sorted} mode="home" />
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/posts/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import ColumnPostFeed from '../../components/ColumnPostFeed.astro'

const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})
---

<Layout title="Archive" current="archive">
  <section class="${EpColumnClasses.Container}">
    <div class="${EpColumnClasses.SectionHead}">
      <h2 class="${EpColumnClasses.SectionHeadTitle}">Archive</h2>
      <span class="${EpColumnClasses.SectionHeadAside}">{posts.length}</span>
    </div>
    {posts.length === 0 ? (
      <div class="${EpColumnClasses.Empty}">No posts yet.</div>
    ) : (
      <ColumnPostFeed posts={posts} catalog={posts} mode="archive" />
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/posts/[...slug].astro',
      content: `---
import { getCollection, render } from 'astro:content'
import PostLayout from '../../layouts/PostLayout.astro'

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post }
  }))
}

const { post } = Astro.props
const { Content } = await render(post)
---

<PostLayout
  title={post.data.title}
  description={post.data.description}
  tags={post.data.tags}
  createdAt={post.data.createdAt}
  updatedAt={post.data.updatedAt}
>
  <Content />
</PostLayout>
`
    },
    {
      relativePath: 'src/pages/tags/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'

const posts = await getCollection('posts', ({ data }) => !data.draft)
const counts = new Map<string, number>()
for (const post of posts) {
  for (const tag of post.data.tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
}
const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
---

<Layout title="Tags" current="tags">
  <section class="${EpColumnClasses.Container}">
    <div class="${EpColumnClasses.SectionHead}">
      <h2 class="${EpColumnClasses.SectionHeadTitle}">Tags</h2>
      <span class="${EpColumnClasses.SectionHeadAside}">{tags.length}</span>
    </div>
    {tags.length === 0 ? (
      <div class="${EpColumnClasses.Empty}">No tags yet. Add some in your post frontmatter.</div>
    ) : (
      <ul class="${EpColumnClasses.TagRow}" style="padding:0.5rem 0;">
        {tags.map(([tag, count]) => (
          <li>
            <a class="${EpColumnClasses.Tag}" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(tag)}/\`}>
              {tag} · {count}
            </a>
          </li>
        ))}
      </ul>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/tags/[tag].astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import ColumnPostFeed from '../../components/ColumnPostFeed.astro'

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  const tagSet = new Set<string>()
  for (const p of posts) for (const t of p.data.tags) tagSet.add(t)
  return [...tagSet].map((tag) => ({
    params: { tag },
    props: {
      tag,
      posts: posts
        .filter((p) => p.data.tags.includes(tag))
        .sort((a, b) => {
          const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
          const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
          return bd - ad
        })
    }
  }))
}

const { tag, posts } = Astro.props
---

<Layout title={\`#\${tag}\`} current="tags">
  <section class="${EpColumnClasses.Container}">
    <div class="${EpColumnClasses.SectionHead}">
      <h2 class="${EpColumnClasses.SectionHeadTitle}">#{tag}</h2>
      <span class="${EpColumnClasses.SectionHeadAside}">{posts.length}</span>
    </div>
    <ColumnPostFeed posts={posts} catalog={posts} mode="archive" />
  </section>
</Layout>
`
    },
    createColumnSearchPageArtifact(lang)
  ]
}
