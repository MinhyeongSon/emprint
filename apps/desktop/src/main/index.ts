import path from 'node:path'
import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { registerAppCloseGuard, setupIpcHandlers } from './ipc'
import { registerAssetProtocolHandler, registerAssetProtocolPrivilege } from './asset-protocol'

let mainWindow: BrowserWindow | null = null

/** Playwright/CDP teardown can close stdout before Electron finishes logging (harmless EPIPE). */
function ignoreBrokenPipe(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'EPIPE'
  )
}

for (const stream of [process.stdout, process.stderr]) {
  stream?.on?.('error', (err) => {
    if (ignoreBrokenPipe(err)) return
  })
}

if (process.env.EMPRINT_QA_MODE === '1') {
  process.on('uncaughtException', (err) => {
    if (ignoreBrokenPipe(err)) return
  })
}

/** Isolated userData for emprint-qa (Electron 40+ rejects --user-data-dir on CLI). */
const qaUserDataDir = process.env.EMPRINT_QA_USER_DATA?.trim()
if (qaUserDataDir) {
  app.setPath('userData', path.resolve(qaUserDataDir))
}

/** CDP for Playwright QA (CLI --remote-debugging-port is rejected on Electron 30+). */
const qaCdpPort = process.env.EMPRINT_QA_CDP_PORT?.trim()
if (qaCdpPort) {
  app.commandLine.appendSwitch('remote-debugging-port', qaCdpPort)
}

// Must run before app `ready` to register the scheme as standard/secure.
registerAssetProtocolPrivilege()

app.whenReady().then(async () => {
  setupIpcHandlers()
  registerAssetProtocolHandler()
  mainWindow = createMainWindow()
  registerAppCloseGuard(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
      registerAppCloseGuard(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
