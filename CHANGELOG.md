# Changelog

All notable changes to the Emprint desktop app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-15

### Added

- **Memoir** anthology: portfolio sections editor, `ep-memoir-*` site contract, Astro generator, and three layout compositions (Timeline, Grid, Editorial).
- **Column** layout compositions: Reading Room (default), Magazine, and Journal — home and archive listings adapt per composition.
- Hub format picker when creating a workspace: choose **Column** or **Memoir** with wireframe previews.
- Design **Template** mode: layout composition + color palette for both anthologies; writes `config/theme.json` and syncs tokens, CSS, and Astro shells.
- **Landing intro** overlay (Terminal / Script variants) configurable from Design; timing fields editable in Code mode only.
- Visitor **ThemeToggle** on published sites (System / Light / Dark) driven by `theme.json` palettes.

### Changed

- Design save runs full theme sync (tokens, components, global styles, landing intro, layout/page Astro artifacts) using the mounted workspace kind.
- Imprint: publication timeline with **Rollback** and **Reset draft** for uncommitted edits.
- Component class prefixes are fixed per anthology (`ep-column`, `ep-memoir`).

### Fixed

- Memoir workspaces: theme apply now refreshes layout and page Astro templates (not only CSS).
- Memoir sidebar and keyboard shortcuts use Sections instead of Posts.
- Section IPC handlers are guarded to Memoir workspaces only.

## [0.1.0] - 2025

Initial public release: Column anthology, Setup Wizard, Hub, Posts/Drafts editor, Design (Template + Code), Assets, Publish, Imprint timeline, and GitHub Pages deploy workflow.

[0.2.0]: https://github.com/MinhyeongSon/emprint/releases/tag/v0.2.0
[0.1.0]: https://github.com/MinhyeongSon/emprint/releases/tag/v0.1.0
