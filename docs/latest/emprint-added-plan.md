# Emprint — Template System & Book Format Notes

> **Status**: product/architecture specification — **not yet implemented** in the desktop app unless noted elsewhere in `docs/AGENT_BRIEF.md`.
>
> **Cross-references**: summarized in [`../AGENT_BRIEF.md`](../AGENT_BRIEF.md#planned-extensions-emprint-added-plan), [`../architecture.md`](../architecture.md#planned-evolution-emprint-added-plan), checklist in [`../ROADMAP_MVP_GITHUB_PAGES.md`](../ROADMAP_MVP_GITHUB_PAGES.md#extended-product-plan-emprint-added-plan).

## Template Swapping Architecture

### Goal

Allow users to:
- completely change visual presentation
- preserve all content and metadata
- maintain format semantics
- customize interactions and layouts
- safely switch themes without breaking projects

---

# Core Principle

Content and presentation must remain separated.

Example structure:

workspace/
  content/
  theme/
  assets/
  config/

---

## Content Layer

Contains:
- writing
- images
- metadata
- structured documents

This layer must remain stable regardless of theme changes.

---

## Theme Layer

Contains:
- layouts
- styles
- typography
- motion systems
- interaction logic
- Astro presentation components

Themes should be fully replaceable.

---

# Semantic Component Architecture

Avoid:
- giant HTML templates
- monolithic skins
- tightly coupled layouts

Instead:
- semantic components
- modular layouts
- granular class naming
- isolated interaction systems

should define the rendering structure.

---

## Example Components

### Column
- ArticleHeader
- ArticleMeta
- ArticleBody
- ReadingProgress
- QuoteBlock

### Memoir
- MemoirTimeline
- MemoryCard
- NarrativeSection

### Dictionary
- DictionaryReference
- EntryList
- CrossLinkPanel

### Fragments
- FragmentViewer
- ArchiveShelf
- FragmentPreview

### Book
- BookPage
- ChapterNavigation
- FootnotePanel
- ReadingProgress
- PageTransitionLayer

---

# Semantic Class Naming

Avoid visual naming:

❌ .left-panel
❌ .big-dark-box

Prefer semantic naming:

✔ .memoir-entry
✔ .column-heading
✔ .book-chapter
✔ .fragment-preview

This enables:
- safe theme swapping
- AI-assisted styling
- motion overrides
- reusable layouts
- structural consistency

---

# Theme Replacement Flow

Download Theme
→ Install into Emprint workspace
→ Replace theme/style/src regions
→ Preserve content
→ Generate preview
→ Publish

---

# Theme Scope

Themes may modify:
- layout composition
- spacing
- typography
- transitions
- motion
- interaction rhythm
- atmospheric styling

while respecting:
- format semantics
- required component contracts
- metadata schema

---

# Customization Philosophy

Themes should feel like:
- publishing identities
- editorial systems
- presentation experiences

NOT simple CSS skins.

---

# Book Format (Planned)

## Goal

Provide a web-native independent publishing format.

Allow creators to:
- write books locally
- version manuscripts with Git
- publish directly via GitHub Pages
- present immersive reading experiences on the web

without:
- platform dependency
- publishing cost
- centralized ownership

---

# Book Characteristics

Book is NOT:
- a web novel platform
- an algorithmic feed
- a monetization service

Book IS:
- an independent publication format
- a static web-based reading experience
- a digital publishing artifact

---

# Possible Features

- chapter-based navigation
- page-turn transitions
- typography-focused layouts
- paper / terminal / night reading modes
- footnotes
- annotations
- ambient reading motion
- immersive pacing

---

# Book Philosophy

The web page itself becomes the book.

Instead of:
"posting text online"

the creator:
"publishes a digital artifact."

---

# Publishing Flow Example

Write manuscript locally
→ Store in Git repository
→ Preview in Emprint
→ Publish with GitHub Pages
→ Share independently

If officially published later:
- repository may become private
- GitHub Pages may be disabled
- ownership remains entirely with the creator

---

# Long-Term Direction

Book should feel closer to:
- independent press
- literary artifact
- archival publication

than:
- content feed
- social platform
- ebook marketplace

# Emprint — Anthology & Publication Identity Notes

## Core Direction

Anthology should NOT behave like:
- a simple folder
- a project collection
- a repo list

Anthology should behave more like:
- a publishing namespace
- a personal publishing world
- a connected archive of publications

---

# GitHub Pages Structure

GitHub Pages is fundamentally repository-based.

Default structure:

username.github.io/repository-name

However, Emprint should encourage custom domain usage
with subdomain-based publication organization.

---

# Recommended Domain Structure

Example:

minhyeong.dev

Connected publications:

- observatory.minhyeong.dev
- memoirs.minhyeong.dev
- fragments.minhyeong.dev
- letters.minhyeong.dev

This creates:
- stronger ownership feeling
- publication identity
- anthology/world-building atmosphere
- cleaner branding

---

# Important Architectural Decision

DO NOT force publication identity to match format names.

Bad:

- column.domain.com
- memoir.domain.com
- book.domain.com

Why:
- users may create multiple publications of the same format
- format naming should not limit creative identity
- publication naming is part of ownership and branding

---

# Recommended Structure

## Internal Semantic Format

Used internally by Emprint:

type = column
type = memoir
type = dictionary
type = fragments
type = book

This controls:
- layout rules
- metadata schema
- editing experience
- semantic structure

---

## External Publication Identity

User-defined:

publicationSlug = observatory
publicationSlug = letters
publicationSlug = archive
publicationSlug = notebook

This controls:
- domain/subdomain
- anthology navigation
- public identity
- branding

---

# Example Mapping

Format:
Column

Publication Name:
Observatory

Result:
observatory.minhyeong.dev

---

# Why This Matters

This allows Emprint to feel less like:
"a website builder"

and more like:
"a personal publishing ecosystem."

---

# UX Flow Example

1. Choose Format
→ Column

2. Choose Publication Name
→ Observatory

3. Connect to Anthology Domain
→ observatory.minhyeong.dev

---

# Anthology Responsibilities

Anthology settings may eventually manage:

- connected publication list
- subdomain suggestions
- shared navigation
- publication discovery
- cross-publication identity
- shared visual branding

without removing:
- repository independence
- creator ownership
- local-first structure

---

# Philosophy

Formats provide:
- semantic meaning
- structural guidance

But creators define:
- naming
- identity
- world-building
- presentation universe

Emprint should suggest metaphors,
not permanently impose them.

# Emprint — Documentation Automation Notes

## Goal

Reduce the maintenance cost of documentation assets for non-developer users.

Instead of manually:
- recording videos
- capturing screenshots
- creating GIFs
- updating tutorial assets

Emprint should support:
- scenario-driven documentation automation
- reproducible UI captures
- automatic screenshot/video generation

---

# Core Idea

Use Playwright-based UI automation to:
- launch the application
- simulate user actions
- navigate workflows
- generate screenshots/videos automatically

This allows documentation assets to stay synchronized with the actual product UI.

---

# Recommended Stack

## UI Automation

- Playwright

Purpose:
- UI interaction automation
- deterministic workflow replay
- screenshot generation
- video recording

---

## Video/GIF Processing

- ffmpeg
- gifski

Purpose:
- convert recordings into GIFs
- optimize looping demo assets
- compress preview media

---

## Documentation Site

Possible options:
- Astro Starlight
- VitePress

---

# Documentation Philosophy

Documentation should feel:
- visual
- approachable
- interactive
- lightweight

Especially for:
- non-developers
- first-time publishers
- GitHub beginners

---

# Scenario-Based Documentation System

## Example Structure

docs/
  scenarios/
    create-publication.ts
    theme-switch.ts
    custom-domain.ts
    publish-flow.ts

Each scenario represents:
- a reproducible user workflow
- a documentation tutorial flow
- an automated demo asset generator

---

# Example Scenario Flow

create-publication.ts

Possible steps:

1. Launch Emprint
2. Create Anthology
3. Select Column format
4. Enter publication name
5. Choose theme
6. Generate preview
7. Publish to GitHub Pages

Outputs:
- screenshots
- mp4 recordings
- looping GIFs

---

# Generated Asset Structure

docs/
  assets/
    screenshots/
    gifs/
    videos/

Example:

docs/assets/gifs/create-publication.gif

---

# Important Benefit

UI documentation becomes reproducible.

Instead of:

Feature update
→ manually recapture everything

Workflow becomes:

Update UI
→ rerun scenarios
→ regenerate documentation assets

---

# Demo Workspace Strategy

Create a deterministic documentation workspace.

Example:

demo-anthology/
  observatory/
  memoir/
  fragments/

This ensures:
- predictable UI state
- stable screenshots
- consistent tutorials
- repeatable demo generation

---

# Recommended UX Style

Prefer:
- short looping interactions
- ambient UI demonstrations
- focused workflow previews

instead of:
- long tutorial videos
- overwhelming feature explanations

Because Emprint is:
- atmosphere-driven
- presentation-oriented
- interaction-focused

---

# Long-Term Possibilities

Potential future extensions:

- automatic documentation generation from scenario metadata
- AI-assisted tutorial writing
- auto-generated onboarding flows
- interactive walkthrough publishing

---

# Philosophy

Documentation should not feel like:
- enterprise software manuals
- developer-only setup guides

Documentation should feel like:
- guided publishing onboarding
- visual storytelling
- interactive product discovery