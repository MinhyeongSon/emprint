# Emprint

Emprint is a local-first, Git-native workspace platform built on Electron. The first vertical is a Markdown publishing workspace (GitHub-oriented MVP), but the codebase is built as a reusable **workspace runtime**, not a single-purpose editor.

Why it exists and how it should *feel* (traces, anthologies, commit metaphor, quiet archive) are written in [`docs/latest/emprint-philosophy.md`](docs/latest/emprint-philosophy.md) and [`docs/latest/emprint-brand-system.md`](docs/latest/emprint-brand-system.md). Architecture and MVP requirements live in [`docs/proposal.md`](docs/proposal.md).

## Principles

- Local files and Markdown remain the source of truth.
- Git is treated as the backend, with provider abstractions for future remotes.
- The desktop app acts as runtime, orchestration, and UI.
- Editor integrations are adapters, not the center of the system.

## Structure

```txt
apps/desktop   Electron main, preload, and renderer shell
core           Runtime, commands, workspace, filesystem, git, editor contracts
features/blog  Blog-specific template scaffolding and post parsing
shared         Cross-process IPC contracts and shared types
docs           Proposal, architecture, agent brief, design kit, `latest/` philosophy & brand
```

## Getting started

```bash
npm install
npm run dev
```

The renderer starts with a workspace wizard that creates an Emprint-compatible directory structure, starter Markdown, and workspace metadata while keeping the filesystem portable outside the app.
