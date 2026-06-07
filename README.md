<div align="center">

**[English](#english)** · **[한국어](#korean)**

<h1>
  <img src="apps/desktop/src/renderer/src/asset/image/emprint-simple-logo.svg" width="40" height="40" alt="" style="vertical-align: text-bottom; margin-right: 0.4em; margin-bottom: -10px;" />
  Emprint
</h1>

*Just show you. Don't submit your result.*

[![Website](https://img.shields.io/badge/website-emprint--home-1a1a1a?style=flat-square&logo=githubpages&logoColor=white)](https://devminson.github.io/emprint-home)
[![Guide](https://img.shields.io/badge/guide-document-44403c?style=flat-square&logo=bookstack&logoColor=white)](https://devminson.github.io/emprint-home/document/)
[![Version](https://img.shields.io/badge/version-0.3.0-e85d04?style=flat-square)](https://github.com/devminson/emprint-release/releases)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20x64-000000?style=flat-square&logo=apple&logoColor=white)](https://devminson.github.io/emprint-home/#downloads)
[![Windows](https://img.shields.io/badge/Windows-x64-0078D6?style=flat-square&logo=windows&logoColor=white)](https://devminson.github.io/emprint-home/#downloads)
[![License](https://img.shields.io/badge/license-Source--Available-6b7280?style=flat-square)](LICENSE)

[Install](https://devminson.github.io/emprint-home/#downloads) · [Homepage](https://devminson.github.io/emprint-home) · [User guide](https://devminson.github.io/emprint-home/document/)

</div>

---

## English

<a id="english"></a>

### What Emprint is

Emprint is a **desktop app** where a folder on your computer becomes your studio.  
Write, shape your site, and **Publish** to put **your own anthologies** on GitHub Pages—you can keep more than one.

It is closer to a **quiet personal archive** than an algorithmic feed or a scoreboard.  
Each publish leaves a mark on the **Imprint** timeline—a story of *when* you sent *what*, not just a git log.

### What you can do today

#### First launch — Setup Wizard

| | |
|---|---|
| **Git** | If Git is missing, follow OS-specific install steps, then retry |
| **Node.js** | Design preview needs **Node 22+** — install via OS commands or [nodejs.org](https://nodejs.org), then retry |
| **GitHub** | Sign in with Device Flow (approve in the browser, continue in the app) |
| **Workspace root** | Choose the parent folder where workspaces will live |

#### Anthologies Hub — manage your anthologies

- Browse, open, and remove anthologies from the catalog
- **New anthology**: choose **anthology type** (Column, Memoir, Dictionary, Fragments, or Book) + **title** and **slug** (folder + GitHub repo name) + optional automatic **public** GitHub repo
- After your first **Publish**, see the GitHub Pages URL on the hub card
- Platform-wide settings (e.g. custom domain) are planned for the hub layer

#### Writing

| Format | Content |
|--------|---------|
| **Column** | **Posts** / **Drafts** — markdown posts with frontmatter (title, tags, draft) |
| **Memoir** | **Sections** — portfolio blocks composed in the app |
| **Dictionary** | **Index** + **Knowledge** — hierarchical topics and markdown entries |
| **Fragments** | **Artwork** — image gallery (JPEG shelf or grid layout on the site) |
| **Book** | **Story** — single `story/story.md` (page breaks with `---` for paginated layout) |

- List → preview → edit in **TipTap** and save (Book opens the editor directly)
- **Publish** is blocked while the editor has unsaved changes

#### Assets — images

- Save, list, and delete images under `assets/images/`
- Image library you can reference from posts

#### Design — site styling in the same flow as writing

| Mode | What you can do |
|------|-----------------|
| **Template** | Layout composition + **Emprint** / **Paper & Ink** palettes → `config/theme.json` |
| **Code** | Site project tree (`config/`, `src/`, …) + Monaco; install site deps for preview |
| **Preview** | Run the site locally and open in the browser (`localhost:4321`) |
| **AI prompt** | Copy a prompt for external AI tools (no in-app LLM calls) |

Published sites let **readers** switch System / Light / Dark (header toggle, or a floating control on **Book**). Optional **landing intro** overlay before the site chrome (not on Book).

#### Publish · Imprint — send and publication history

- **Publish**: stage, commit, and push to GitHub with a message
- **Update** from remote when GitHub is ahead; overwrite local when histories diverged
- **Imprint**: publication timeline; **Rollback** to a past snapshot; **Reset draft** for uncommitted edits
- New workspaces include a GitHub Actions workflow for Pages deploy after push

#### App-wide

- **Emprint** / **Paper & Ink** palettes and **light / dark** chrome; **English / Korean** UI
- **Command palette** (`Ctrl`/`Cmd` + `K`)
- Sidebar shortcuts vary by format (e.g. Column `1`–`6`, Book: Story · Design · Imprint · Settings)
- GitHub log out; OAuth Client ID & Secret in Settings (also in Wizard)
- On window close or quit: optional log-out prompt for shared PCs

### Install

**Recommended (package managers)** — fewer download warnings than a raw installer from the browser:

```bash
# macOS
brew tap devminson/emprint
brew install --cask emprint
```

```powershell
# Windows (Scoop)
scoop bucket add emprint https://github.com/devminson/scoop-emprint
scoop install emprint
```

Design preview needs **Node.js 22+** (`brew install node` or `scoop install nodejs-lts`).

**Manual installers** (macOS `.pkg` / Windows Setup.exe) are on the homepage:

👉 **[Download & install](https://devminson.github.io/emprint-home/#downloads)**

After install: **Wizard** (Git · Node · GitHub · anthologies root) → **Anthologies Hub** → open an anthology → write, Design, **Publish**.

**macOS (unsigned build):** The `.pkg` installer runs a postinstall script (quarantine removal + ad-hoc sign). If Gatekeeper still blocks, try **Right-click → Open** once, or `xattr -dr com.apple.quarantine /Applications/Emprint.app`.

**Windows:** Installers use **NSIS** (electron-builder). **Inno Setup is not supported.** Reducing SmartScreen warnings long-term requires an **Authenticode** certificate (`CSC_LINK`); Scoop install is the lighter-weight option.

See the **[user guide](https://devminson.github.io/emprint-home/document/)** for how to use the app.

---

## 한국어

<a id="korean"></a>

### Emprint가 하는 일

Emprint는 **내 컴퓨터 안의 폴더**가 곧 작업실이 되는 데스크톱 앱입니다.  
글을 쓰고, 사이트 모양을 다듬고, **Publish**로 내면 GitHub Pages에 올라갈 수 있는 **나만의 앤솔로지**를 여러 개 만들 수 있습니다.

알고리즘 피드나 점수 경쟁이 아니라, **조용한 개인 아카이브**에 가깝습니다.  
한 번 남긴 출판 기록은 **Imprint** 타임라인에서 “언제 무엇을 보냈는지”의 이야기로 이어집니다.

### 지금 앱에서 할 수 있는 것

#### 처음 켤 때 — Setup Wizard

| | |
|---|---|
| **Git 준비** | 설치되어 있지 않으면 OS별 설치 방법 안내 후 다시 확인 |
| **Node.js** | Design 미리보기에 **Node 22+** 필요 — OS 안내대로 설치 후 다시 확인 |
| **GitHub 로그인** | Device Flow로 브라우저에서 승인 후 앱에서 계속 작업 |
| **작업 루트** | 워크스페이스 폴더들이 모일 상위 디렉터리 선택 |

#### 앤솔로지 허브 (Anthologies Hub)

- 카탈로그에서 앤솔로지 목록 보기 · 열기 · 제거
- **새 앤솔로지**: **앤솔로지 타입**(Column · Memoir · Dictionary · Fragments · Book) + **제목** · **슬러그**(폴더·GitHub repo) + (선택) **public** 저장소 자동 생성
- 첫 **Publish** 후 GitHub Pages 주소를 허브 카드에서 확인
- 도메인 등 플랫폼 설정은 허브 레이어에서 확장 예정

#### 글쓰기

| 형식 | 콘텐츠 |
|------|--------|
| **Column** | **Posts** / **Drafts** — frontmatter(제목, 태그, 초안)가 있는 마크다운 글 |
| **Memoir** | **Sections** — 앱에서 구성하는 포트폴리오 섹션 |
| **Dictionary** | **Index** + **Knowledge** — 주제 트리와 지식 항목 |
| **Fragments** | **Artwork** — 이미지 갤러리(LP 선반 또는 그리드) |
| **Book** | **Story** — 단일 `story/story.md` (`---`로 페이지 나누기) |

- 목록 → 미리보기 → **TipTap** 편집 · 저장 (Book은 바로 편집기)
- 저장하지 않은 편집 중에는 Publish를 막아 실수 방지

#### Assets — 이미지

- `assets/images/` 아래에 이미지 저장 · 목록 · 삭제
- 글에서 참조할 수 있는 이미지 라이브러리

#### Design — 글과 같은 흐름에서 사이트 꾸미기

| 모드 | 할 수 있는 일 |
|------|----------------|
| **Template** | 레이아웃 구성 + **Emprint** / **Paper & Ink** 팔레트 → `config/theme.json` 적용 |
| **Code** | 사이트 프로젝트 트리(`config/`, `src/` 등) + Monaco · 의존성 설치 후 미리보기 |
| **미리보기** | 로컬에서 사이트 실행 후 브라우저로 확인 (`localhost:4321`) |
| **AI prompt** | 외부 AI 도구에 넘길 수정 요청 문장 복사 (앱 안에서 LLM 호출은 하지 않음) |

배포된 사이트에서 **방문자**가 시스템/라이트/다크를 고릅니다(헤더 또는 **Book**의 플로팅 버튼). **랜딩 인트로**는 Book을 제외한 형식에서 선택 가능합니다.

#### Publish · Imprint — 보내기와 출판 기록

- **Publish**: 변경 사항을 한 번에 커밋하고 GitHub로 push (메시지 입력)
- 원격이 앞서 있으면 **Update**; 이력이 갈라지면 로컬 덮어쓰기
- **Imprint**: 출판 타임라인 · 항목 **Rollback** · 미저장 변경 **초안 되돌리기**
- 워크스페이스 생성 시 GitHub Actions로 Pages 배포 워크플로 포함 (push 후 사이트 반영)

#### 앱 전반

- **Emprint** / **Paper & Ink** 팔레트와 **라이트 / 다크** UI, **한국어 / English**
- **Command palette** (`Ctrl`/`Cmd` + `K`) — 빠른 이동
- 형식마다 다른 사이드바 단축키 (예: Book — Story · Design · Imprint · Settings)
- 설정에서 GitHub 로그아웃, OAuth Client ID·Secret 저장 (Wizard에서도 설정 가능)
- 창 닫기 · 앱 종료 시 공용 PC 안내(로그아웃 선택 가능)

### 설치

**권장(패키지 매니저)** — 브라우저에서 설치 파일을 직접 받는 것보다 경고가 적은 경우가 많습니다.

```bash
# macOS
brew tap devminson/emprint
brew install --cask emprint
```

```powershell
# Windows (Scoop)
scoop bucket add emprint https://github.com/devminson/scoop-emprint
scoop install emprint
```

Design 미리보기에는 **Node.js 22+** 가 필요합니다 (`brew install node` 또는 `scoop install nodejs-lts`).

**수동 설치**(macOS `.pkg` · Windows Setup.exe)는 **홈페이지**에서 받을 수 있습니다.

👉 **[다운로드 · 설치](https://devminson.github.io/emprint-home/#downloads)**

설치 후 첫 실행 → **Wizard**(Git · Node · GitHub · 앤솔로지 루트) → **앤솔로지 허브** → 앤솔로지 열기 → 글쓰기 · Design · Publish.

**macOS(미서명 빌드):** `.pkg` 설치 시 postinstall에서 격리 해제·ad-hoc 서명을 시도합니다. 그래도 막히면 **우클릭 → 열기** 또는 `xattr -dr com.apple.quarantine /Applications/Emprint.app`.

**Windows:** 설치 파일은 **NSIS**(electron-builder)입니다. **Inno Setup은 지원하지 않습니다.** SmartScreen 완화에는 **Authenticode** 서명(`CSC_LINK`)이 필요하며, Scoop 설치가 대안입니다.

사용 방법은 **[사용 가이드](https://devminson.github.io/emprint-home/document/)** 에서 확인할 수 있습니다.

---

## For developers

Implementation map and IPC reference: [`docs/AGENT_BRIEF.md`](docs/AGENT_BRIEF.md) · delivery status: [`docs/ROADMAP.md`](docs/ROADMAP.md) · site CSS contracts: [`docs/component-contract.md`](docs/component-contract.md).

---

## License

Source-available — see [LICENSE](LICENSE).
