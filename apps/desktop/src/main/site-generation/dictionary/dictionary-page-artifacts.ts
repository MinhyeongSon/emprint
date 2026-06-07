import type { WorkspaceArtifact } from '@emprint/core'
import { EpDictionaryClasses } from './contract'
import { createDictionarySearchPageArtifact } from './dictionary-search-artifacts'

const DICTIONARY_PAGE_SYNC_PATHS = new Set([
  'src/pages/index.astro',
  'src/pages/index/index.astro',
  'src/pages/knowledge/index.astro',
  'src/pages/knowledge/[...slug].astro',
  'src/pages/index/[...indexPath].astro',
  'src/pages/tags/[tag].astro',
  'src/pages/search/index.astro',
  'src/lib/topic-graph.ts',
  'src/components/TopicGraph.astro',
  'src/components/AtlasGrid.astro'
])

export function getDictionaryPageTemplateSyncArtifacts(): WorkspaceArtifact[] {
  return createDictionaryPageArtifacts().filter((a) => DICTIONARY_PAGE_SYNC_PATHS.has(a.relativePath))
}

export function createDictionaryPageArtifacts(lang: 'ko' | 'en' = 'en'): WorkspaceArtifact[] {
  return [
    {
      relativePath: 'src/pages/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../layouts/Layout.astro'
import DictionaryKnowledgeFeed from '../components/DictionaryKnowledgeFeed.astro'
import IndexNav from '../components/IndexNav.astro'
import KnowledgeCard from '../components/KnowledgeCard.astro'
import TopicGraph from '../components/TopicGraph.astro'
import AtlasGrid from '../components/AtlasGrid.astro'
import themeFile from '../../config/theme.json'

const all = await getCollection('knowledge', ({ data }) => !data.draft)
const sorted = all.sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})

const rawComposition = themeFile.layoutComposition
const composition =
  rawComposition === 'graph' || rawComposition === 'atlas' || rawComposition === 'reference'
    ? rawComposition
    : 'reference'
const recentLimit = 5
const recent = sorted.slice(0, recentLimit)
const hasMore = sorted.length > recent.length
---

<Layout current="home">
  <section class="${EpDictionaryClasses.Container}">
    {composition === 'graph' ? (
      <>
        <div class="${EpDictionaryClasses.SectionHead}">
          <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Topic graph</h2>
          <a class="${EpDictionaryClasses.SectionHeadLink}" href={\`\${import.meta.env.BASE_URL}index/\`}>Index →</a>
        </div>
        <TopicGraph entries={sorted} />
      </>
    ) : composition === 'atlas' ? (
      <>
        <div class="${EpDictionaryClasses.SectionHead}">
          <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Topic atlas</h2>
          <a class="${EpDictionaryClasses.SectionHeadLink}" href={\`\${import.meta.env.BASE_URL}index/\`}>Browse index →</a>
        </div>
        <AtlasGrid entries={sorted} />
      </>
    ) : (
      <div class="${EpDictionaryClasses.HomeWithIndex}">
        <aside class="${EpDictionaryClasses.HomeWithIndexAside}">
          <IndexNav entries={sorted} variant="sidebar" />
        </aside>
        <div class="${EpDictionaryClasses.HomeWithIndexMain}">
          <div class="${EpDictionaryClasses.SectionHead}">
            <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Topics</h2>
            <a class="${EpDictionaryClasses.SectionHeadLink}" href={\`\${import.meta.env.BASE_URL}index/\`}>Browse index →</a>
          </div>
          <p class="${EpDictionaryClasses.Empty}" style="margin:0 0 1.25rem;text-align:left;">
            Pick a topic from the index, or read recent entries below.
          </p>
          <div class="${EpDictionaryClasses.SectionHead}">
            <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Recent</h2>
            {hasMore ? (
              <a class="${EpDictionaryClasses.SectionHeadLink}" href={\`\${import.meta.env.BASE_URL}knowledge/\`}>All entries →</a>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <div class="${EpDictionaryClasses.Empty}">No knowledge entries yet. Write something in Emprint and publish.</div>
          ) : (
            <ul class="${EpDictionaryClasses.PostList}">
              {recent.map((entry) => (
                <KnowledgeCard post={entry} />
              ))}
            </ul>
          )}
        </div>
      </div>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/knowledge/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import DictionaryKnowledgeFeed from '../../components/DictionaryKnowledgeFeed.astro'
import IndexNav from '../../components/IndexNav.astro'

const posts = (await getCollection('knowledge', ({ data }) => !data.draft)).sort((a, b) => {
  const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
  const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
  return bd - ad
})
---

<Layout title="All entries" current="archive">
  <section class="${EpDictionaryClasses.Container}">
    <div class="${EpDictionaryClasses.HomeWithIndex}">
      <aside class="${EpDictionaryClasses.HomeWithIndexAside}">
        <IndexNav entries={posts} variant="sidebar" />
      </aside>
      <div class="${EpDictionaryClasses.HomeWithIndexMain}">
        <div class="${EpDictionaryClasses.SectionHead}">
          <h2 class="${EpDictionaryClasses.SectionHeadTitle}">All entries</h2>
          <span class="${EpDictionaryClasses.SectionHeadAside}">{posts.length}</span>
        </div>
        {posts.length === 0 ? (
          <div class="${EpDictionaryClasses.Empty}">No knowledge entries yet.</div>
        ) : (
          <DictionaryKnowledgeFeed posts={posts} catalog={posts} mode="archive" />
        )}
      </div>
    </div>
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/knowledge/[...slug].astro',
      content: `---
import { getCollection, render } from 'astro:content'
import type { CollectionEntry } from 'astro:content'
import PostLayout from '../../layouts/PostLayout.astro'
import { normalizeIndexPath } from '../../lib/index-path'

export async function getStaticPaths() {
  const posts = await getCollection('knowledge', ({ data }) => !data.draft)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post }
  }))
}

