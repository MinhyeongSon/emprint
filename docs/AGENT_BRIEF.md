# Emprint — Agent Brief (project context)

This document is a **working summary** of Emprint for other agents before they start making changes. It is based on the existing docs in `docs/` and the current implementation in the repository.

*Last reconciled with the codebase: 2026-05-15. Planned extensions from `docs/latest/emprint-added-plan.md` incorporated below.*

## Product narrative (canonical)

Read before writing user-facing copy or shaping UX tone:

- `docs/latest/emprint-philosophy.md` — purpose, anthologies, commit philosophy, anti-patterns.
- `docs/latest/emprint-brand-system.md` — voice, visual direction, landing structure, AI constraints, naming/mark.
- `docs/latest/emprint-added-plan.md` — **planned** template/theme architecture, publication formats (incl. Book), anthology identity vs format naming, documentation automation (not implemented yet).

## Product intent (from `docs/proposal.md` + philosophy docs)

- **Local-first**: user data is always local and portable (open in VSCode, edit files manually, clone anywhere).
- **Git-native**: the workspace is a git repository; git is the backend.
- **Cloud-optional**: MVP allowed to use GitHub OAuth/API, but no proprietary backend datastore.
- **Workspace is the product; the app is the runtime**.

UI target: a hybrid feel between **Obsidian / VSCode / Notion / GitHub Desktop**, with emphasis on ownership, focus, density, and keyboard workflows—while staying aligned with the **quiet, archival, non-feed** direction in `docs/latest/*` (deliberate pacing, not engagement-driven UI).

## Repository boundaries

### As implemented (monorepo)

- **`shared/`**: typed domain types + typed IPC contract (`ipc.ts`, `types.ts`, `validation.ts`, `github-remote.ts`, `path-safety.ts`).
- **`apps/desktop/`**: Electron shell (main, preload, renderer). All MVP runtime logic currently lives here—not in separate `core/` or `features/` packages.

Key main-process areas:

| Concern | Path |
|---------|------|
| IPC handlers | `apps/desktop/src/main/ipc.ts` |
| Workspace bootstrap | `apps/desktop/src/main/workspace/` |
| Post frontmatter parsing | `apps/desktop/src/main/workspace/starter-post.ts`, `ipc.ts` |
| Git adapters | `apps/desktop/src/main/infrastructure/` |
| Site generators (Astro) | `apps/desktop/src/main/site-generation/` |
| Local site dev preview | `apps/desktop/src/main/site-dev-server.ts` |

### Planned (proposal, not in tree yet)

- **`core/`**: runtime abstractions (commands, workspace runtime, git contracts, document adapter concepts).
- **`features/blog/`** (or similar): extract blog-specific templates and post summary logic from main.

See `docs/architecture.md` for the boundary table and evolution steps.

## Current runtime + IPC shape (implementation reality)

### Renderer ↔ Main communication

- `apps/desktop/src/preload/index.ts` exposes `window.emprint` (typed by `shared/src/ipc.ts`).
- `apps/desktop/src/main/ipc.ts` implements handlers.

Key IPC groups (channel strings live in `shared/src/ipc.ts` as `ipcChannels`):

- **system**: `system:get-runtime-info`, `system:select-directory`
- **github**: OAuth client get/set, device-flow auth (`auth:start` / `auth:poll`), status, logout, `repo:create`
- **workspace**: `workspace:initialize`, `workspace:open` (mount an existing workspace from disk)
- **git**: `git:initial-sync`, `git:detect`, `git:working-tree`, `git:publish`, `git:log`
- **catalog**: `catalog:list`, `catalog:add`, `catalog:remove` (Hub anthology list; optional remote delete)
- **posts**: `posts:list` (reads `posts/` or `drafts/`), `post:read`, `post:save`, `posts:move`, `posts:delete`
- **workspaceSrc** (site code under `src/`): list-tree, read, save, create, rename, delete; aliases `openSitePreview` / `stopSitePreview`; `workspace:monaco:typescript` for Design → Code typings
- **siteDev**: `site:dev:stop`, `site:dev:status`, `site:dev:open-preview` (Astro dev server on `http://localhost:4321/`)
- **assets**: `assets:save-image`, `assets:list-images`, `assets:delete-image`
- **window**: minimize, toggle-maximize, is-maximized, close

