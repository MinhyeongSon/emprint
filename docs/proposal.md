Project Name: Emprint

Emprint is a Local-First, Git-Native workspace platform designed to preserve and evolve a user's thoughts, code, writing, and creative footprints through portable, file-based workflows.

## Canonical product narrative

Product narrative, brand, Draft vs Imprint, and post-MVP plans: [`docs/PRODUCT.md`](PRODUCT.md).

This file is the **engineering contract** only. Delivery status: [`docs/ROADMAP.md`](ROADMAP.md). Implementation map: [`docs/AGENT_BRIEF.md`](AGENT_BRIEF.md).

This document is the **engineering and architecture contract**: stack, security, MVP mechanics, and runtime shape. Where Git, markdown, and history appear here, they should stay aligned with the philosophy docs (for example treating publishing as traces and revisions, not only polished outputs).

# Project Vision

Build a Local-First, Git-Native desktop workspace platform using Electron.

The initial MVP is a GitHub blog authoring application using Markdown.

However, the architecture MUST NOT be designed as a simple blog editor.

The long-term direction is:

- Creator Workspace
- Developer Workspace
- AI Native Workspace

Anthology-shaped content (Memoir, Column, Dictionary, Fragments, Blank) describes how traces are *organized and felt* over time; the MVP blog template is the first concrete slice of that model, not the whole product definition.

This application should evolve into something between:
- Obsidian
- VSCode
- Cursor
- Notion
- GitHub Desktop

Core philosophy:

"Workspace is the Product."
"The App is only the Runtime."

The actual source of truth must always remain:
- local files
- markdown
- git repositories

NOT an internal cloud database.

---

# Core Architecture Philosophy

## 1. Local First

All content must exist locally on the user's filesystem.

The application should function primarily as:
- GUI
- runtime
- orchestration layer

The app should NEVER own user data in a proprietary format.

The actual workspace should remain portable outside the application.

The user must be able to:
- open the repository directly in VSCode
- clone it elsewhere
- edit files manually
- backup via git

without breaking the application.

---

## 2. Git Native

The workspace itself IS a git repository.

The application should internally support:
- clone
- pull
- commit
- push
- branch awareness

Git is the backend.
GitHub is only one possible remote provider.

Design the architecture assuming future support for:
- GitHub
- GitLab
- Gitea
- Bitbucket
- self-hosted git

Create provider abstractions.

Example:

```ts
interface GitProvider {
  clone(): Promise<void>
  pull(): Promise<void>
  push(): Promise<void>
}
```

---

## 3. Cloud Optional

The MVP must work without a custom backend server.

Allowed external dependencies:
- GitHub OAuth
- GitHub API
- GitHub Pages

Everything else should work locally.

Offline-first behavior is preferred.

---

# Workspace Philosophy

The application must revolve around "Workspace Runtime" concepts.

The app itself is not the center.

The workspace is.

Example:

```txt
/workspace
  /posts
  /drafts
  /assets
  /.workspace
  /config
```

The `.workspace` directory may contain:
- caches
- metadata
- indexes
- AI embeddings
- workspace settings

However:

Markdown files remain the primary source of truth.

---

# Critical Design Requirement

DO NOT tightly couple the application to TipTap.

TipTap is only a UI adapter.

The actual architecture must introduce a document abstraction layer.

Example:

```ts
interface DocumentAdapter {
  load(): Promise<DocumentNode>
  save(doc: DocumentNode): Promise<void>

  exportMarkdown(): string
  importMarkdown(markdown: string): DocumentNode
}
```

This is critical because future editors may include:
- Monaco
- AI editors
- block editors
- collaborative editors

The internal architecture must remain editor-agnostic.

---

# Markdown Strategy

Use a Hybrid Markdown architecture.

Markdown files remain user-visible and git-friendly.

However, advanced workspace metadata may exist separately.

Example:

```txt
/posts/hello-world.md
/.workspace/posts/hello-world.meta.json
```

Do NOT implement a fully proprietary internal JSON document system.

Git readability and portability are extremely important.

---

# Runtime Architecture

The application should introduce a Workspace Runtime layer.

Example:

