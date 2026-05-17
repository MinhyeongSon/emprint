# Emprint — Agent Brief (project context)

This document is a **working summary** of Emprint for other agents before they start making changes. It is based on the existing docs in `docs/` and the current implementation in the repository.

*Last reconciled with the codebase: 2026-05-15.*

**Doc map:** [`PRODUCT.md`](PRODUCT.md) (philosophy, brand, Imprint model, extended plan) · [`ROADMAP.md`](ROADMAP.md) (delivery status) · [`DESIGN.md`](DESIGN.md) (UI kit) · [`proposal.md`](proposal.md) (engineering contract)

## Product narrative

Read [`PRODUCT.md`](PRODUCT.md) before user-facing copy or UX tone — especially Part 1 (philosophy), Part 2 (brand), Part 3 (Draft vs Imprint).

## Product intent (from `docs/proposal.md` + philosophy docs)

- **Local-first**: user data is always local and portable (open in VSCode, edit files manually, clone anywhere).
- **Git-native**: the workspace is a git repository; git is the backend.
- **Cloud-optional**: MVP allowed to use GitHub OAuth/API, but no proprietary backend datastore.
- **Workspace is the product; the app is the runtime**.

UI target: a hybrid feel between **Obsidian / VSCode / Notion / GitHub Desktop**, with emphasis on ownership, focus, density, and keyboard workflows—while staying aligned with the **quiet, archival, non-feed** direction in `PRODUCT.md` (deliberate pacing, not engagement-driven UI).

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

The desktop shell stays thin; long-term behavior should move behind a workspace runtime, command registry, and template adapters ([`proposal.md`](proposal.md)). That `core/` layer is **not extracted** yet.

### Source of truth

- Markdown in the workspace is canonical; `.workspace/` is for derived metadata and caches.
- Git repos stay portable and editable outside Emprint.

### State & time (Draft vs Imprint)

See [`PRODUCT.md` — Part 3](PRODUCT.md#part-3--state--time-model). Today: `git:working-tree`, `git:publish`, Imprint lane UI via `git:log`. Rollback and Reset draft are planned ([`ROADMAP.md`](ROADMAP.md) § F).

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

### Publish + Imprint (state & time model)

Product spec: [`PRODUCT.md` — Part 3](PRODUCT.md#part-3--state--time-model).

Emprint exposes **two layers** to users — not Git:

| Layer | Meaning | UI today |
|-------|---------|----------|
| **Working State** (Draft layer) | Uncommitted edits across the workspace | Dirty titlebar `*`, Publish dialog via `git:working-tree` |
| **Imprint** (Published narrative) | Linear timeline of publish events | Imprint sidebar — lane UI from `git:log()` |

User verbs: **write** → Working State; **publish** → new Imprint entry; **go back** → rollback to a prior Imprint (📋 planned); **reset** → discard uncommitted draft (📋 planned). No branches, merges, or commit-hash UI in the product model.

- **Publish** (sidebar footer): `git:working-tree()` + `git:publish({ message, push })` (stage all → commit → HTTPS push). Blocked while the active post editor has unsaved in-memory changes.
- **Imprint** (sidebar section): read-only publish timeline; **planned** — select an entry to roll back Working State without deleting history.

Note: sidebar **Drafts** = posts with `draft: true` in frontmatter, not the Working State layer.

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
  - **Imprint** = publish timeline (`git:log` under the hood); rollback UI planned per [PRODUCT §3](PRODUCT.md#part-3--state--time-model)
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

## Design direction

- **Mood / voice**: [`PRODUCT.md` — Part 2](PRODUCT.md#part-2--brand-system)
- **Tokens, layout, interaction**: [`DESIGN.md`](DESIGN.md)
- **Motion**: subtle fades, restrained transitions; avoid playful/bouncy movement
- **Density**: professional; avoid mobile-first whitespace bloat
- **Keyboard-first**: command palette + shortcuts are core surfaces

## MVP progress snapshot

Full checklist and estimates: [`ROADMAP.md`](ROADMAP.md).

| Area | Status |
|------|--------|
| Posts / drafts / TipTap / assets | ✅ In daily use |
| Design (template + code + local preview) | ✅ In daily use |
| GitHub Device Flow + publish + Imprint timeline | ✅ MVP (JSON token store) |
| Imprint rollback + Reset draft | 📋 [PRODUCT §3](PRODUCT.md#part-3--state--time-model) |
| Workspace bootstrap + Astro + Actions workflow | ✅ Column path |
| Git OS install guides (Wizard) | ✅ Done (no bundled git) |
| Hub clone | 🚫 Won’t implement (template contract) |
| Auto fetch + pull when remote ahead | 📋 Planned |
| Token revoke on logout / quit | ✅ Client Secret required — see ROADMAP |
| Scope review | ⏳ Optional |
| Actions/Pages polling after push | ⏳ Optional — see ROADMAP rationale |

Rough overall completion vs full GitHub Pages journey: **~58–62%** (local preview helps author loop; remote deploy observability still open).

Post-MVP product work (templates, Book format, anthology identity, doc automation) is **0% implemented** — spec in [`PRODUCT.md` — Part 4](PRODUCT.md#part-4--extended-plan); status tables in [`ROADMAP.md` — Extended plan](ROADMAP.md#extended-product-plan).

## Architecture — next steps

1. Extract `core/` (runtime, commands, document adapters) without breaking `shared` IPC.
2. Chokidar-backed file events → queue → normalizer → runtime (today: read directories on demand).
3. Harden GitHub flows (keychain, org edge cases) on Device Flow + repo-create MVP.
4. TipTap / Monaco behind document adapters ([`proposal.md`](proposal.md)).
5. Command registry behind the existing palette.
6. SQLite indexing cache for search / AI retrieval.
7. Poll GitHub Actions / Pages after publish ([`ROADMAP.md`](ROADMAP.md)).

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

Post parsing, bootstrap, and git/site logic are concentrated in `apps/desktop/src/main/`. Extracting `core/` is the main structural debt ([`proposal.md`](proposal.md)).

## Quick “how to run”

From repo root:

- `npm install` (runs **`patch-package`** via `postinstall`: patches `vite-plugin-monaco-editor` so dev server works on newer Node.js where `fs.rmdirSync(..., { recursive })` was removed)
- `npm run dev`
- `npm run typecheck`
- `npm run dist` / `dist:mac` / `dist:win` / `dist:linux` for packaged builds

(`package.json` runs `scripts/run-electron-vite.mjs`, which spawns `electron-vite` from `apps/desktop` with `ELECTRON_RUN_AS_NODE` removed from the environment.)
