/**
 * Generates the icon files electron-builder expects under `build/`.
 *
 * Source of truth lives next to the renderer (`apps/desktop/src/renderer/src/asset/icon`)
 * because the same images are used by the running app. From those PNG/ICNS
 * sources we produce:
 *
 *   build/icon.icns  -> macOS (copied from AppIcon.icns)
 *   build/icon.png   -> Linux (1024 PNG; electron-builder also derives smaller sizes)
 *   build/icon.ico   -> Windows (multi-resolution .ico assembled from 16/32/64/128/256 PNGs)
 *
 * Run via `npm run build:icons`. It is invoked automatically before
 * `pack` / `dist` to keep packaging reproducible without committing
 * generated binaries.
 */
import { chmod, mkdir, copyFile, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngToIco from 'png-to-ico'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..')
const iconsSrc = path.join(repoRoot, 'apps/desktop/src/renderer/src/asset/icon')
const buildDir = path.join(repoRoot, 'build')

await mkdir(buildDir, { recursive: true })

await copyFile(path.join(iconsSrc, 'AppIcon.icns'), path.join(buildDir, 'icon.icns'))
await copyFile(path.join(iconsSrc, 'AppIcon1024.png'), path.join(buildDir, 'icon.png'))

// `.ico` tops out at 256x256 per image, so we feed the 16/32/64/128/256 PNGs
// to png-to-ico which packs them into a single multi-resolution ICO.
const icoSources = ['AppIcon16.png', 'AppIcon32.png', 'AppIcon64.png', 'AppIcon128.png', 'AppIcon256.png']
const buffers = await Promise.all(icoSources.map((name) => readFile(path.join(iconsSrc, name))))
const ico = await pngToIco(buffers)
await writeFile(path.join(buildDir, 'icon.ico'), ico)

const pkgPostinstall = path.join(buildDir, 'pkg-scripts/postinstall')
try {
  await chmod(pkgPostinstall, 0o755)
} catch {
  /* optional until build/pkg-scripts/postinstall is added */
}

console.log(`[emprint] Build icons written to ${path.relative(repoRoot, buildDir)}/`)