let { post } = Astro.props as { post?: CollectionEntry<'knowledge'> }

if (!post) {
  const slug = Astro.params.slug
  if (slug) {
    const posts = await getCollection('knowledge', ({ data }) => !data.draft)
    post = posts.find((entry) => entry.id === slug)
  }
}

if (!post) {
  return new Response(null, { status: 404, statusText: 'Not Found' })
}

const { Content } = await render(post)
const index = normalizeIndexPath(String(post.data.index ?? ''))
---

<PostLayout
  title={post.data.title}
  description={post.data.description}
  index={index}
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

const posts = await getCollection('knowledge', ({ data }) => !data.draft)
const counts = new Map<string, number>()
for (const post of posts) {
  for (const tag of post.data.tags) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
}
const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
---

<Layout title="Tags" current="tags">
  <section class="${EpDictionaryClasses.Container}">
    <div class="${EpDictionaryClasses.SectionHead}">
      <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Tags</h2>
      <span class="${EpDictionaryClasses.SectionHeadAside}">{tags.length}</span>
    </div>
    {tags.length === 0 ? (
      <div class="${EpDictionaryClasses.Empty}">No tags yet. Add some in your post frontmatter.</div>
    ) : (
      <ul class="${EpDictionaryClasses.TagRow}" style="padding:0.5rem 0;">
        {tags.map(([tag, count]) => (
          <li>
            <a class="${EpDictionaryClasses.Tag}" href={\`\${import.meta.env.BASE_URL}tags/\${encodeURIComponent(tag)}/\`}>
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
      relativePath: 'src/pages/index/index.astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import IndexNav from '../../components/IndexNav.astro'
import { indexPathToHref, normalizeIndexPath, indexPathPrefixes } from '../../lib/index-path'
import { labelForIndexPath, loadIndexRegistryEntries } from '../../lib/index-registry'

const all = await getCollection('knowledge', ({ data }) => !data.draft)
const registry = loadIndexRegistryEntries()
const topLevel = new Map<string, number>()
for (const entry of registry) {
  const root = entry.path.split('/')[0]
  if (root) topLevel.set(root, topLevel.get(root) ?? 0)
}
for (const entry of all) {
  const idx = normalizeIndexPath(String(entry.data.index ?? ''))
  if (!idx) continue
  const root = indexPathPrefixes(idx)[0]
  if (!root) continue
  topLevel.set(root, (topLevel.get(root) ?? 0) + 1)
}
const topics = [...topLevel.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const base = import.meta.env.BASE_URL
---

<Layout title="Index" current="index">
  <section class="${EpDictionaryClasses.Container}">
    <div class="${EpDictionaryClasses.SectionHead}">
      <h2 class="${EpDictionaryClasses.SectionHeadTitle}">Browse by index</h2>
      <span class="${EpDictionaryClasses.SectionHeadAside}">{topics.length}</span>
    </div>
    {topics.length === 0 ? (
      <div class="${EpDictionaryClasses.Empty}">No index paths yet. Create topics in Emprint Contents, or add an \`index\` field on entries.</div>
    ) : (
      <div class="${EpDictionaryClasses.HomeWithIndex}">
        <aside class="${EpDictionaryClasses.HomeWithIndexAside}">
          <IndexNav entries={all} variant="sidebar" />
        </aside>
        <div class="${EpDictionaryClasses.HomeWithIndexMain}">
          <ul class="${EpDictionaryClasses.PostList}">
            {topics.map(([path, count]) => (
              <li>
                <a class="${EpDictionaryClasses.KnowledgeCard}" href={indexPathToHref(base, path)}>
                  <h3 class="${EpDictionaryClasses.KnowledgeCardTitle}">{labelForIndexPath(path, registry)}</h3>
                  <div class="${EpDictionaryClasses.KnowledgeCardMeta}">
                    <span>{count} {count === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/index/[...indexPath].astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import DictionaryKnowledgeFeed from '../../components/DictionaryKnowledgeFeed.astro'
import IndexNav from '../../components/IndexNav.astro'
import type { CollectionEntry } from 'astro:content'
import { indexPathToHref, isIndexPrefix, normalizeIndexPath, indexPathPrefixes } from '../../lib/index-path'
import { collectRegistryNavPaths, labelForIndexPath, loadIndexRegistryEntries } from '../../lib/index-registry'

export async function getStaticPaths() {
  const all = await getCollection('knowledge', ({ data }) => !data.draft)
  const paths = new Set<string>(collectRegistryNavPaths(loadIndexRegistryEntries()))
  for (const entry of all) {
    const idx = normalizeIndexPath(String(entry.data.index ?? ''))
    if (!idx) continue
    for (const prefix of indexPathPrefixes(idx)) {
      paths.add(prefix)
    }
  }
  return [...paths].map((indexPath) => ({
    params: { indexPath },
    props: {
      indexPath,
      entries: all
        .filter((e) => isIndexPrefix(indexPath, String(e.data.index ?? '')))
        .sort((a, b) => {
          const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
          const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
          return bd - ad
        })
    }
  }))
}

const routeIndexPath = normalizeIndexPath(
  String(Astro.props.indexPath ?? Astro.params.indexPath ?? '')
)

if (!routeIndexPath) {
  return new Response(null, { status: 404, statusText: 'Not Found' })
}

let entries = Astro.props.entries as CollectionEntry<'knowledge'>[] | undefined

if (!entries) {
  const all = await getCollection('knowledge', ({ data }) => !data.draft)
  entries = all
    .filter((e) => isIndexPrefix(routeIndexPath, String(e.data.index ?? '')))
    .sort((a, b) => {
      const ad = (a.data.updatedAt ?? a.data.createdAt)?.getTime() ?? 0
      const bd = (b.data.updatedAt ?? b.data.createdAt)?.getTime() ?? 0
      return bd - ad
    })
}

const label = labelForIndexPath(routeIndexPath, loadIndexRegistryEntries())
---

<Layout title={label} current="index">
  <section class="${EpDictionaryClasses.Container}">
    <div class="${EpDictionaryClasses.HomeWithIndex}">
      <aside class="${EpDictionaryClasses.HomeWithIndexAside}">
        <IndexNav entries={entries} activePath={routeIndexPath} variant="sidebar" />
      </aside>
      <div class="${EpDictionaryClasses.HomeWithIndexMain}">
        <div class="${EpDictionaryClasses.SectionHead}">
          <h2 class="${EpDictionaryClasses.SectionHeadTitle}">{label}</h2>
          <span class="${EpDictionaryClasses.SectionHeadAside}">{entries.length}</span>
        </div>
        {entries.length === 0 ? (
          <div class="${EpDictionaryClasses.Empty}">No entries in this index.</div>
        ) : (
          <ul class="${EpDictionaryClasses.PostList}">
            {entries.map((entry) => (
              <li>
                <a
                  class="${EpDictionaryClasses.KnowledgeCard}"
                  href={\`\${import.meta.env.BASE_URL}knowledge/\${encodeURIComponent(entry.id)}/\`}
                >
                  <h3 class="${EpDictionaryClasses.KnowledgeCardTitle}">{entry.data.title}</h3>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </section>
</Layout>
`
    },
    {
      relativePath: 'src/pages/tags/[tag].astro',
      content: `---
import { getCollection } from 'astro:content'
import Layout from '../../layouts/Layout.astro'
import DictionaryKnowledgeFeed from '../../components/DictionaryKnowledgeFeed.astro'

export async function getStaticPaths() {
  const posts = await getCollection('knowledge', ({ data }) => !data.draft)
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
  <section class="${EpDictionaryClasses.Container}">
    <div class="${EpDictionaryClasses.SectionHead}">
      <h2 class="${EpDictionaryClasses.SectionHeadTitle}">#{tag}</h2>
      <span class="${EpDictionaryClasses.SectionHeadAside}">{posts.length}</span>
    </div>
    <DictionaryKnowledgeFeed posts={posts} catalog={posts} mode="archive" />
  </section>
</Layout>
`
    },
    createDictionarySearchPageArtifact(lang)
  ]
}
