# Emprint documentation

Five canonical files — read these before spelunking the repo.

| Document | Read when you need… |
|----------|---------------------|
| [**PRODUCT.md**](PRODUCT.md) | Why Emprint exists, brand voice, **Draft vs Imprint**, templates/formats/anthology plans (Parts 1–4) |
| [**ROADMAP.md**](ROADMAP.md) | MVP delivery status, checklists, local test guide, product decisions |
| [**AGENT_BRIEF.md**](AGENT_BRIEF.md) | Current codebase map, IPC, UI surfaces, gaps — **start here for implementation** |
| [**proposal.md**](proposal.md) | Engineering contract: stack, security, runtime shape, abstractions |
| [**DESIGN.md**](DESIGN.md) | UI tokens, layout, interaction, moodboard |

## Quick paths

- **New agent** → `AGENT_BRIEF.md` → `ROADMAP.md` → `PRODUCT.md` Part 3 if touching Publish/Imprint
- **User-facing copy** → `PRODUCT.md` Parts 1–2
- **Post-MVP features** (Book, themes, anthology domains) → `PRODUCT.md` Part 4 + `ROADMAP.md` Extended plan tables
- **Visual polish** → `DESIGN.md` + `PRODUCT.md` Part 2

## Consolidation note (2026-05)

Previously split across `docs/latest/*`, `docs/architecture.md`, and `docs/emprint-design-docs/*`. Those paths were merged into the files above to reduce duplication and broken cross-links.