### Workspace initialization and mount

- **Wizard / create**: `window.emprint.workspace.initialize(config)` bootstraps a new folder: manifest, posts/drafts/assets, **Astro site** (Column or Showcase generator), **`.github/workflows/deploy-astro-gh-pages.yml`**, starter post, `.gitignore` conventions.
- **Hub / open existing**: `window.emprint.workspace.open({ localDirectory })` mounts a workspace that already exists on disk.
- **Site kinds**: `SiteProjectKind` = `'column' | 'showcase'`. Hub UI only allows **Column** today; Showcase generator exists but Hub disables it.

Starter post content for the blog template has been minimized (no “folder structure” bullets).

### Publish + Imprint

- **Publish** (sidebar footer): opens a dialog that calls `git:working-tree()` and `git:publish({ message, push })` (stage all → commit → optional HTTPS push with stored session). Blocked while the active post editor has unsaved in-memory changes.
- **Imprint** (sidebar section): `git:log()` for a lane-style commit / “publish mark” history.

## Current UI (implementation reality)

### App modes

- `apps/desktop/src/renderer/src/app.tsx` drives three modes via Zustand (`mode`):
  - **`wizard`**: first-run Git + GitHub + workspace root (`WorkspaceWizard`)
  - **`hub`**: catalog of workspaces / anthologies (`WorkspaceHub`)
  - **`workspace`**: editor shell (`AppShell`)

Locales: **`en`** and **`ko`**. Themes: **`dark`**, **`light`**, **`warm`** (Settings + titlebar).

### Shell layout

- Sidebar sections (keyboard **1–6**): **Posts / Drafts / Assets / Design / Imprint / Settings**
  - **Design** = site styling + `src/` code (see below)
  - **Imprint** = `git:log` timeline
  - **Assets** = image library under `assets/images/`
  - **Settings** = in-shell keyboard hints; full GitHub/theme/root controls live in the global Settings overlay (titlebar / command palette), not only this section panel
- **Custom frameless titlebar** (window controls via IPC), with:
  - left title: current document title (adds `*` when dirty)
  - center badge: active section
  - right: command palette button + language switcher + window buttons
- **Command palette**: **Ctrl/Cmd+K** toggles the palette (registered in `app.tsx`).

Scrolling policy:

- Body scroll is disabled; only the main content container (and sidebar nav) scrolls.
- Scrollbars are styled with the accent orange.

### Posts surfaces

`apps/desktop/src/renderer/src/features/posts/posts-surface.tsx` provides 3 “surfaces” driven by Zustand state:

- **List**: shows post summaries from `posts:list` (title/date/tags/draft).
- **Viewer**: markdown viewer (frontmatter stripped before render). Robust to malformed YAML frontmatter.
- **Editor**:
  - Body is edited in **TipTap** (`components/editor/tiptap-editor.tsx`), stored as markdown via `tiptap-markdown`.
  - Title + tags + draft are edited as frontmatter fields.
  - Tags are currently a **simple comma-separated input** (no chips).
  - Save writes markdown with frontmatter using `gray-matter.stringify()`.

### Design surface (`src/` + site styling)

`apps/desktop/src/renderer/src/features/design/design-surface.tsx` (replaces the earlier “Implement” naming):

Two modes (session-persisted in `sessionStorage`):

1. **Template** (`template-mode-panel.tsx`): visual presets (warm / dark / light) written to `src/styles/global.css` via `workspaceSrc.save`.
2. **Code** (`code-mode-panel.tsx`): file tree for workspace **`src/`** + **Monaco** with workspace TypeScript config (`workspaceSrc.getMonacoTypescript()`), read/save/create/rename/delete under `src/` (⌘/Ctrl+S).

