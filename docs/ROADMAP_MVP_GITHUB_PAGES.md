# Emprint MVP Roadmap — GitHub Pages end‑to‑end

Product-level goals (quiet personal archive, not a growth or feed product) are in [`latest/emprint-philosophy.md`](latest/emprint-philosophy.md). **Post-MVP product extensions** (template system, Book format, anthology identity, doc automation) are specified in [`latest/emprint-added-plan.md`](latest/emprint-added-plan.md) and tracked in [Extended product plan](#extended-product-plan-emprint-added-plan) below.

This roadmap is **delivery engineering** toward Git + GitHub Pages.

This roadmap defines the work required to reach the **first “desired level”**:

> Install + run → Git install **guidance** if missing → GitHub login → **create** workspace repo (remote+local) → write posts → **commit + push + sync from remote** → **GitHub Pages goes live** (optional in-app deploy status).

It complements `docs/AGENT_BRIEF.md` (current state) and is written so any agent can pick up tasks without re‑deriving requirements.

### Product decisions (confirmed)

| Topic | Decision | Notes |
|-------|----------|-------|
| Git “setup” | ✅ **Done** (scope = OS guides only) | Wizard: `git:detect`, platform install commands, Retry. No bundled git / no `git:setup` automation. |
| Hub **clone** | 🚫 **Won’t implement** | Emprint enforces template/component layout; cloning arbitrary repos risks broken or incompatible trees. New workspaces via bootstrap only; optional paste HTTPS = `init` + `origin`, not `git clone`. |
| **fetch + pull** | 📋 **Will implement** | When remote has new commits: `fetch`, then **auto `pull`** if updates exist (see [D) Git operations](#d-git-operations-commit--push--pull--status)). |
| Token revoke on logout / quit | ✅ **Done** | Wizard **Client Secret** required; explicit Settings **Log out** → Wizard; window close / quit → shared-PC dialog (logout optional) |
| Scope review (tighten scopes) | ⏳ **Optional** | Revoke shipped; narrowing `repo` / `workflow` / `delete_repo` still open |
| Poll Actions / Pages in app | 📋 **Will implement** | Rationale: [Why poll Actions / Pages?](#why-poll-actions--pages-status--logs) |

---

## Current state (baseline)

*Last reconciled with the codebase: 2026-05-15 (main IPC, Hub / Wizard / shell, Design surface).*

### Implemented and in use

| Area | Status | Notes |
|------|--------|-------|
| Editor MVP | ✅ | Posts list → viewer → TipTap; markdown + frontmatter (title, tags, draft); `posts/` vs `drafts/` folders |
| Posts lifecycle | ✅ | Move between `posts/` / `drafts/`, delete; IPC validation |
| Design (sidebar 4) | ✅ | **Template**: warm/dark/light → `src/styles/global.css`. **Code**: `src/` tree + Monaco + create/rename/delete; workspace TS config. **Preview**: `site:dev:*` → Astro on `http://localhost:4321/`. **AI prompt**: copy-only for external tools |
| Assets | ✅ | Save/list/delete under `assets/images/`; cross-references from posts |
| Imprint | ✅ | `git:log` timeline (“publish log”, not full `git log` UI) |
| Publish flow | ✅ | `git:working-tree` + `git:publish` (stage all → commit → HTTPS push); sidebar dialog |
| Workspace bootstrap | ✅ | Manifest, dirs, starter post, Astro **column** scaffold, `deploy-astro-gh-pages.yml` |
| GitHub repo create (Hub) | ✅ | Public repo only; best-effort Pages API `build_type: workflow` after create |
| Git detect + OS install guides | ✅ | `git:detect`; Wizard gates on Ready; win/mac/linux copy-paste commands + Retry (no bundled git) |
| Initial sync | ✅ | `git:initial-sync` optional after Hub create |
| Typed IPC + preload | ✅ | `shared/src/ipc.ts`; `window.emprint` |
| Shell chrome | ✅ | Frameless titlebar, command palette, Settings (theme, root, Device Flow, OAuth client ID, log out) |

### Partially done / “MVP but rough”

| Area | Status | Notes |
|------|--------|-------|
| Token storage | ⚠️ | `userData/github-session.json`; no keychain; logout revokes on GitHub when Client Secret configured |
| Connect remote (Hub) | ⚠️ | Paste HTTPS → `git init` + `origin` on **empty** folder only (by design, not clone) |
| Git fetch / pull | 📋 | Planned: auto `fetch`, then auto `pull` when remote is ahead |
| Deploy observability | ⏳ | Local preview + Hub static URL ✅; Actions/Pages polling — decision pending |
| Showcase site kind | ⚠️ | Generator exists; Hub locks to Column only |

### Still open vs “definition of done”

| Item | Status | Notes |
|------|--------|-------|
| Auto fetch + pull from remote | 📋 | See product decision above |
| In-app deploy status (optional) | ⏳ | See [Why poll Actions / Pages?](#why-poll-actions--pages-status--logs) |
| Scope review (optional) | ⏳ | Revoke on logout ✅; narrowing OAuth scopes still optional |

---

## Target user journey (definition of done)

| Step | Status | Requirements |
|------|--------|----------------|
| 0) Prerequisites | ✅ | Detect `git`; if missing → **OS-specific install commands** + Retry (no bundled installer) |
| 1) Auth (Wizard) | ✅ | GitHub sign-in; token with required scopes; logout revokes token when Client Secret set |
| 2) Repo — create new | ✅ | Remote repo + local bootstrap + `origin` + initial commit + first push |
| 2b) Repo — clone existing | 🚫 | **Out of scope** — preserves Emprint template/component contracts |
| 3) Writing | ✅ | Create/edit posts; working tree dirty state visible |
| 3b) Sync from remote | 📋 | Auto fetch + auto pull when remote ahead |
| 4) Deploy | ⚠️ | Commit + push ✅; Pages URL (Hub) ✅; in-app Actions/Pages status ⏳ optional |

