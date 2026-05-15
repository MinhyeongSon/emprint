# Architecture Notes

Product purpose and tone (anthologies, commit-as-trace metaphor, brand constraints) are documented in [`latest/emprint-philosophy.md`](latest/emprint-philosophy.md) and [`latest/emprint-brand-system.md`](latest/emprint-brand-system.md). **Planned product architecture** (templates, formats, anthology identity, doc automation) is in [`latest/emprint-added-plan.md`](latest/emprint-added-plan.md). This file stays limited to **codebase boundaries and technical evolution**.

*Last reconciled with the repository: 2026-05-15.*

## Runtime first

The desktop shell is intentionally thin. Long-term behavior should live behind a workspace runtime, command registry, provider abstractions, and template adapters so the app can expand into creator, developer, and AI-native workspaces without rewriting the foundation. That runtime layer is **specified** in [`proposal.md`](proposal.md) but **not extracted** into a `core/` package yet.

## Boundaries (as implemented today)

| Area | Location | Responsibility |
|------|----------|----------------|
| **Shared contracts** | `shared/` | Typed IPC (`ipc.ts`), domain types, validation, GitHub remote helpers |
| **Electron main** | `apps/desktop/src/main/` | IPC handlers, git (`simple-git`), filesystem gateways, workspace bootstrap, site generators, local Astro dev server |
| **Preload** | `apps/desktop/src/preload/` | `window.emprint` bridge |
| **Renderer** | `apps/desktop/src/renderer/src/` | Wizard, Hub, shell, feature surfaces (posts, assets, design, imprint) |

Concrete main-process modules:

- **Workspace lifecycle**: `main/workspace/` (bootstrapper, template, starter post, path helpers)
- **Post summaries**: `main/workspace/starter-post.ts` (`parsePostSummary`), `main/ipc.ts` (`summarizeMarkdown` for `posts:list`)
- **Site scaffolds**: `main/site-generation/` (Column + Showcase Astro generators, registry)
- **Git / GitHub**: `main/infrastructure/`, session + catalog JSON under Electron `userData`
- **Local preview**: `main/site-dev-server.ts` (`npm install` + `astro dev` on port 4321)

There is **no** top-level `core/` or `features/blog/` directory in this repo yet.

## Source of truth

- Markdown files in the workspace are canonical.
- `.workspace/` is reserved for derived metadata, caches, indexes, and future AI artifacts.
- Git repositories remain portable and editable outside Emprint.

## File event strategy

The scaffold in the proposal includes a queue and normalization layer so future chokidar integration can flow through:

```txt
Filesystem Event
-> Event Queue
-> Workspace Event Normalizer
-> Runtime Service / State Update
```

Today the app **reads directories on demand** (posts list, assets, `src/` tree). No chokidar-backed service is wired.

## Next implementation steps (MVP / platform)

1. Extract a `core/` package (runtime, commands, document adapters, indexing interfaces) without breaking `shared` IPC boundaries.
2. Add chokidar-backed runtime services and workspace catalog refresh.
3. Harden GitHub remote flows (clone from Hub, pull, keychain token storage, org edge cases) on top of the existing Device Flow + repo-create MVP.
4. Introduce a TipTap adapter that converts through the document abstraction instead of owning persistence (Monaco for `src/` should follow the same pattern).
5. Evolve the command palette toward a central command registry (palette exists; registry wiring is incremental).
6. Introduce a rebuildable SQLite indexing cache for search and AI retrieval.
7. Poll GitHub Actions / Pages for deploy status (local Astro preview exists; remote deploy observability does not).

## Planned evolution (`emprint-added-plan`)

### Workspace layout: content vs theme

Today MVP workspaces use `posts/`, `drafts/`, `assets/`, `src/` (Astro site). The added plan targets explicit separation:

```txt
workspace/
  content/     # writing, images, metadata — stable across theme changes
  theme/       # layouts, styles, typography, motion, Astro presentation
  assets/
  config/
```

Theme replacement should preserve `content/` and format semantics while swapping presentation under `theme/` (and related `src` regions). Design’s Template mode is a **stepping stone** (global CSS presets), not the full installable-theme system.

### Semantic presentation layer

Themes should compose **semantic components** (per format), not monolithic skins. Examples from the plan:

| Format | Example components |
|--------|-------------------|
| Column | `ArticleHeader`, `ArticleMeta`, `ArticleBody`, `ReadingProgress` |
| Memoir | `MemoirTimeline`, `MemoryCard`, `NarrativeSection` |
| Dictionary | `DictionaryReference`, `EntryList`, `CrossLinkPanel` |
| Fragments | `FragmentViewer`, `ArchiveShelf`, `FragmentPreview` |
| Book | `BookPage`, `ChapterNavigation`, `FootnotePanel`, `PageTransitionLayer` |

Class naming should be semantic (`.memoir-entry`, `.book-chapter`), not positional/visual, so themes and AI-assisted restyling stay safe.

### Format vs publication identity

Two axes (see added plan):

| Axis | Who defines | Controls |
|------|-------------|----------|
| **Format** (internal) | Emprint | `column`, `memoir`, `dictionary`, `fragments`, `book` — layout rules, metadata schema, editor UX |
| **Publication slug** (external) | Creator | `observatory`, `letters`, `archive` — subdomain, anthology nav, public branding |

Avoid mapping format names directly to domains (`column.example.com`). GitHub Pages remains repo-based (`user.github.io/repo`); custom domains / subdomains are encouraged for anthology atmosphere.

### Anthology layer (future)

Hub/catalog may evolve into anthology settings: connected publications, subdomain suggestions, shared navigation, cross-publication identity — **without** breaking per-repo independence or local-first files.

### Book format (future)

Independent web publication format: manuscript in Git, immersive static reading on Pages, optional later privatization of repo/Pages while creator retains ownership. Not a web-novel feed or marketplace.

### Documentation automation (tooling)

Separate from product runtime: Playwright scenario scripts, ffmpeg/gifski outputs, optional Starlight/VitePress docs site, and a fixed `demo-anthology/` workspace for reproducible tutorial assets. Detailed checklist: [`ROADMAP_MVP_GITHUB_PAGES.md`](ROADMAP_MVP_GITHUB_PAGES.md#extended-product-plan-emprint-added-plan).