```ts
class WorkspaceRuntime {
  start(): Promise<void>
  mountWorkspace(): Promise<void>
  dispose(): Promise<void>

  registerService(): void
}
```

This runtime should eventually orchestrate:
- filesystem watching
- git state
- indexing
- AI services
- command system
- plugin lifecycle
- workspace state

---

# Command System

Implement a centralized command architecture from the beginning.

Example:

```ts
registerCommand({
  id: "post.create",
  execute: async () => {}
})
```

This command layer should later power:
- command palette
- slash commands
- AI actions
- keyboard shortcuts
- plugins

Avoid embedding business logic directly into UI components.

---

# Technology Stack

## Desktop
- Electron
- electron-vite
- React
- TypeScript

## Styling
- TailwindCSS
- shadcn/ui

## Editor
- TipTap
- ProseMirror

## State
Preferred:
- Zustand
or
- Jotai

Avoid Redux unless absolutely necessary.

## Git
Preferred:
- simple-git
or
- isomorphic-git

## File System
Electron preload + IPC architecture.

Strict context isolation required.

---

# Electron Security Requirements

Implement proper Electron security architecture.

Must include:
- contextIsolation
- preload APIs
- IPC validation
- no direct Node.js access in renderer
- typed IPC contracts (grouped preload APIs: e.g. posts, workspace lifecycle, optional `src/` file access for site code)

Avoid insecure Electron patterns.

---

# MVP Requirements

## Initial Workspace Wizard

When the application launches for the first time:

### Step 1
Authenticate with GitHub

### Step 2
Choose workspace type

Initial options:
- Creator Workspace
- Developer Workspace (placeholder)

### Step 3
Choose template

Examples:
- Minimal Blog
- Dev Blog
- Portfolio Blog

### Step 4
Configure workspace
- title
- description
- theme color
- layout style

### Step 5
Repository setup
Options:
- create new repository
- clone existing repository

### Step 6
Select local directory

After completion:
- initialize workspace
- initialize git
- configure remote
- generate starter template

---

# Workspace Types

The architecture MUST support future workspace specialization.

Example:

```ts
type WorkspaceType =
  | "creator"
  | "developer"
  | "ai"
```

Each workspace type may later customize:
- sidebar
- panels
- commands
- layouts
- tools
- runtime services

---

# Planned publication formats & anthology model