---

## Key design constraints (from existing docs)

| Constraint | Notes |
|------------|-------|
| Workspace portable | Markdown + git repo are canonical |
| No proprietary backend | Pages / Actions / GitHub API only; everything else local |
| Editor-agnostic | TipTap is a surface; persistence via document adapter (future) |

---

## Major implementation areas & work estimate

### A) Git availability (guided install)

**Goal**: user without `git` can install it with clear OS-specific steps, then continue in the app.

| Item | Status | Notes |
|------|--------|-------|
| `git:detect` IPC (`available`, `version`, `path`) | ✅ | Wizard gating |
| OS install command cheatsheet (win/mac/linux) | ✅ | `workspace-wizard.tsx`: winget/choco, xcode-select/brew, apt/dnf/pacman |
| Retry detection after install | ✅ | Wizard Retry button |
| Bundled git / automated `git:setup` | 🚫 | Explicitly out of scope |

### B) GitHub OAuth (Wizard)

**Goal**: real authentication; token usable for API + git HTTPS push.

| Item | Status | Notes |
|------|--------|-------|
| Device Flow IPC (`auth:start`, `auth:poll`) | ✅ | |
| Sign-in UI (code, browser, polling, username) | ✅ | |
| Token store (MVP JSON in `userData`) | ✅ | `github-session.json` |
| OS keychain storage | ❌ | Recommended next |
| Log out (clear local session) | ✅ | Settings |
| Token revoke on logout / quit | ✅ | Requires Client Secret in Settings or env |
| Log out button + window close + app quit | ✅ | `performGithubLogout()` |
| Scopes: `repo`, `workflow`, `delete_repo` | ✅ | Scope review ⏳ optional |

### C) GitHub repo creation + remote wiring (Hub)

**Goal**: create/connect remote repo from inside the app.

| Item | Status | Notes |
|------|--------|-------|
| Create public repo via API | ✅ | Signed-in user only; no private toggle |
| `git init` + `origin` + initial commit + push | ✅ | Optional initial sync checkbox |
| Paste existing HTTPS URL (no auto-create) | ✅ | Init + `origin` on empty folder, not `git clone` |
| Hub / in-app `git clone` | 🚫 | By design — incompatible with enforced site template |
| Org picker / private repos | ❌ | Out of MVP UI |
| Catalog entry + open workspace | ✅ | |

### D) Git operations (commit / push / pull / status)

**Goal**: dirty state, safe commit/push, stay in sync when remote changes (e.g. edit on another machine or README on GitHub).

| Item | Status | Notes |
|------|--------|-------|
| `git:working-tree` (Publish summary) | ✅ | Includes `ahead` / `behind`; not a full status panel |
| `git:publish` (stage all → commit → push) | ✅ | Skip reasons surfaced |
| `git:log` (Imprint) | ✅ | Lane-style UI |
| `git:fetch` + auto `git:pull` when remote ahead | 📋 | **Planned**: fetch first; if pull needed, pull without separate user step (handle dirty tree / conflicts) |
| Split `status` / `commit` / `push` commands | 🚫 | Publish stays all-in-one |

### E) GitHub Pages provisioning + deployment pipeline

