#!/usr/bin/env node
/**
 * Render Homebrew cask + Scoop manifest from release artifacts.
 * Used by .github/workflows/deploy.yml after installers are built.
 *
 * Usage:
 *   node packaging/scripts/render-package-managers.mjs \
 *     --version 0.2.10 \
 *     --tag v0.2.10 \
 *     --assets-dir release-assets \
 *     --out-dir packaging
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const RELEASE_REPO = 'devminson/emprint-release'
const HOMEPAGE = 'https://devminson.github.io/emprint-home/'

function parseArgs(argv) {
  const args = { assetsDir: 'release-assets', outDir: 'packaging' }
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i]
    const val = argv[i + 1]
    if (key === '--version' && val) {
      args.version = val
      i++
    } else if (key === '--tag' && val) {
      args.tag = val
      i++
    } else if (key === '--assets-dir' && val) {
      args.assetsDir = val
      i++
    } else if (key === '--out-dir' && val) {
      args.outDir = val
      i++
    }
  }
  if (!args.version || !args.tag) {
    console.error(
      'Usage: node packaging/scripts/render-package-managers.mjs --version <semver> --tag <vX.Y.Z> [--assets-dir dir] [--out-dir dir]'
    )
    process.exit(1)
  }
  if (!args.tag.startsWith('v')) {
    console.error(`Release tag must start with "v". Received: ${args.tag}`)
    process.exit(1)
  }
  return args
}

function walkFiles(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function sha256File(filePath) {
  const hash = createHash('sha256')
  hash.update(readFileSync(filePath))
  return hash.digest('hex')
}

function releaseUrl(tag, fileName) {
  return `https://github.com/${RELEASE_REPO}/releases/download/${tag}/${fileName}`
}

function pickAsset(files, pattern) {
  const matches = files.filter((f) => pattern.test(basename(f)) && !f.endsWith('.blockmap'))
  if (matches.length === 0) return null
  if (matches.length > 1) {
    matches.sort((a, b) => statSync(b).size - statSync(a).size)
    return matches[matches.length - 1]
  }
  return matches[0]
}

function renderCask({ version, tag, arm64, x64 }) {
  const lines = [
    'cask "emprint" do',
    `  version "${version}"`,
    '',
    '  on_arm do',
    `    sha256 "${arm64.sha256}"`,
    `    url "${releaseUrl(tag, arm64.name)}"`,
    '  end',
    '',
    '  on_intel do',
    `    sha256 "${x64.sha256}"`,
    `    url "${releaseUrl(tag, x64.name)}"`,
    '  end',
    '',
    '  name "Emprint"',
    '  desc "Local-first, Git-native workspace runtime for creators"',
    `  homepage "${HOMEPAGE}"`,
    '',
    '  app "Emprint.app"',
    '',
    '  # Casks use postflight (not formula post_install). Re-sign after install for unsigned builds.',
    '  postflight do',
    '    app = "#{appdir}/Emprint.app"',
    '    system_command "/usr/bin/xattr",',
    '                      args: ["-dr", "com.apple.quarantine", app]',
    '    system_command "/usr/bin/codesign",',
    '                      args: ["--force", "--deep", "--sign", "-", app]',
    '  end',
    '',
    '  caveats <<~EOS',
    '    Emprint requires Node.js 22+ for Design preview (npm run dev).',
    '    Install: brew install node',
    '  EOS',
    'end',
    ''
  ]
  return lines.join('\n')
}

function renderScoop({ version, tag, win }) {
  const url = releaseUrl(tag, win.name)
  const manifest = {
    version,
    description: 'Local-first, Git-native workspace runtime for creators',
    homepage: HOMEPAGE,
    license: 'LicenseRef-Emprint-Source-Available',
    notes: 'Design preview requires Node.js 22+: scoop install nodejs-lts',
    url,
    hash: `sha256:${win.sha256}`,
    // electron-builder 26+ zips win with withoutDir:true (exe at archive root, not win-unpacked/).
    bin: 'Emprint.exe',
    checkver: {
      github: `https://github.com/${RELEASE_REPO}`
    },
    autoupdate: {
      url: `https://github.com/${RELEASE_REPO}/releases/download/v$version/Emprint-$version-win-x64.zip`,
      hash: {
        url: '$url'
      }
    }
  }
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function writeOutputs(outDir, cask, scoop) {
  const caskPath = join(outDir, 'homebrew-tap', 'Casks', 'emprint.rb')
  const scoopPath = join(outDir, 'scoop-bucket', 'bucket', 'emprint.json')
  mkdirSync(join(caskPath, '..'), { recursive: true })
  mkdirSync(join(scoopPath, '..'), { recursive: true })
  writeFileSync(caskPath, cask)
  writeFileSync(scoopPath, scoop)
  console.log(`Wrote ${caskPath}`)
  console.log(`Wrote ${scoopPath}`)
}

function main() {
  const { version, tag, assetsDir, outDir } = parseArgs(process.argv)
  const files = walkFiles(assetsDir)

  const arm64File =
    pickAsset(files, /-mac-arm64\.zip$/i) ?? pickAsset(files, /-darwin-arm64\.zip$/i)
  const x64MacFile =
    pickAsset(files, /-mac-x64\.zip$/i) ?? pickAsset(files, /-darwin-x64\.zip$/i)
  const winFile =
    pickAsset(files, /-win-x64\.zip$/i) ?? pickAsset(files, /-windows-x64\.zip$/i)

  const missing = []
  if (!arm64File) missing.push('mac arm64 zip (*-mac-arm64.zip)')
  if (!x64MacFile) missing.push('mac x64 zip (*-mac-x64.zip)')
  if (!winFile) missing.push('windows zip (*-win-x64.zip)')

  if (missing.length) {
    console.error('Missing release artifacts:')
    for (const m of missing) console.error(`  - ${m}`)
    console.error('\nFiles found:')
    for (const f of files) console.error(`  ${basename(f)}`)
    process.exit(1)
  }

  const arm64 = { name: basename(arm64File), sha256: sha256File(arm64File) }
  const x64 = { name: basename(x64MacFile), sha256: sha256File(x64MacFile) }
  const win = { name: basename(winFile), sha256: sha256File(winFile) }

  console.log(`mac arm64: ${arm64.name} (${arm64.sha256.slice(0, 12)}…)`)
  console.log(`mac x64:   ${x64.name} (${x64.sha256.slice(0, 12)}…)`)
  console.log(`win x64:   ${win.name} (${win.sha256.slice(0, 12)}…)`)

  writeOutputs(outDir, renderCask({ version, tag, arm64, x64 }), renderScoop({ version, tag, win }))
}

main()
