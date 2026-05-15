# Emprint MVP Roadmap — GitHub Pages end‑to‑end

Product-level goals (quiet personal archive, not a growth or feed product) are in [`latest/emprint-philosophy.md`](latest/emprint-philosophy.md). This roadmap is **delivery engineering** toward Git + GitHub Pages.

This roadmap defines the work required to reach the **first “desired level”**:

> Install + run → (auto) Git install if missing → GitHub login → create/clone repo (remote+local) → write posts → **commit + push + GitHub Pages goes live**.

It complements `docs/AGENT_BRIEF.md` (current state) and is written so any agent can pick up tasks without re‑deriving requirements.

---

## Current state (baseline)

*Last reconciled with the codebase (main process IPC in `apps/desktop/src/main/ipc.ts`, renderer Hub / Wizard / shell).*

### Implemented and in use

- **Editor MVP**: Posts list → viewer → TipTap editor (markdown + frontmatter: title, tags, draft flag kept in sync with `posts/` vs `drafts/` folders).
- **Posts lifecycle**: move between `posts/` and `drafts/`, delete post, with IPC validation.
- **Implement**: `src/` tree + Monaco; list/read/save plus **create / rename / delete** under `src/` (typed `workspaceSrc` IPC, path confined to `src/`).
- **Assets**: save/list/delete images under `assets/images/` with IPC and cross-references from posts.
- **Imprint**: sidebar surface backed by **`git:log`** — time-ordered view of commits (positioned as a non-technical “publish log”, not a full `git log` UI).
- **Publish flow**: sidebar **Publish** control + dialog; **`git:workingTree`** for dirty/ahead/remote/session summary; **`git:publish`** stages all changes, commits with a user message, then pushes with stored GitHub token (HTTPS remote). Errors surface in the dialog.
- **Workspace bootstrap**: manifest, directories, starter content, **Astro “column” site scaffold** (site generator under `apps/desktop/src/main/site-generation/`), including **`.github/workflows/deploy-astro-gh-pages.yml`** and README notes for Pages.
- **GitHub repo create (Hub)**: API create **public** repo only in current build; after create, **`POST .../repos/{owner}/{repo}/pages`** (best effort) sets Pages **build source to GitHub Actions** so Actions deploy can succeed without manual Settings toggling when the token allows it.
- **Git detect**: **`git:detect`** returns availability, version, and resolved path; **Wizard** first step requires Git ready (with OS-specific install hints + retry), not a silent skip.
- **Initial sync**: **`git:initial-sync`** after Hub create (optional checkbox) for first commit + push.
- **Typed IPC + preload**: `shared/src/ipc.ts` contract; `window.emprint` in renderer.
- **Frameless titlebar** + command palette + **Settings** (theme, workspace root, **GitHub Device Flow** + **persisted OAuth client ID** + **Log out** clearing local session JSON).

### Partially done / “MVP but rough”

- **Git install**: detection + copy-paste install commands + retry — **no** bundled git, **no** `git:setup` automation.
- **Token storage**: still **`userData/github-session.json`** (and OAuth client id file); **no OS keychain**; logout clears local file only (**no GitHub token revoke API**).
- **Connect existing remote URL (Hub)**: optional pasted GitHub HTTPS URL is **`git init` + `origin`**, not **`git clone`** of an existing tree. **`repository.mode === 'clone'`** exists in the bootstrapper but **Hub never sends `clone`** today.
- **Git pull**: **no** `git:pull` IPC or UI.
- **Deploy observability**: no in-app polling of Actions / Pages; user verifies live site on GitHub.

### Still open vs this document’s “definition of done”

- One-click / bundled **Git** where none is installed.
- **Clone** existing repo from Hub (empty folder → `git clone`).
- **Pull** (and richer **status** than the publish-focused summary).
- **In-app** deployment status, live Pages URL, and log links after push.

---

## Target user journey (definition of done)

### 0) First run: prerequisites

- App detects whether `git` is available.
- If missing: app offers **one‑click setup** and ends with a usable `git` in PATH (or uses a bundled git).

### 1) Auth (Wizard step 1)

- User signs into GitHub.
- App receives an access token with the minimum required scopes.
- Token is stored securely and can be revoked/logged out.

### 2) Repo setup (Wizard step: remote+local)

Paths:

- **Create new**: create a remote repo on GitHub + init local repo + add `origin` + initial commit + first push.
- **Clone existing**: clone into empty local directory (remote is already set).

### 3) Writing

- User creates/edits posts in the app (already working).
- Changes are tracked as “working tree dirty”.

### 4) Deploy

From app UI:

- Commit changes with a message
- Push to GitHub
- GitHub Pages is configured and a site becomes reachable at a URL
- App shows deployment progress/status (queued → building → success/fail), with a link to the live site + logs on failure.

---

## Key design constraints (from existing docs)

