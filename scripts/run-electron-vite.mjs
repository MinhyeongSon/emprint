/**
 * Run electron-vite from apps/desktop with ELECTRON_RUN_AS_NODE removed from the
 * child environment. Setting it to "" (e.g. cross-env ELECTRON_RUN_AS_NODE=)
 * still leaves the variable defined and can put Electron in Node-only mode,
 * where `electron.protocol` is unavailable.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const desktopDir = path.join(root, 'apps', 'desktop')
const electronViteCli = path.join(root, 'node_modules', 'electron-vite', 'bin', 'electron-vite.js')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = process.argv.slice(2)
const result = spawnSync(process.execPath, [electronViteCli, ...args], {
  cwd: desktopDir,
  env,
  stdio: 'inherit'
})

process.exit(result.status ?? 1)
