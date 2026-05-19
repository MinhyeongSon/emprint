# Changelog

All notable changes to the Emprint desktop app are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.5] - 2026-05-15

### Added

- **Setup Wizard**: Node.js 22+ detection step with OS-specific install commands.
- **Release pipeline**: Installers publish to public [emprint-release](https://github.com/MinhyeongSon/emprint-release) (private source repo).

### Changed

- Default desktop UI theme is **Warm**.

### Fixed

- **macOS**: Gatekeeper “damaged” on unsigned builds (ad-hoc sign).
- **Design preview**: `sync-theme.mjs` / packaged app `spawn npm ENOENT` (Node toolchain path resolution).
- **Landing intro**: Message text uses brand accent orange (`#e85d04`).

## [0.2.3] - 2026-05-15

### Added

- **Setup Wizard**: Node.js 22+ detection step with OS-specific install commands and [nodejs.org](https://nodejs.org/) link.

### Changed

- Default desktop UI theme is **Warm** (was Dark).

### Fixed

- **Design preview** in the packaged app: find `npm`/`node` on Homebrew, nvm, fnm, and common install paths (fixes `spawn npm ENOENT` when launched from Finder).

## [0.2.2] - 2026-05-15

### Fixed

- **macOS**: Unsigned arm64/x64 builds no longer show Gatekeeper “damaged” on first open (ad-hoc sign, `hardenedRuntime` off until notarized).
- **Design preview**: `scripts/sync-theme.mjs` no longer crashes with `normalizeClassPrefix is not defined` on `npm run dev`.
- **Landing intro**: Default message text uses Emprint brand accent orange (`#e85d04`).

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

[0.2.5]: https://github.com/MinhyeongSon/emprint-release/releases/tag/v0.2.5
[0.2.3]: https://github.com/MinhyeongSon/emprint-release/releases/tag/v0.2.3
[0.2.2]: https://github.com/MinhyeongSon/emprint-release/releases/tag/v0.2.2
[0.2.0]: https://github.com/MinhyeongSon/emprint-release/releases/tag/v0.2.0
[0.1.0]: https://github.com/MinhyeongSon/emprint-release/releases/tag/v0.1.0