- **Workspace remains portable**: markdown + git repo are canonical.
- **No proprietary backend**: Pages/Actions/GitHub API are allowed; everything else local.
- **Editor‑agnostic architecture**: TipTap is a surface; persistence should be through a document adapter abstraction (future refactor).

---

## Major implementation areas & work estimate

### A) Git availability (auto install / fallback)

**Goal**: every user can run git operations from the app even if they started without git.

Recommended strategy by OS:

- **macOS**
  - Detect `git`.
  - If missing: prompt to install **Xcode Command Line Tools** (official). Optionally offer Homebrew path, but it’s often blocked by permissions/policy.
  - Provide a “Retry” button and clear progress UI.
- **Windows**
  - Preferred: bundle a portable Git (or download Git for Windows installer and run it with user consent).
- **Linux** (if supported later): prompt package manager commands.

Deliverables:

- `git:detect` IPC returning `available`, `version`, `path`. **Done** (`ipcChannels.gitDetect` + Wizard gating).
- `git:setup` workflow (OS‑specific) and “ready” state stored in app state. **Not done** (Wizard only surfaces manual install commands + retry detect).

Risk/notes:

- True “auto install” is OS/policy sensitive. For the MVP definition, it’s acceptable to implement **guided install** that ends in a working git, but the UX must feel one‑click/straightforward.

### B) GitHub OAuth (Wizard step 1)

**Goal**: real authentication, token stored and usable for GitHub API calls and repo operations.

Recommended MVP: **GitHub Device Flow** in Electron.

Deliverables:

- IPC: `github:auth:start` → returns `user_code`, `verification_uri`, `expires_in`, `interval`.
- IPC: `github:auth:poll` → returns `access_token` once authorized.
- Token store:
  - MVP: local JSON store in `app.getPath('userData')/github-session.json` (documented risk)
  - Better: OS keychain (recommended next)
- UI:
  - Button “Sign in with GitHub”
  - Shows user code + opens browser + polling status
  - “Signed in as <username>” confirmation
  - **Log out** in Settings (clears local session file; does not revoke the token on GitHub’s side).

Scopes:

- Current app requests **`repo`**, **`workflow`**, and **`delete_repo`** during Device Flow so repo create, Actions workflow, catalog remote delete paths, and Pages POST can work under normal GitHub settings. Tighten over time if policy allows smaller scopes.

### C) GitHub repo creation + remote wiring (Wizard step)

**Goal**: user can create remote repo and connect it to the local workspace from inside the app.

Deliverables:

- API calls:
  - Create repository (name, description) — **current UI: always public** under the signed-in user (`githubRepoCreate` rejects non-public).
  - Default branch conventions (`main`) via initial sync.
- Local git commands via `simple-git`:
  - `git init` (Hub path today) **or** `git clone` (bootstrapper supports **`repository.mode: 'clone'`**, but Hub does not expose it yet)
  - `git remote add origin <url>`
  - initial commit
  - first push
- UX:
  - **Hub today**: title + description drive folder/repo slug; optional **paste existing HTTPS URL** when not auto-creating; **Initial push** checkbox; no separate org picker or private toggle (public + signed-in owner only).
  - Success: catalog entry + open workspace.

### D) Git operations inside the app (commit/push/pull/status)

**Goal**: app can show dirty state, stage/commit/push, and pull updates safely.

**As implemented today** (names from `shared/src/ipc.ts`):

- **`git:working-tree`**: branch, ahead/behind, upstream/remote flags, pending file list, whether a GitHub session exists — drives the Publish affordance (not a full `git status` panel).
- **`git:publish`**: `git add -A`, `git commit` (requires non-empty message), then authenticated **`git push`** when session + remote exist; returns whether commit/push happened and skip reasons (`no-remote`, `no-session`, `nothing-to-push`, etc.).
- **`git:log`**: commit history for **Imprint** (lane-style UI).

**Still missing vs this section’s original checklist:**

- Dedicated **`git:pull`** (and fetch) IPC + UI.
- Optional split commands (`git:status` / `git:commit` / `git:push`) if you want granular control instead of the all-in-one publish pipeline.

### E) GitHub Pages provisioning + deployment pipeline (the “2번”)

**Goal**: after push, the site becomes live on GitHub Pages, and the app can show status.

**Done in repo today**

1) **Site output**: new **Column** workspaces ship an **Astro** static site under the workspace (see `column-site-generator.ts` / `astro-stack.ts`) that consumes `posts/` markdown.
2) **Actions workflow**: `.github/workflows/deploy-astro-gh-pages.yml` is generated into the workspace on bootstrap (not necessarily named `deploy.yml`; functionally equivalent).
3) **Pages API**: after **`github:repo:create`**, main process calls **`POST /repos/{owner}/{repo}/pages`** with `build_type: "workflow"` when possible (failures are logged; creation still succeeds).

**Not done**

4) **Surface deployment status in app** — no polling of Actions runs, Pages environments, or deep links to logs; user checks GitHub UI.