*Not fully specified in this file; see [`PRODUCT.md` — Part 4](PRODUCT.md#part-4--extended-plan). Implementation tracking: [`ROADMAP.md` — Extended plan](ROADMAP.md#extended-product-plan).*

## Internal formats (semantic)

Formats control layout rules, metadata schema, editing experience, and semantic Astro components:

- **Column** — editorial / blog (MVP: `SiteProjectKind: column`)
- **Memoir**, **Dictionary**, **Fragments** — anthology-shaped archives (planned)
- **Book** — web-native independent publication: chapters, immersive reading, footnotes; static artifact on GitHub Pages, not a feed or marketplace (planned)

## Publication identity (creator-defined)

Separate from format: creators choose **publication slugs** and domains (e.g. `observatory.minhyeong.dev` for a Column publication named Observatory). Do **not** bind public URLs to format names (`column.domain.com`).

Anthology should behave as a **publishing namespace** (connected publications, optional shared navigation and branding), not merely a folder or repo list—while each repository stays portable and locally owned.

## Template / theme system (planned)

- Separate **content** from **presentation** (`content/` vs `theme/` target layout).
- Themes are replaceable publishing identities (layouts, typography, motion), not thin CSS skins.
- Safe swap flow: install theme → replace presentation regions → preserve content → preview → publish.

Current MVP: Design surface applies CSS presets and edits `src/` directly; full theme packages are future work.

---

# UI Direction

The **runtime** should support focused, transparent work (compare Obsidian, VSCode, Cursor, Notion, GitHub Desktop): keyboard-first flows, filesystem visibility, and professional density.

**Tone and pacing** must follow [`PRODUCT.md`](PRODUCT.md) (Parts 1–2): calm, archival, deliberate—not feed-like, gamified, or dopamine-driven.

Priority:
- reliable, responsive editing and navigation
- keyboard-friendly UX (command palette, shortcuts)
- filesystem transparency
- power-user workflows that still feel quiet and owned

Avoid overly heavy animations and addictive-scroll patterns.

---

# MVP Features

## Sidebar
- Posts
- Drafts
- Assets
- Design (site template presets + workspace `src/` code in Monaco; local Astro preview)
- Imprint (linear **publish narrative** timeline — rollback UI; Git abstracted — see [`PRODUCT.md` — Part 3](PRODUCT.md#part-3--state--time-model))
- Settings (keyboard hints in-shell; GitHub/theme/root in global Settings overlay; command palette via Ctrl/Cmd+K)

---

## Post List

Display:
- title
- tags
- draft status
- createdAt
- updatedAt

Use frontmatter parsing.

---

## Viewer Mode

Provide markdown preview rendering.

---

## Editor

TipTap editor requirements:
- markdown shortcuts
- slash commands
- code blocks
- tables
- task lists
- callouts
- drag/drop images
- image paste
- headings

---

# File Saving

Posts should save as:

```txt
/posts/yyyy-mm-dd-title.md
```

Frontmatter example:

```md
---
title: Hello
description: sample
tags:
  - react
createdAt: 2026-01-01
updatedAt: 2026-01-01
draft: false
---

content...
```

---

# Git Features

MVP support:
- git status
- commit
- push
- pull

Changes should be visible in UI.

Auto-save is allowed.

Git commits should remain explicit user actions.

---

# File Watcher Architecture

IMPORTANT:

Do NOT directly connect filesystem events to React state.

Implement:

```txt
Filesystem Event
→ Event Queue
→ Normalization Layer
→ Runtime State Update
```

Use:
- chokidar
or equivalent abstraction.

The application must tolerate:
- external file edits
- git pull changes
- branch switching
- mass file updates

without UI instability.

---

# Search + Indexing

Even if not fully implemented now, prepare architecture for:

- full text search
- tag indexing
- graph relations
- AI retrieval
- semantic search

Recommended strategy:

```txt
Markdown Files = Source of Truth
SQLite = Derived Cache Layer
```

The cache database must always be rebuildable from the workspace itself.

---

# Renderer Architecture

Do NOT tightly couple the workspace to GitHub Pages.

Introduce renderer abstraction.

Example:

```ts
interface RendererAdapter {
  build(): Promise<void>
  preview(): Promise<void>
}
```

Future renderers may include:
- Astro
- Next.js
- Hugo
- Gatsby

---

# Future AI Architecture (Do Not Fully Implement Yet)

Prepare extension points for:
- AI writing assistant
- AI coding assistant
- RAG indexing
- local LLM runtime
- semantic workspace search

Suggested future directory:

```txt
/services/indexing
/services/ai
/services/rag
```

---

# Plugin System (Future)

Architecture should eventually support:
- extension APIs
- command registration
- sidebar panels
- editor extensions
- runtime hooks

Do NOT hardcode everything into the core application.

---

# Recommended Project Structure

Target layout (not fully realized in the repo yet—see `docs/AGENT_BRIEF.md` and `docs/PRODUCT.md` Part 4):

```txt
apps/desktop     Electron main, preload, renderer (current home of MVP runtime)
shared           IPC contracts and shared types (exists today)

/core            Planned: runtime, editor adapters, filesystem queue, git contracts
/features        Planned: blog, developer, ai workspace modules
```

Current monorepo: `apps/desktop`, `shared`, `docs`, `scripts`, `build`. No top-level `core/` or `features/` packages yet.

---

# Engineering Requirements

- TypeScript strict mode
- Feature-oriented architecture
- Strong separation of concerns
- Typed IPC contracts
- Dependency inversion where appropriate
- Avoid oversized React components
- Prefer hooks + services
- Maintain testable architecture

---

# Most Important Goal

This project is NOT merely a markdown editor.

It is the foundation for:

- a Git-native workspace platform
- a Local-First productivity environment
- a Creator + Developer unified workspace
- an AI-native desktop runtime

Prioritize:
- extensibility
- portability
- maintainability
- runtime abstraction

over short-term convenience.
