# Package manager distribution (Homebrew + Scoop)

Release CI builds macOS/Linux/Windows installers, uploads them to [emprint-release](https://github.com/MinhyeongSon/emprint-release), then renders and publishes:

| Channel | Public repo | Install |
|---------|-------------|---------|
| Homebrew tap | [MinhyeongSon/homebrew-emprint](https://github.com/MinhyeongSon/homebrew-emprint) | `brew tap MinhyeongSon/emprint` → `brew install --cask emprint` |
| Scoop bucket | [MinhyeongSon/scoop-emprint](https://github.com/MinhyeongSon/scoop-emprint) | `scoop bucket add emprint https://github.com/MinhyeongSon/scoop-emprint` → `scoop install emprint` |

## One-time GitHub setup

1. Create two **public** empty repositories:
   - `homebrew-emprint`
   - `scoop-emprint`
2. Ensure the PAT in `RELEASE_REPO_KEY` (or `PACKAGE_MANAGERS_KEY`) can **push** to both repos and `emprint-release`.

Optional env overrides in the release workflow:

- `HOMEBREW_TAP_REPO` (default `MinhyeongSon/homebrew-emprint`)
- `SCOOP_BUCKET_REPO` (default `MinhyeongSon/scoop-emprint`)

## Artifacts used

| File | Consumer |
|------|----------|
| `Emprint-<version>-mac-arm64.zip` | Homebrew cask (`on_arm`) |
| `Emprint-<version>-mac-x64.zip` | Homebrew cask (`on_intel`) |
| `Emprint-<version>-win-x64.zip` | Scoop (`Emprint.exe` at ZIP root) |
| `Emprint-<version>-arm64.pkg` / `Emprint-<version>-x64.pkg` | Manual macOS install (postinstall: quarantine + ad-hoc sign) |
| `Emprint-Setup-<version>-x64.exe` | Manual Windows install (NSIS; Authenticode signing optional via `CSC_LINK`) |

ZIP names come from `electron-builder.yml` (`zip.artifactName`).

## Local dry-run

After `npm run dist:mac` / `npm run dist:win`:

```bash
node packaging/scripts/render-package-managers.mjs \
  --version "$(node -p "require('./package.json').version")" \
  --tag "v$(node -p "require('./package.json').version")" \
  --assets-dir "release/$(node -p "require('./package.json').version")"
```

Generated files land under `packaging/homebrew-tap/` and `packaging/scoop-bucket/`.