**Goal**: after push, site live on Pages; app shows deploy status.

| Item | Status | Notes |
|------|--------|-------|
| Astro Column site in workspace | ✅ | `column-site-generator.ts`, `astro-stack.ts` |
| `deploy-astro-gh-pages.yml` on bootstrap | ✅ | |
| Pages API enable (`build_type: workflow`) | ✅ | Best effort on `github:repo:create` |
| Local Astro preview (Design) | ✅ | `site:dev:*` |
| Static Pages URL on Hub cards | ✅ | `resolveGithubPagesUrl` |
| Poll Actions / Pages + in-app logs | ⏳ | Decision pending — see rationale section |

*Remaining epic focus*: **remote sync (fetch/pull)** and optional **deploy observability**—not new static generators or Hub clone.

---

## Suggested implementation order (critical path)

| # | Area | Status | Next |
|---|------|--------|------|
| 1 | Git detect + OS guides | ✅ | — |
| 2 | GitHub OAuth + token store | ✅ | Keychain; revoke on logout ✅ |
| 3 | Repo create + bootstrap | ✅ | No Hub clone (by design) |
| 4 | Commit/push (Publish) | ✅ | Auto fetch + pull |
| 5 | Astro generator + Actions workflow | ✅ | — |
| 6 | Pages API enablement | ✅ | Optional in-app deploy polling |
| 7 | Polish | ❌ | Retries, partial-setup recovery, org/SSO edge cases |

---

## Local end-to-end test guide (Wizard → Hub → Workspace create)

This section is meant to be copy/paste runnable so you can test the full onboarding flow from scratch.

### 0) Prerequisites

- **`git` on PATH** is required for commit/push. If missing, use the Wizard’s **Install commands** for your OS, then **Retry** (Emprint does not bundle Git).
- GitHub OAuth App **Client ID** with **Device Flow** enabled (Wizard / Settings).

Then install and start dev (root `postinstall` runs **`patch-package`** for `vite-plugin-monaco-editor` + current Node.js):

```bash
npm install
npm run dev
```

### 1) Wizard: Git + GitHub + root

In the app:

- Step **Git** / “Git 준비”: the app runs **`git:detect`** automatically; you must see **Ready** (and a version string) before **Continue**. If Git is missing, follow the shown install commands for your OS, install Git, then use **Retry**.
- Step **GitHub**: sign in with Device Flow (browser approval + polling). Optional: persist **OAuth Client ID** from Settings if you did not enter it in the Wizard.
- Step **Root folder**: choose the directory that will hold workspace folders.

Notes:

- Token is stored at `app.getPath('userData')/github-session.json` in MVP form.
- **Log out** is available under **Emprint Settings** (clears local session; does not revoke the token at GitHub).

### 2) Hub: create a workspace mapped 1:1 to a GitHub repo

In Hub:

- Click **New workspace** / “새 워크스페이스 만들기”.
- Choose **Column** site format (Showcase is disabled).
- Enter **Title** (drives local folder name and default GitHub repo name) and **Description** (required).
- Either:
  - Leave **Create on GitHub** **ON** (recommended): repo is created as **public** under your signed-in account; optional **Initial push** runs `git:initial-sync` after files are written; **or**
  - Turn **Create on GitHub** **OFF** and paste an existing **`https://github.com/<owner>/<repo>.git`** URL (local init + `origin`, **not** a full clone of existing content).
- Click create (**+**).

Expected results:

- A new repo is created on GitHub (when auto-create is on), **or** `origin` points at your pasted URL.
- A new local folder is created under the workspace root with manifest, `posts/`, Astro site, **`.github/workflows/deploy-astro-gh-pages.yml`**, etc.
- With **Initial push** on: first commit includes the generated tree and pushes to `main` over HTTPS using the session token.
- Catalog is updated and the app can enter the workspace UI.

After first push, confirm on GitHub: **Actions** runs **Deploy Astro to GitHub Pages**; when green, the **Pages** URL under repo **Settings** should resolve (first run can take a minute).

### 3) Smoke checks inside the created workspace

| Check | Expected |
|-------|----------|
| Posts list | Starter post under `posts/` |
| Viewer | Open post → markdown preview |
| Editor | TipTap edit + save persists to disk |
| Design (4) | Template and/or Code; site preview; if “Workspace source API unavailable” → quit app, `npm run dev` |
| Imprint (5) | `git:log` history after publish |
| Publish | Sidebar control → message → push; new commit in Imprint |
| Settings (6) | Theme, root, Device Flow, OAuth client ID, log out |

