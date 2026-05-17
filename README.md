<div align="center">

**[English](#english)** · **[한국어](#korean)**

<h1>
  <img src="apps/desktop/src/renderer/src/asset/image/emprint-simple-logo.svg" width="40" height="40" alt="" style="vertical-align: text-bottom; margin-right: 0.4em; margin-bottom: -10px;" />
  Emprint
</h1>

*Just show you. Don't submit your result.*

[![Website](https://img.shields.io/badge/website-emprint--home-1a1a1a?style=flat-square&logo=githubpages&logoColor=white)](https://minhyeongson.github.io/emprint-home)
[![Guide](https://img.shields.io/badge/guide-document-44403c?style=flat-square&logo=bookstack&logoColor=white)](https://minhyeongson.github.io/emprint-home/document/)
[![Version](https://img.shields.io/badge/version-0.1.0-e85d04?style=flat-square)](https://github.com/MinhyeongSon/emprint/releases)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20x64-000000?style=flat-square&logo=apple&logoColor=white)](https://minhyeongson.github.io/emprint-home/#downloads)
[![Windows](https://img.shields.io/badge/Windows-x64-0078D6?style=flat-square&logo=windows&logoColor=white)](https://minhyeongson.github.io/emprint-home/#downloads)
[![License](https://img.shields.io/badge/license-Source--Available-6b7280?style=flat-square)](LICENSE)

[Install](https://minhyeongson.github.io/emprint-home/#downloads) · [Homepage](https://minhyeongson.github.io/emprint-home) · [User guide](https://minhyeongson.github.io/emprint-home/document/)

</div>

---

## English

<a id="english"></a>

### What Emprint is

Emprint is a **desktop app** where a folder on your computer becomes your studio.  
Write, shape your site, and **Publish** to put **your own homepages (workspaces)** on GitHub Pages—you can keep more than one.

It is closer to a **quiet personal archive** than an algorithmic feed or a scoreboard.  
Each publish leaves a mark on the **Imprint** timeline—a story of *when* you sent *what*, not just a git log.

### What you can do today

#### First launch — Setup Wizard

| | |
|---|---|
| **Git** | If Git is missing, follow OS-specific install steps, then retry |
| **GitHub** | Sign in with Device Flow (approve in the browser, continue in the app) |
| **Workspace root** | Choose the parent folder where workspaces will live |

#### Hub — manage multiple homepages

- Browse, open, and remove workspaces from the catalog
- **New workspace**: Column-style site + optional automatic **public** GitHub repo
- After your first **Publish**, see the GitHub Pages URL on the Hub card
- Switch between several “homepages of your own” from one Hub (anthology metaphor)

#### Writing — Posts · Drafts

- Manage posts under **Posts** / **Drafts**; move or delete between folders
- List → markdown preview → edit in **TipTap** and save
- Title, tags, and draft flag live in frontmatter
- **Publish** is blocked while the editor has unsaved changes

#### Assets — images

- Save, list, and delete images under `assets/images/`
- Image library you can reference from posts

#### Design — site styling in the same flow as writing

| Mode | What you can do |
|------|-----------------|
| **Template** | Apply Warm / Dark / Light presets to global site styles |
| **Code** | File tree for Astro site `src/` + Monaco edit, create, rename, delete |
| **Preview** | Run the site locally and open in the browser (`localhost:4321`) |
| **AI prompt** | Copy a prompt for external AI tools (no in-app LLM calls) |

#### Publish · Imprint — send and publication history

- **Publish**: stage, commit, and push to GitHub with a message
- **Imprint**: a publication timeline in plain language—not a raw `git log`
- New workspaces include a GitHub Actions workflow for Pages deploy after push

#### App-wide

- **Dark / Light / Warm** themes; **English / Korean** UI
- **Command palette** (`Ctrl`/`Cmd` + `K`)
- Sidebar shortcuts `1`–`6`: Posts · Drafts · Assets · Design · Imprint · Settings
- GitHub log out; OAuth Client ID & Secret in Settings (also in Wizard)
- On window close or quit: optional log-out prompt for shared PCs

### Install

Installers for **macOS (Apple Silicon · Intel)** and **Windows (x64)** are on the homepage:

👉 **[Download & install](https://minhyeongson.github.io/emprint-home/#downloads)**

After install: **Wizard** (Git · GitHub · folder) → **Hub** → write, Design, **Publish** in a workspace.

See the **[user guide](https://minhyeongson.github.io/emprint-home/document/)** for how to use the app.

---

## 한국어

<a id="korean"></a>

### Emprint가 하는 일

Emprint는 **내 컴퓨터 안의 폴더**가 곧 작업실이 되는 데스크톱 앱입니다.  
글을 쓰고, 사이트 모양을 다듬고, **Publish**로 내면 GitHub Pages에 올라갈 수 있는 **나만의 홈페이지(워크스페이스)** 를 여러 개 만들 수 있습니다.

알고리즘 피드나 점수 경쟁이 아니라, **조용한 개인 아카이브**에 가깝습니다.  
한 번 남긴 출판 기록은 **Imprint** 타임라인에서 “언제 무엇을 보냈는지”의 이야기로 이어집니다.

### 지금 앱에서 할 수 있는 것

#### 처음 켤 때 — Setup Wizard

| | |
|---|---|
| **Git 준비** | 설치되어 있지 않으면 OS별 설치 방법 안내 후 다시 확인 |
| **GitHub 로그인** | Device Flow로 브라우저에서 승인 후 앱에서 계속 작업 |
| **작업 루트** | 워크스페이스 폴더들이 모일 상위 디렉터리 선택 |

#### Hub — 여러 홈페이지(워크스페이스) 관리

- 카탈로그에서 워크스페이스 목록 보기 · 열기 · 목록에서 제거
- **새 워크스페이스** 만들기: Column 형식 사이트 + (선택) GitHub **public** 저장소 자동 생성
- 첫 **Publish**까지 이어지면 GitHub Pages 주소를 Hub 카드에서 확인
- 여러 개의 “나만의 홈페이지”를 한 Hub에서 전환하며 관리 (앤솔로지 개념)

#### 글쓰기 — Posts · Drafts

- **Posts** / **Drafts** 폴더로 글 목록 관리, 서로 이동 · 삭제
- 목록 → 읽기(마크다운 미리보기) → **TipTap** 편집기로 작성 · 저장
- 제목, 태그, 초안(draft) 여부는 글 앞머리(frontmatter)로 관리
- 저장하지 않은 편집 중에는 Publish를 막아 실수 방지

#### Assets — 이미지

- `assets/images/` 아래에 이미지 저장 · 목록 · 삭제
- 글에서 참조할 수 있는 이미지 라이브러리

#### Design — 글과 같은 흐름에서 사이트 꾸미기

| 모드 | 할 수 있는 일 |
|------|----------------|
| **Template** | Warm / Dark / Light 프리셋으로 사이트 전역 스타일 적용 |
| **Code** | Astro 사이트 소스(`src/`) 파일 트리 + Monaco 편집 · 생성 · 이름 변경 · 삭제 |
| **미리보기** | 로컬에서 사이트 실행 후 브라우저로 확인 (`localhost:4321`) |
| **AI prompt** | 외부 AI 도구에 넘길 수정 요청 문장 복사 (앱 안에서 LLM 호출은 하지 않음) |

#### Publish · Imprint — 보내기와 출판 기록

- **Publish**: 변경 사항을 한 번에 커밋하고 GitHub로 push (메시지 입력)
- **Imprint**: 출판 타임라인 — “언제 무엇을 보냈는지”를 Git 용어 없이 레인 UI로 표시
- 워크스페이스 생성 시 GitHub Actions로 Pages 배포 워크플로 포함 (push 후 사이트 반영)

#### 앱 전반

- **다크 / 라이트 / 웜** 테마, **한국어 / English** UI
- **Command palette** (`Ctrl`/`Cmd` + `K`) — 빠른 이동
- 사이드바 단축키 `1`–`6`: Posts · Drafts · Assets · Design · Imprint · Settings
- 설정에서 GitHub 로그아웃, OAuth Client ID·Secret 저장 (Wizard에서도 설정 가능)
- 창 닫기 · 앱 종료 시 공용 PC 안내(로그아웃 선택 가능)

### 설치

macOS(Apple Silicon · Intel) · Windows 설치 파일은 **홈페이지**에서 받습니다.

👉 **[다운로드 · 설치](https://minhyeongson.github.io/emprint-home/#downloads)**

설치 후 첫 실행 → **Wizard**(Git · GitHub · 작업 폴더) → **Hub** → 워크스페이스에서 글쓰기 · Design · Publish.

사용 방법은 **[사용 가이드](https://minhyeongson.github.io/emprint-home/document/)** 에서 확인할 수 있습니다.

---

## License

Source-available — see [LICENSE](LICENSE).
