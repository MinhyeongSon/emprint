# Emprint — Agent Brief (project context)

This document is a **working summary** of Emprint for other agents before they start making changes. It is based on the existing docs in `docs/` and the current implementation in the repository.

## Product intent (from `docs/proposal.md`)

- **Local-first**: user data is always local and portable (open in VSCode, edit files manually, clone anywhere).
- **Git-native**: the workspace is a git repository; git is the backend.
- **Cloud-optional**: MVP allowed to use GitHub OAuth/API, but no proprietary backend datastore.
- **Workspace is the product; the app is the runtime**.

UI target: a hybrid feel between **Obsidian / VSCode / Notion / GitHub Desktop**, with emphasis on ownership, focus, density, and keyboard workflows.

## Repository boundaries (from `docs/architecture.md`)

- `shared/`: typed domain types + typed IPC contract used by preload/main/renderer.
- `core/`: runtime abstractions (commands, workspace/runtime, git contracts, document adapter concepts).
- `features/blog/`: MVP workspace templates + frontmatter-derived post summary logic.
- `apps/desktop/`: Electron shell (security boundary, preload IPC, infrastructure adapters) + renderer UI.

## Current runtime + IPC shape (implementation reality)

### Renderer ↔ Main communication

- `apps/desktop/src/preload/index.ts` exposes `window.emprint` (typed by `shared/src/ipc.ts`).
- `apps/desktop/src/main/ipc.ts` implements handlers.

Key IPC groups (channel strings live in `shared/src/ipc.ts` as `ipcChannels`):

- **system**: `system:get-runtime-info`, `system:select-directory`
- **github**: OAuth client get/set, device-flow auth (`auth:start` / `auth:poll`), status, logout, `repo:create`
- **workspace**: `workspace:initialize`, `workspace:open` (mount an existing workspace from disk)
- **git**: `git:initial-sync`, `git:detect`
- **catalog**: list/add/remove/update workspace entries shown in the Hub
- **posts**: `posts:list` (reads `posts/` or `drafts/`), `post:read`, `post:save`
- **workspaceSrc** (site code under `src/`): `workspace:src:list-tree`, `workspace:src:read`, `workspace:src:save`
- **window**: minimize, toggle-maximize, is-maximized, close

### Workspace initialization and mount

- **Wizard / create**: `window.emprint.workspace.initialize(config)` bootstraps a new folder and writes artifacts via the blog template adapter (`features/blog`).
- **Hub / open existing**: `window.emprint.workspace.open({ localDirectory })` mounts a workspace that already exists on disk.

Starter post content for `minimal-blog` has been minimized (no “folder structure” bullets).

## Current UI (implementation reality)

### High-level flow

- `apps/desktop/src/renderer/src/app.tsx` chooses:
  - Wizard (`WorkspaceWizard`) when mode is `wizard`
  - Workspace shell (`AppShell`) when mode is `workspace`

### Shell layout

- Sidebar sections (keyboard **1–5**): **Posts / Drafts / Assets / Implement / Settings** (`Implement` = site code under `src/`; the **Assets** section is still mostly placeholder UI).
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

### Implement surface (`src/`)

`apps/desktop/src/renderer/src/features/implement/implement-surface.tsx`:

- Left: file tree for the workspace **`src/`** directory (via `window.emprint.workspaceSrc.listTree()`).
- Right: **Monaco Editor** (`@monaco-editor/react`) with read/save through `workspaceSrc.read` / `workspaceSrc.save` (⌘/Ctrl+S).
- Main process resolves paths under `src/` only; missing `src/` yields an empty directory node.

If the UI shows **“Workspace source API unavailable”**, the renderer did not see `window.emprint.workspaceSrc` (almost always a **stale preload** after IPC/preload changes). **Fully quit the Electron app and run `npm run dev` again** so `out/preload/index.cjs` reloads.

## Design direction (from `docs/emprint-design-docs/*`)

- **Mood**: warm dark tones, quiet focus, “traces/embers/archives” feel.
- **Motion**: subtle fades, restrained transitions; avoid playful/bouncy movement.
- **Density**: professional density; avoid mobile-first whitespace bloat.
- **Keyboard-first**: command palette + shortcuts are core surfaces.

## Known gaps / next steps (important)

### GitHub auth (Wizard / Hub)

**GitHub Device Flow** is implemented end-to-end (IPC in main, UI in wizard/hub, MVP token JSON under `app.getPath('userData')`). Remaining polish: dedicated logout/revoke UX in settings, OS keychain storage, and scope/edge-case hardening (see `docs/ROADMAP_MVP_GITHUB_PAGES.md`).

### Editor abstraction (per `docs/proposal.md`)

Even though TipTap is used in the UI, the architecture goal is to remain **editor-agnostic** via a document adapter abstraction in `core/`. Current implementation writes markdown directly in renderer/main; future refactor should move conversions behind `core` adapters.

### File watching / derived caches

Docs recommend: filesystem events → queue → normalization → runtime updates. Current implementation reads directories on demand; no chokidar service yet.

## Quick “how to run”

From repo root:

- `npm install` (runs **`patch-package`** via `postinstall`: patches `vite-plugin-monaco-editor` so dev server works on newer Node.js where `fs.rmdirSync(..., { recursive })` was removed)
- `npm run dev`
- `npm run typecheck`

(`package.json` runs `electron-vite` from `apps/desktop` and unsets `ELECTRON_RUN_AS_NODE`.)

