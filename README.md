# Emprint

Emprint is a local-first, Git-native workspace platform built on Electron. The first vertical is a Markdown publishing workspace (GitHub-oriented MVP), but the codebase is built as a reusable **workspace runtime**, not a single-purpose editor.

Why it exists and how it should *feel* (traces, anthologies, commit metaphor, quiet archive) are written in [`docs/latest/emprint-philosophy.md`](docs/latest/emprint-philosophy.md) and [`docs/latest/emprint-brand-system.md`](docs/latest/emprint-brand-system.md). Architecture and MVP requirements live in [`docs/proposal.md`](docs/proposal.md). **Planned extensions** (template system, Book format, anthology identity, doc automation): [`docs/latest/emprint-added-plan.md`](docs/latest/emprint-added-plan.md). Current implementation status: [`docs/AGENT_BRIEF.md`](docs/AGENT_BRIEF.md) and [`docs/ROADMAP_MVP_GITHUB_PAGES.md`](docs/ROADMAP_MVP_GITHUB_PAGES.md).

## Principles

- Local files and Markdown remain the source of truth.
- Git is treated as the backend, with provider abstractions for future remotes.
- The desktop app acts as runtime, orchestration, and UI.
- Editor integrations are adapters, not the center of the system.

## Structure

```txt
apps/desktop/     Electron main, preload, renderer (features/, components/)
shared/           Cross-process IPC contracts, types, validation
docs/             Proposal, architecture, agent brief, design kit, latest/ (philosophy, brand, added plan)
scripts/          Dev/build helpers (electron-vite runner, icons)
build/            Packaged app assets
```

Planned packages from the original proposal (`core/`, `features/blog/`) are **not present yet**; workspace bootstrap, post frontmatter parsing, git adapters, and site generators live under `apps/desktop/src/main/` today. See [`docs/architecture.md`](docs/architecture.md).

## Getting started

```bash
npm install
npm run dev
```

The app starts with a **Wizard** (Git + GitHub + workspace root), then a **Hub** (catalog of anthologies/workspaces), then the workspace shell (posts, drafts, assets, design, imprint, settings).

Packaging: `npm run dist` (or `dist:mac` / `dist:win` / `dist:linux`). Typecheck: `npm run typecheck`.
