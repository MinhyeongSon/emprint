import { app, BrowserWindow } from 'electron'
import { createMainWindow } from './window'
import { setupIpcHandlers } from './ipc'
import { registerAssetProtocolHandler, registerAssetProtocolPrivilege } from './asset-protocol'

let mainWindow: BrowserWindow | null = null

// Must run before app `ready` to register the scheme as standard/secure.
registerAssetProtocolPrivilege()

app.whenReady().then(async () => {
  setupIpcHandlers()
  registerAssetProtocolHandler()
  mainWindow = createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
