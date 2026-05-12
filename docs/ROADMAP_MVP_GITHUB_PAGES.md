# Emprint MVP Roadmap — GitHub Pages end‑to‑end

This roadmap defines the work required to reach the **first “desired level”**:

> Install + run → (auto) Git install if missing → GitHub login → create/clone repo (remote+local) → write posts → **commit + push + GitHub Pages goes live**.

It complements `docs/AGENT_BRIEF.md` (current state) and is written so any agent can pick up tasks without re‑deriving requirements.

---

## Current state (baseline)

Already implemented and stable:

- **Editor MVP**: Posts list → viewer → TipTap editor (markdown persistence) with title/tags/draft frontmatter.
- **Implement MVP**: sidebar **Implement** section — `src/` file tree + Monaco editor; IPC `workspace:src:list-tree` / read / save with path confinement to `src/`.
- **Workspace bootstrap**: creates workspace folder structure and starter post via `features/blog`.
- **Typed IPC + security boundary**: `shared` owns IPC/types; preload exposes `window.emprint`.
- **Core file operations**: list/read/save posts via IPC.
- **Frameless custom titlebar**: window controls via IPC.
- **GitHub OAuth (Device Flow) MVP**: Wizard can sign in via device code; token is stored in app userData.
- **GitHub repo auto-create MVP**: Hub can create a repo via GitHub API and wire `origin`.
- **Initial commit + push MVP**: Hub can optionally do an initial commit + push after workspace create.

Not implemented yet (major gaps):

- Git installation / detection / fallback.
- Secure token storage (keychain) + revoke UX.
- Clone existing repo flow in Hub.
- Full git operations UX (status/commit/push/pull) beyond initial sync.
- GitHub Pages provisioning + Actions pipeline + deployment status.

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

- `git:detect` IPC returning `available`, `version`, `path`.
- `git:setup` workflow (OS‑specific) and “ready” state stored in app state.

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
  - Logout

Scopes:

- repo creation/push: usually `repo` (private) or `public_repo` (public only)
- Pages + Actions: may require additional scopes depending on API endpoints used

### C) GitHub repo creation + remote wiring (Wizard step)

**Goal**: user can create remote repo and connect it to the local workspace from inside the app.

Deliverables:

- API calls:
  - Create repository (name, visibility, description)
  - Optionally create default branch conventions (main)
- Local git commands via `simple-git`:
  - `git init` (or clone)
  - `git remote add origin <url>`
  - initial commit
  - first push
- UX:
  - Choose public/private
  - Repo name + org/user selection
  - Success screen with repo URL

### D) Git operations inside the app (commit/push/pull/status)

**Goal**: app can show dirty state, stage/commit/push, and pull updates safely.

Deliverables:

- IPC:
  - `git:status`
  - `git:commit`
  - `git:push`
  - `git:pull`
- UI:
  - small status indicator (dirty/clean, branch)
  - commit message input + commit button
  - push button + progress/errors

### E) GitHub Pages provisioning + deployment pipeline (the “2번”)

**Goal**: after push, the site becomes live on GitHub Pages, and the app can show status.

Recommended MVP strategy:

1) Decide the **site output**:
   - simplest: “static site from repository” with a minimal generator that turns `/posts/*.md` into HTML
   - the current app is a workspace runtime, not a site generator — but Pages needs a build output.

2) Add a **Pages build workflow**:
   - Generate a GitHub Actions workflow file into the repo (e.g. `.github/workflows/deploy.yml`)
   - Workflow steps:
     - checkout
     - build site
     - upload artifact
     - deploy to Pages

3) Configure Pages through API:
   - Enable Pages + set build/deploy source to GitHub Actions (recommended modern approach)

4) Surface deployment status in app:
   - Poll Actions runs / Pages deployment status
   - Show: queued/running/success/fail + link to logs
   - Show final Pages URL

Deliverables:

- “Deploy” command in app that:
  - ensures workflow exists (creates/updates it)
  - commits workflow changes (if needed)
  - pushes
  - enables Pages
  - monitors the run

Notes:

- This is the largest chunk of remaining work because it introduces a build system.
- Keep it minimal and deterministic. The initial generator should be intentionally simple.

---

## Suggested implementation order (critical path)

1) **Git detect + guided install** (otherwise everything blocks).
2) **GitHub OAuth Device Flow + token store**.
3) **Repo create/clone + remote wiring**.
4) **Commit/push UX**.
5) **Static site generator (minimal)** + **Actions workflow generator**.
6) **Pages enablement + deployment status UI**.
7) Polish: retries, error states, and “recover from partial setup”.

