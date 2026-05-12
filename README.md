# Emprint

Emprint is a local-first, Git-native workspace platform built on Electron. This scaffold starts with a creator-oriented blog MVP, but the architecture is shaped around a reusable workspace runtime rather than a single-purpose editor.

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
docs           Architecture notes
```

## Getting started

```bash
npm install
npm run dev
```

The renderer starts with a workspace wizard that creates an Emprint-compatible directory structure, starter Markdown, and workspace metadata while keeping the filesystem portable outside the app.