Troubleshooting:

- If GitHub auth fails, confirm you pasted a valid **OAuth Client ID** in the Wizard and enabled **Device Flow** on the OAuth App.
- If repo creation fails for an org owner, ensure the OAuth app/token has permission for that org.
- If initial push fails, check:
  - git availability
  - repo exists and you have permission
  - remote URL is HTTPS `github.com/...` (MVP only supports GitHub HTTPS for authenticated push)

## Work breakdown (actionable checklist)

### Git

| Item | Status |
|------|--------|
| `git:detect` IPC (version/path) | ✅ |
| OS-specific install guides in Wizard (win/mac/linux) + Retry | ✅ |
| Bundled git / automated installer | 🚫 Out of scope |
| “Git ready” Wizard gating | ✅ |

### GitHub Auth

| Item | Status |
|------|--------|
| IPC channels + types for Device Flow | ✅ |
| Device flow in main (`device/code`, poll token) | ✅ |
| Token store (MVP JSON; keychain next) | ✅ |
| “Whoami” / signed-in status | ✅ |
| Logout IPC + Settings UI | ✅ |
| Revoke token on logout / quit (Client Secret required) | ✅ |
| Scope review (optional) | ⏳ |

### Repo setup

| Item | Status |
|------|--------|
| Create remote repo via API (public-only) | ✅ |
| Local bootstrap + remote + initial commit + push | ✅ |
| Hub / in-app `git clone` | 🚫 By design |

### Git operations UI

| Item | Status |
|------|--------|
| Working tree snapshot for Publish (`git:working-tree`) | ✅ |
| Stage-all + commit + push (`git:publish` + dialog) | ✅ |
| Auto `fetch` + `pull` when remote ahead | 📋 Planned |
| Commit history for Imprint (`git:log`) | ✅ |

### Pages / Deploy

| Item | Status |
|------|--------|
| Column site generator (Astro + posts) | ✅ |
| `deploy-astro-gh-pages.yml` at bootstrap | ✅ |
| Pages API enable on repo create | ✅ |
| Local Astro preview (`site:dev:*`) | ✅ |
| Static Pages URL on Hub cards | ✅ |
| Poll Actions/Pages status + logs in app | ⏳ See rationale |

---

## Why revoke token & scope review?

**Implemented (2026-05):** On **Log out**, **window close**, and **app quit**, Emprint calls GitHub’s revoke API when a **Client Secret** is configured (Settings or `EMPRINT_GITHUB_CLIENT_SECRET`), then deletes `github-session.json`. Without a secret, local session is still cleared but the token may remain valid on GitHub (console warning).

**Original rationale (why we added revoke):** **Log out** used to only delete `github-session.json` locally. The OAuth token on GitHub’s side could remain valid until expiry or manual revoke under GitHub → Settings → Applications.

**Why you might add API revoke on logout**

| Reason | Detail |
|--------|--------|
| **Matches user expectation** | “Log out” on a shared or borrowed machine should mean the app can no longer act as the user on GitHub, not only that Emprint forgot the file. |
| **Leak / compromise** | If `userData` is copied or the token was exposed, local delete does not invalidate the credential at the issuer. |
| **Powerful scopes** | The app requests `repo`, `workflow`, and `delete_repo`. A still-valid token after “logout” can push, change Actions, or delete remotes until revoked manually. |
| **Symmetric lifecycle** | Sign-in creates a grant; sign-out should end the grant when feasible, not only clear local cache. |

**What scope review adds:** audit whether `delete_repo` (and possibly `workflow`) are required for every user journey, or only for catalog “delete remote” — smaller scopes reduce blast radius and can simplify OAuth app review.