Additional Design affordances:

- **Open site preview**: spawns local Astro dev server (`site:dev:open-preview` → `npm install` + `astro dev`, default `http://localhost:4321/`), progress UI via `design-preview-progress.tsx`.
- **AI prompt** (`design-ai-prompt-dialog.tsx`): builds a copy-paste prompt for external AI tools to edit the Astro site (does not call an LLM API from the app).

If the UI shows **“Workspace source API unavailable”**, the renderer did not see `window.emprint.workspaceSrc` (almost always a **stale preload** after IPC/preload changes). **Fully quit the Electron app and run `npm run dev` again** so `out/preload/index.cjs` reloads.

### Hub

`apps/desktop/src/renderer/src/features/hub/workspace-hub.tsx`:

- Lists catalog entries; create workspace (Column site, public GitHub repo, optional initial push).
- Optional pasted HTTPS remote when not auto-creating (init + `origin` on empty folder, not `git clone`). **Hub clone is intentionally unsupported** so imported repos cannot break Emprint’s template/component layout.
- Remove workspace from catalog with optional **remote repo delete** (`catalog:remove` + `delete_repo` scope).
- Shows resolved **GitHub Pages URL** per entry when GitHub is connected (`resolveGithubPagesUrl`).

## Design direction (`docs/emprint-design-docs/*` + `docs/latest/emprint-brand-system.md`)

- **Mood**: warm dark tones, quiet focus, traces / archive / terminal-journal feel (see brand system for color and texture intent).
- **Motion**: subtle fades, restrained transitions; avoid playful/bouncy movement.
- **Density**: professional density; avoid mobile-first whitespace bloat.
- **Keyboard-first**: command palette + shortcuts are core surfaces.

Index entry point: `docs/emprint-design-docs/DESIGN.md`.

## MVP progress snapshot

Full checklist and estimates: `docs/ROADMAP_MVP_GITHUB_PAGES.md`.

| Area | Status |
|------|--------|
| Posts / drafts / TipTap / assets | ✅ In daily use |
| Design (template + code + local preview) | ✅ In daily use |
| GitHub Device Flow + publish + Imprint | ✅ MVP (JSON token store) |
| Workspace bootstrap + Astro + Actions workflow | ✅ Column path |
| Git OS install guides (Wizard) | ✅ Done (no bundled git) |
| Hub clone | 🚫 Won’t implement (template contract) |
| Auto fetch + pull when remote ahead | 📋 Planned |
| Token revoke on logout / quit | ✅ Client Secret required — see ROADMAP |
| Scope review | ⏳ Optional |
| Actions/Pages polling after push | ⏳ Optional — see ROADMAP rationale |

Rough overall completion vs full GitHub Pages journey: **~58–62%** (local preview helps author loop; remote deploy observability still open).

