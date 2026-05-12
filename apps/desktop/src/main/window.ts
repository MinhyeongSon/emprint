import path from 'node:path'
import { existsSync } from 'node:fs'
import { BrowserWindow, app, nativeImage, shell } from 'electron'

// Prefer PNG for runtime use: nativeImage.createFromPath is most reliable with PNG
// across platforms (some Electron versions return an empty image for .icns).
const ICON_NAMES = [
  'AppIcon1024.png',
  'AppIcon512.png',
  'AppIcon256.png',
  'AppIcon128.png'
] as const

function resolveAppIconPath(): string | null {
  const candidates = ICON_NAMES.flatMap((name) => [
    path.join(app.getAppPath(), 'src/renderer/src/asset/icon', name),
    path.join(__dirname, '../../src/renderer/src/asset/icon', name),
    path.join(process.resourcesPath, name)
  ])

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

export function createMainWindow(): BrowserWindow {
  const iconPath = resolveAppIconPath()
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : undefined

  // On macOS, the dock/app switcher icon is separate from the window icon.
  if (process.platform === 'darwin' && icon && !icon.isEmpty() && app.dock) {
    try {
      app.dock.setIcon(icon)
    } catch {
      // ignore
    }
  }

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#f4efe6',
    frame: false,
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(process.platform !== 'darwin' && icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return window
}