Deliverables (original “Deploy command” bundle):

- Workflow + generator + best-effort Pages enable: **largely satisfied** at workspace/repo creation time.
- **Monitors the run** inside Emprint: **still open**.

Notes:

- The remaining “large” work for this epic is less about choosing a generator and more about **git install polish**, **clone/pull**, and **deploy observability** in the shell.

---

## Suggested implementation order (critical path)

1) **Git detect** ✅ — keep improving toward **guided/bundled install** where detection fails.
2) **GitHub OAuth Device Flow + token store** ✅ — migrate to **keychain** + optional **token revoke**.
3) **Repo create + remote wiring** ✅ — add **Hub clone** path (`repository.mode: 'clone'`) for existing repos.
4) **Commit/push UX** ✅ (Publish pipeline) — add **`git:pull`** and clearer **sync** story for multi-machine edits.
5) **Static site generator + Actions workflow** ✅ (Astro column + `deploy-astro-gh-pages.yml`).
6) **Pages enablement** ✅ (best-effort API) — **deployment status / live URL in app** ❌.
7) Polish: retries, error states, “recover from partial setup”, org/SSO edge cases.

---

## Local end-to-end test guide (Wizard → Hub → Workspace create)

This section is meant to be copy/paste runnable so you can test the full onboarding flow from scratch.

### 0) Prerequisites

- **`git` on PATH** is still required for commit/push and for the Wizard “Git” step to pass (auto-install is not implemented yet).
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

- Posts list shows the starter post under `posts/`.
- Open the post → viewer works.
- Enter edit mode → TipTap editor works.
- Save → changes persist to disk.
- **Implement** (sidebar **4** / `Implement`): `src/` tree; Monaco read/save; create/rename/delete files under `src/`. If you see **“Workspace source API unavailable”**, fully quit Electron and run `npm run dev` again so preload reloads.
- **Imprint** (sidebar **5**): commit / “publish” history from `git:log`.
- **Publish**: use the sidebar **Publish** control; enter a short message; confirm **push** when GitHub is connected. After a successful run, **Imprint** should list the new commit.
- **Settings** (sidebar **6**): theme, workspace root, GitHub Device Flow + **OAuth Client ID** persistence, **Log out**.

Troubleshooting:

- If GitHub auth fails, confirm you pasted a valid **OAuth Client ID** in the Wizard and enabled **Device Flow** on the OAuth App.
- If repo creation fails for an org owner, ensure the OAuth app/token has permission for that org.
- If initial push fails, check:
  - git availability
  - repo exists and you have permission
  - remote URL is HTTPS `github.com/...` (MVP only supports GitHub HTTPS for authenticated push)

## Work breakdown (actionable checklist)

### Git

- [x] Implement `git:detect` IPC (version/path).
- [ ] Implement `git:setup` UX per OS (guided/bundled install beyond copy-paste hints).
- [x] Add “Git ready” state to Wizard gating logic (must detect `git` before continuing).

### GitHub Auth

- [x] Add IPC channels + types for GitHub Device Flow.
- [x] Implement device flow in main process (fetch `device/code`, poll `oauth/access_token`).
- [x] Store token (MVP JSON store; keychain is next).
- [x] Add “whoami” / status to show signed-in account.
- [x] Add logout (IPC).
- [x] Logout control in **Settings** UI.
- [ ] Revoke token via GitHub API (or documented manual revoke) + tighter scope review.

### Repo setup

- [x] Create remote repo via GitHub API (public-only in current build).
- [x] Local init + remote add + initial commit + push (MVP initial sync).
- [ ] Hub **clone** flow (`repository.mode: 'clone'`) for existing GitHub repos into an empty folder.

### Git operations UI

- [x] Working tree snapshot for Publish (`git:working-tree` — not a full standalone status view).
- [x] Commit message + stage-all + commit + push (`git:publish` + Publish dialog).
- [ ] Pull / fetch UX (`git:pull` IPC still absent).
- [x] Commit history for Imprint (`git:log`).

### Pages / Deploy

- [x] Site generator for Column workspaces (Astro + posts pipeline).
- [x] Write `.github/workflows/deploy-astro-gh-pages.yml` into repo at workspace bootstrap.
- [x] Enable Pages via GitHub API (best effort on `github:repo:create` — `build_type: workflow`).
- [ ] Poll Actions/Pages deployment status + show live URL + logs in app.

---

## Rough completion estimate (from current baseline)

Compared to the **full** journey at the top of this doc (auto git install, clone-from-Hub, pull, in-app deploy status):

- **Overall ~55–60%** — core author → publish → push path and **repo-side** Pages/Actions scaffolding are in place; biggest remaining product gaps are **git distribution**, **clone/pull**, and **deploy observability**.

If you measure only **“new public GitHub repo + Astro in tree + workflow file + Pages POST + user can push from app”**, that slice is **largely complete**, pending real-world token/org policy edge cases.

