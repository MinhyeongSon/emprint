<div align="center">

# Emprint

**과정까지 남기는 개인 출판 공간** — 결과물만이 아니라, 쓰고 고치고 보낸 흔적을 한곳에 쌓습니다.

[![Website](https://img.shields.io/badge/🌐_홈페이지-emprint--home-1a1a1a?style=for-the-badge&logo=githubpages&logoColor=white)](https://minhyeongson.github.io/emprint-home)
[![Document](https://img.shields.io/badge/📖_사용_가이드-document-44403c?style=for-the-badge)](https://minhyeongson.github.io/emprint-home/document/)
[![Version](https://img.shields.io/badge/버전-0.1.0-e85d04?style=flat-square)](https://github.com/MinhyeongSon/emprint/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple_Silicon_·_Intel-000000?style=flat-square&logo=apple)](https://minhyeongson.github.io/emprint-home/#downloads)
[![Windows](https://img.shields.io/badge/Windows-x64-0078D6?style=flat-square&logo=windows)](https://minhyeongson.github.io/emprint-home/#downloads)
[![License](https://img.shields.io/badge/license-Source--Available-6b7280?style=flat-square)](LICENSE)

*Just show you. Don't submit your result.*

[설치하기](https://minhyeongson.github.io/emprint-home/#downloads) · [홈페이지](https://minhyeongson.github.io/emprint-home) · [사용 가이드](https://minhyeongson.github.io/emprint-home/document/)



</div>

---

## Emprint가 하는 일

Emprint는 **내 컴퓨터 안의 폴더**가 곧 작업실이 되는 데스크톱 앱입니다.  
글을 쓰고, 사이트 모양을 다듬고, **Publish**로 내면 GitHub Pages에 올라갈 수 있는 **나만의 홈페이지(워크스페이스)** 를 여러 개 만들 수 있습니다.

알고리즘 피드나 점수 경쟁이 아니라, **조용한 개인 아카이브**에 가깝습니다.  
한 번 남긴 출판 기록은 **Imprint** 타임라인에서 “언제 무엇을 보냈는지”의 이야기로 이어집니다.

---

## 지금 앱에서 할 수 있는 것

### 처음 켤 때 — Setup Wizard

| | |
|---|---|
| **Git 준비** | 설치되어 있지 않으면 OS별 설치 방법 안내 후 다시 확인 |
| **GitHub 로그인** | Device Flow로 브라우저에서 승인 후 앱에서 계속 작업 |
| **작업 루트** | 워크스페이스 폴더들이 모일 상위 디렉터리 선택 |

### Hub — 여러 홈페이지(워크스페이스) 관리

- 카탈로그에서 워크스페이스 목록 보기 · 열기 · 목록에서 제거
- **새 워크스페이스** 만들기: Column 형식 사이트 + (선택) GitHub **public** 저장소 자동 생성
- 첫 **Publish**까지 이어지면 GitHub Pages 주소를 Hub 카드에서 확인
- 여러 개의 “나만의 홈페이지”를 한 Hub에서 전환하며 관리 (앤솔로지 개념)

### 글쓰기 — Posts · Drafts

- **Posts** / **Drafts** 폴더로 글 목록 관리, 서로 이동 · 삭제
- 목록 → 읽기(마크다운 미리보기) → **TipTap** 편집기로 작성 · 저장
- 제목, 태그, 초안(draft) 여부는 글 앞머리(frontmatter)로 관리
- 저장하지 않은 편집 중에는 Publish를 막아 실수 방지

### Assets — 이미지

- `assets/images/` 아래에 이미지 저장 · 목록 · 삭제
- 글에서 참조할 수 있는 이미지 라이브러리

### Design — 글과 같은 흐름에서 사이트 꾸미기

| 모드 | 할 수 있는 일 |
|------|----------------|
| **Template** | Warm / Dark / Light 프리셋으로 사이트 전역 스타일 적용 |
| **Code** | Astro 사이트 소스(`src/`) 파일 트리 + Monaco 편집 · 생성 · 이름 변경 · 삭제 |
| **미리보기** | 로컬에서 사이트 실행 후 브라우저로 확인 (`localhost:4321`) |
| **AI prompt** | 외부 AI 도구에 넘길 수정 요청 문장 복사 (앱 안에서 LLM 호출은 하지 않음) |

### Publish · Imprint — 보내기와 출판 기록

- **Publish**: 변경 사항을 한 번에 커밋하고 GitHub로 push (메시지 입력)
- **Imprint**: 출판 타임라인 — “언제 무엇을 보냈는지”를 Git 용어 없이 레인 UI로 표시
- 워크스페이스 생성 시 GitHub Actions로 Pages 배포 워크플로 포함 (push 후 사이트 반영)

### 앱 전반

- **다크 / 라이트 / 웜** 테마, **한국어 / English** UI
- **Command palette** (`Ctrl`/`Cmd` + `K`) — 빠른 이동
- 사이드바 단축키 `1`–`6`: Posts · Drafts · Assets · Design · Imprint · Settings
- 설정에서 GitHub 로그아웃, OAuth Client ID·Secret 저장 (Wizard에서도 설정 가능)
- 창 닫기 · 앱 종료 시 공용 PC 안내(로그아웃 선택 가능)

---

## 아직 준비 중인 것

다음은 로드맵에 있으나 **아직 앱에 없거나** 곧 다듬을 부분입니다.

- Imprint에서 **이전 출판 시점으로 되돌리기**(rollback)
- 편집 중인 내용만 **초안 폐기**(Reset draft)
- 다른 기기에서 push한 뒤 **자동으로 원격 변경 가져오기**
- Publish 직후 **배포(Actions/Pages) 상태**를 앱 안에서 보기

자세한 진행 상황은 [`docs/ROADMAP.md`](docs/ROADMAP.md)를 참고하세요.

---

## 설치

**일반 사용자** — 빌드된 설치 파일:

👉 **[홈페이지 Downloads](https://minhyeongson.github.io/emprint-home/#downloads)** (macOS Apple Silicon / Intel, Windows x64)

**개발자** — 소스에서 실행:

```bash
git clone https://github.com/MinhyeongSon/emprint.git
cd emprint
npm install
npm run dev
```

첫 실행 → **Wizard** (Git · GitHub · 폴더) → **Hub** → 워크스페이스 안에서 글쓰기 · Design · Publish.

패키징: `npm run dist` · `dist:mac` · `dist:win` · `dist:linux`

---

## 더 읽어보기

| 문서 | 내용 |
|------|------|
| [홈페이지](https://minhyeongson.github.io/emprint-home) | 제품 소개 · 철학 · 설치 |
| [사용 가이드](https://minhyeongson.github.io/emprint-home/document/) | 사용자 문서 |
| [`docs/README.md`](docs/README.md) | 저장소 내 문서 색인 (개발·기획) |

---

## License

Source-available — see [LICENSE](LICENSE).
