# Architecture Notes

Product purpose and tone (anthologies, commit-as-trace metaphor, brand constraints) are documented in [`latest/emprint-philosophy.md`](latest/emprint-philosophy.md) and [`latest/emprint-brand-system.md`](latest/emprint-brand-system.md). This file stays limited to **codebase boundaries and technical evolution**.

## Runtime first

The desktop shell is intentionally thin. Core behavior lives behind the workspace runtime, command registry, provider abstractions, and template adapters so the app can expand into creator, developer, and AI-native workspaces without rewriting the foundation.

## Boundaries

- `shared` owns typed IPC contracts and domain types used by preload, main, and renderer.
- `core` owns runtime abstractions: commands, filesystem event queue, workspace bootstrapper, document adapters, git contracts, and indexing interfaces.
- `features/blog` owns MVP-specific workspace templates and frontmatter-derived post summaries.
- `apps/desktop` owns Electron security boundaries, infrastructure adapters, and the UI shell (e.g. posts authoring in TipTap, **Implement** surface for workspace `src/` via Monaco + typed `workspaceSrc` IPC).

## Source of truth

- Markdown files in the workspace are canonical.
- `.workspace/` is reserved for derived metadata, caches, indexes, and future AI artifacts.
- Git repositories remain portable and editable outside Emprint.

## File event strategy

The scaffold includes a queue and normalization layer so future chokidar integration can flow through:

```txt
Filesystem Event
-> Event Queue
-> Workspace Event Normalizer
-> Runtime Service / State Update
```

## Next implementation steps

1. Add chokidar-backed runtime services and workspace catalog refresh.
2. Harden GitHub remote flows (clone, token storage, org edge cases) on top of the existing Device Flow + repo-create MVP.
3. Introduce a TipTap adapter that converts through the document abstraction instead of owning persistence (Monaco for `src/` should follow the same pattern over time).
4. Evolve the command palette toward a central command registry (palette exists; registry wiring is incremental).
5. Introduce a rebuildable SQLite indexing cache for search and AI retrieval.