Extended product work (templates, formats, anthology UX, doc automation) is **0% implemented** as specified in `emprint-added-plan.md` — see [Planned extensions](#planned-extensions-emprint-added-plan) below.

## Planned extensions (`emprint-added-plan`)

Canonical spec: `docs/latest/emprint-added-plan.md`. Summary for agents:

### 1. Template system (content ↔ presentation split)

**Goal**: swap visual presentation without breaking content, metadata, or format semantics.

- **Target workspace layout** (not current tree): `content/`, `theme/`, `assets/`, `config/` — content stable; theme replaceable (layouts, styles, Astro presentation components).
- **Semantic components** per format (e.g. Column: `ArticleHeader`, `ArticleBody`; Book: `BookPage`, `ChapterNavigation`) — avoid monolithic HTML skins.
- **Semantic CSS class names** (e.g. `.column-heading`, `.book-chapter`) — not visual names like `.left-panel`.
- **Theme flow**: download → install into workspace → replace `theme/` / style / `src` presentation regions → preserve content → preview → publish.
- **Today**: Design **Template** mode only writes preset CSS to `src/styles/global.css`; full theme packages and safe swap pipeline are **not built**.

### 2. Publication formats (beyond Column / Showcase)

Internal **format** types (drive layout, schema, editor): `column`, `memoir`, `dictionary`, `fragments`, `book`.

- **Book** (planned): web-native independent publication — chapters, page-turn, typography modes, footnotes, ambient motion; static artifact on GitHub Pages, not a feed or marketplace.
- **Today**: `SiteProjectKind` = `column` | `showcase` only; Hub locks to Column. Memoir / Dictionary / Fragments / Book are **design notes only**.

### 3. Anthology & publication identity

Anthology should feel like a **publishing namespace / personal world**, not a folder list.

- **Do not** tie public identity to format names (avoid `column.domain.com`).
- **Separate** internal `format` from user-defined **`publicationSlug`** (e.g. format Column + slug `observatory` → `observatory.minhyeong.dev`).
- Encourage **custom domains** and subdomain organization; each repo stays independent (local-first, portable).
- **Hub today**: catalog + create workspace; no anthology-level domain wiring, shared nav, or publication-slug step in wizard.

### 4. Documentation automation (repo / product docs)

Reduce manual screenshot/video churn for non-developer onboarding.

- **Stack (planned)**: Playwright (UI scenarios), ffmpeg + gifski (GIF/video), docs site (Astro Starlight or VitePress).
- **Structure (planned)**: `docs/scenarios/*.ts` → reproducible flows → `docs/assets/{screenshots,gifs,videos}/`.
- **Demo workspace**: deterministic `demo-anthology/` for stable captures.
- **Today**: no Playwright scenarios or automated doc asset pipeline in this repo.

When implementing any of the above, update `emprint-added-plan.md` only if the spec changes; update this brief and `ROADMAP` checklists when shipping.

## Known gaps / next steps (important)

### Git setup (Wizard)

**Done (guided only):** `git:detect`, platform-specific install commands (Windows winget/choco, macOS xcode-select/brew, Linux apt/dnf/pacman), Retry. **No** bundled git or automated installer — by product decision.

### GitHub auth (Wizard / Hub)

**GitHub Device Flow** is implemented end-to-end (IPC in main, UI in wizard + Settings, MVP token JSON under `app.getPath('userData')`). **Log out**, **window close**, and **app quit** call `performGithubLogout()`: revokes the token on GitHub when **Client Secret** is stored (`github-oauth-client.json` or `EMPRINT_GITHUB_CLIENT_SECRET`), then clears local session. Optional next: **OS keychain**, **scope review**.

### Remote sync (planned)

**fetch + auto pull** when the remote is ahead (e.g. edits on another device). Not implemented yet; see ROADMAP § D.

### Editor abstraction (per `docs/proposal.md`)

Even though TipTap is used in the UI, the architecture goal is to remain **editor-agnostic** via a document adapter abstraction (planned `core/` package). Current implementation writes markdown directly in renderer/main; future refactor should move conversions behind adapters.

### File watching / derived caches

Docs recommend: filesystem events → queue → normalization → runtime updates. Current implementation reads directories on demand; no chokidar service yet.

### `core/` extraction

Post parsing, bootstrap, and git/site logic are concentrated in `apps/desktop/src/main/`. Extracting `core/` and feature packages is the main structural debt called out in `docs/architecture.md`.

## Quick “how to run”

From repo root:

- `npm install` (runs **`patch-package`** via `postinstall`: patches `vite-plugin-monaco-editor` so dev server works on newer Node.js where `fs.rmdirSync(..., { recursive })` was removed)
- `npm run dev`
- `npm run typecheck`
- `npm run dist` / `dist:mac` / `dist:win` / `dist:linux` for packaged builds

(`package.json` runs `scripts/run-electron-vite.mjs`, which spawns `electron-vite` from `apps/desktop` with `ELECTRON_RUN_AS_NODE` removed from the environment.)