---

## Local end-to-end test guide (Wizard → Hub → Workspace create)

This section is meant to be copy/paste runnable so you can test the full onboarding flow from scratch.

### 0) Prerequisites

- `git` must be available on PATH (auto-install is not implemented yet).
- You need a GitHub OAuth App **Client ID** with **Device Flow enabled**.

In the current open-source friendly flow, the user provides this **inside the Wizard** (no env var required).

Then install and start dev (root `postinstall` runs **`patch-package`** for `vite-plugin-monaco-editor` + current Node.js):

```bash
npm install
npm run dev
```

### 1) Wizard: GitHub login

In the app:

- Step “Git 준비”: confirm (temporary button; git detect/setup is TODO)
- Step “GitHub 로그인”:
  - Click “GitHub로 로그인”
  - A browser window opens to GitHub verification
  - Copy/paste the shown user code and approve
  - The app will poll and then show “Connected: <login>”
- Step “루트 폴더”: choose a root folder where multiple repos/workspaces live
- Finish

Notes:

- Token is stored at `app.getPath('userData')/github-session.json` in MVP form.
- Logout exists via IPC but no dedicated UI yet (next polish item).

### 2) Hub: create a workspace mapped 1:1 to a GitHub repo

In Hub:

- Click “새 워크스페이스 만들기”
- Fill:
  - Title
  - Repository name (slug)
  - (Optional) Description
- Keep “GitHub에 레포도 만들기” ON (recommended)
- Set:
  - Owner (user/org)
  - Visibility (public/private)
  - Initial push ON (recommended)
- Click “생성”

Expected results:

- A new repo is created on GitHub.
- A new local folder is created under the selected root folder with workspace structure + starter post.
- `origin` is set to the created repo’s HTTPS clone URL.
- The app makes an initial commit and pushes to `main` (MVP uses HTTPS token remote for the first push).
- Catalog is updated and the app enters the workspace UI.

### 3) Smoke checks inside the created workspace

- Posts list shows the starter post under `posts/`.
- Open the post → viewer works.
- Enter edit mode → TipTap editor works.
- Save → changes persist to disk.
- **Implement**: open section **4** (or click **Implement**); `src/` tree loads; open a file → Monaco shows content; save (or ⌘/Ctrl+S) persists under `src/`. If you see **“Workspace source API unavailable”**, quit the app completely and restart `npm run dev` so preload reloads.

Troubleshooting:

- If GitHub auth fails, confirm you pasted a valid **OAuth Client ID** in the Wizard and enabled **Device Flow** on the OAuth App.
- If repo creation fails for an org owner, ensure the OAuth app/token has permission for that org.
- If initial push fails, check:
  - git availability
  - repo exists and you have permission
  - remote URL is HTTPS `github.com/...` (MVP only supports GitHub HTTPS for authenticated push)

## Work breakdown (actionable checklist)

### Git

- [ ] Implement `git:detect` IPC (version/path).
- [ ] Implement `git:setup` UX per OS (guided install at minimum).
- [ ] Add “Git ready” state to Wizard gating logic.

### GitHub Auth

- [x] Add IPC channels + types for GitHub Device Flow.
- [x] Implement device flow in main process (fetch `device/code`, poll `oauth/access_token`).
- [x] Store token (MVP JSON store; keychain is next).
- [x] Add “whoami” call to show signed-in account in wizard.
- [x] Add logout (IPC).
- [ ] Add a real logout button in UI + revoke token UX.

### Repo setup

- [x] Create remote repo via GitHub API.
- [x] Local init + remote add + initial commit + push (MVP initial sync).
- [ ] Clone existing repo flow (Hub).

### Git operations UI

- [ ] Working tree status indicator.
- [ ] Commit message + commit.
- [ ] Push/pull buttons + progress/errors.

### Pages / Deploy

- [ ] Decide minimal site generator (input: `posts/*.md` → output: `dist/`).
- [ ] Add generator code (likely in `features/blog` or a new `features/site`).
- [ ] Write `.github/workflows/deploy.yml` into repo during “Deploy enable”.
- [ ] Enable Pages via GitHub API for the repo.
- [ ] Poll Actions/Pages deployment status + show link to live URL.

---

## Rough completion estimate (from current baseline)

Given the current baseline is strong for “editor + local workspace”, but missing the entire “Git/GitHub/Deploy” critical path:

- **Overall toward desired level (with Pages live)**: ~**20% complete**
- Remaining work is dominated by **Auth + Git automation + Pages pipeline**.