**When you might skip (MVP acceptable):** document that users must revoke under [GitHub → Settings → Applications](https://github.com/settings/applications); Device Flow tokens are user-revocable without Emprint calling the API. Cost: implement `DELETE` grant/revoke endpoint, handle already-revoked errors, and decide behavior if revoke fails but local session is cleared.

---

## Why poll Actions / Pages status & logs?

**What exists today:** After **Publish** (git push), the site goes live only after **GitHub Actions** builds Astro and **Pages** deploys — often 1–3+ minutes. The app can show a **static Pages URL** on the Hub; **Design** offers **local** preview. Nothing in-app reflects whether the **remote** workflow succeeded or failed.

**Why you might add polling**

| Reason | Detail |
|--------|--------|
| **Push ≠ live site** | Users treat “Publish” as “my site is updated.” Without feedback, they assume failure when the URL still shows an old build or 404 during the run. |
| **Non-developer gap** | Many targets won’t open the Actions tab; failed workflows (Astro build error, bad `base` path, Node version) look like “Emprint is broken.” |
| **Closes the loop in-product** | Imprint shows **git** history, not **deploy** outcome. A small status (queued → in progress → live / failed) aligns with the publish metaphor. |
| **Actionable failures** | Linking to the workflow run or a short log excerpt avoids blind retries and duplicate commits. |
| **Multi-device / CI** | Pushes from another machine or README edits on GitHub still trigger Actions; polling reflects “what visitors see,” not only local git state. |

**When you might defer or minimize:** power users can use GitHub UI; rate limits and UI complexity matter. A **thin MVP** could be: after push, poll latest workflow run once and show **success / failure + link to run** without embedding full logs.

---

## Rough completion estimate (from current baseline)

| Measure | Status | Notes |
|---------|--------|-------|
| Full journey (git guides, create repo, push, sync, deploy feedback) | **~65–70%** | Git guides ✅; clone 🚫; fetch/pull 📋; deploy polling ⏳ |
| Slice: public repo + Astro + workflow + Pages POST + push from app | **Largely complete** | Pending token/org/SSO edge cases in the wild |

---

## Extended product plan (`emprint-added-plan`)

Canonical detail: [`latest/emprint-added-plan.md`](latest/emprint-added-plan.md). These items are **out of scope for the MVP GitHub Pages critical path** unless explicitly prioritized; they define the next product/architecture tranche after the baseline author → publish loop is solid.

### A) Template system & safe theme swapping

**Goal**: change visual presentation without losing content, metadata, or format semantics.

| Item | Status |
|------|--------|
| Workspace layout: `content/` + `theme/` + `assets/` + `config/` | ❌ (today: `posts/`, `drafts/`, `assets/`, `src/`) |
| Installable theme packages (download → install → replace theme regions) | ❌ |
| Semantic Astro components per format (not monolithic skins) | ❌ (partial: Column Astro scaffold only) |
| Semantic CSS class contract for themes | ❌ (Design writes `global.css` presets only) |
| Theme swap flow: preserve content → preview → publish | ❌ (local Astro preview exists; no theme package pipeline) |

### B) Publication formats

**Goal**: internal format drives editor + layout; multiple publications per format allowed.

| Format | Status |
|--------|--------|
| Column (blog / editorial) | ✅ `SiteProjectKind: column` + generator |
| Showcase (portfolio) | ⚠️ Generator exists; Hub UI disabled |
| Memoir | ❌ Planned |
| Dictionary | ❌ Planned |
| Fragments | ❌ Planned |
| Book (chapters, page-turn, footnotes, reading modes) | ❌ Planned |

### C) Anthology & publication identity

**Goal**: anthology as publishing namespace; creator-owned naming and domains.

| Item | Status |
|------|--------|
| Hub catalog as “anthology” metaphor in copy | ⚠️ Partial (create flow uses anthology language) |
| Wizard/Hub: choose format **then** publication slug (not repo name = format) | ❌ (title/slug drives repo folder name today) |
| `publicationSlug` distinct from internal `format` in manifest/types | ❌ |
| Custom domain / subdomain guidance in app | ❌ (docs only; no in-app DNS/CNAME wizard) |
| Anthology settings: linked publications, shared nav, subdomain suggestions | ❌ |
| Avoid `format.domain.com` anti-pattern in generators/defaults | ✅ By policy in plan; not yet enforced in product UI |

### D) Documentation automation (repo tooling)

**Goal**: reproducible screenshots/GIFs/videos for non-developer onboarding docs.

| Item | Status |
|------|--------|
| Playwright scenario runner (`docs/scenarios/*.ts`) | ❌ |
| Asset outputs `docs/assets/{screenshots,gifs,videos}/` | ❌ |
| ffmpeg / gifski pipeline for looping demos | ❌ |
| Docs site (Starlight or VitePress) | ❌ |
| Deterministic `demo-anthology/` fixture workspace | ❌ |

### Suggested order (after MVP critical path)

1. Finish MVP gaps in this doc (auto fetch/pull; optional deploy polling / token revoke).
2. **Publication slug** + manifest fields; Hub create flow (format → name → repo).
3. **Theme package** MVP (install + swap + preview) on top of existing Design/Code surfaces.
4. **Book** format generator + semantic components (largest format bet).
5. Memoir / Dictionary / Fragments formats (incremental).
6. Anthology-level domain/navigation settings.
7. Playwright doc scenarios + demo workspace (can parallelize once UI stabilizes).

