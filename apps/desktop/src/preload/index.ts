import { contextBridge, ipcRenderer } from 'electron'
import { ipcChannels, type EmprintDesktopApi, type GitRecoverWorkspaceProgress } from '@emprint/shared'

const siteDevApi = {
  stop: () => ipcRenderer.invoke(ipcChannels.siteDevStop),
  status: () => ipcRenderer.invoke(ipcChannels.siteDevStatus),
  openPreview: () => ipcRenderer.invoke(ipcChannels.siteDevOpenPreview)
}

const api: EmprintDesktopApi = {
  env: { platform: process.platform },
  system: {
    getRuntimeInfo: () => ipcRenderer.invoke(ipcChannels.systemGetRuntimeInfo),
    selectDirectory: () => ipcRenderer.invoke(ipcChannels.systemSelectDirectory)
  },
  github: {
    oauthClientGet: () => ipcRenderer.invoke(ipcChannels.githubOAuthClientGet),
    oauthClientSet: (input) => ipcRenderer.invoke(ipcChannels.githubOAuthClientSet, input),
    authStatus: () => ipcRenderer.invoke(ipcChannels.githubAuthStatus),
    authStart: (input) => ipcRenderer.invoke(ipcChannels.githubAuthStart, input),
    authPoll: (input) => ipcRenderer.invoke(ipcChannels.githubAuthPoll, input),
    logout: () => ipcRenderer.invoke(ipcChannels.githubLogout),
    repoCreate: (input) => ipcRenderer.invoke(ipcChannels.githubRepoCreate, input)
  },
  workspace: {
    initialize: (config) => ipcRenderer.invoke(ipcChannels.workspaceInitialize, config),
    open: (input) => ipcRenderer.invoke(ipcChannels.workspaceOpen, input)
  },
  git: {
    initialSync: (input) => ipcRenderer.invoke(ipcChannels.gitInitialSync, input),
    detect: () => ipcRenderer.invoke(ipcChannels.gitDetect),
    workingTree: () => ipcRenderer.invoke(ipcChannels.gitWorkingTree),
    pull: (input) => ipcRenderer.invoke(ipcChannels.gitPull, input),
    recoverWorkspace: (input) => ipcRenderer.invoke(ipcChannels.gitRecoverWorkspace, input),
    onRecoverWorkspaceProgress: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: GitRecoverWorkspaceProgress) => {
        handler(payload)
      }
      ipcRenderer.on(ipcChannels.gitRecoverWorkspaceProgress, listener)
      return () => ipcRenderer.removeListener(ipcChannels.gitRecoverWorkspaceProgress, listener)
    },
    publish: (input) => ipcRenderer.invoke(ipcChannels.gitPublish, input),
    log: (input) => ipcRenderer.invoke(ipcChannels.gitLog, input)
  },
  catalog: {
    list: () => ipcRenderer.invoke(ipcChannels.catalogList),
    add: (input) => ipcRenderer.invoke(ipcChannels.catalogAdd, input),
    remove: (input) => ipcRenderer.invoke(ipcChannels.catalogRemove, input)
  },
  posts: {
    list: (input) => ipcRenderer.invoke(ipcChannels.postsList, input),
    read: (input) => ipcRenderer.invoke(ipcChannels.postRead, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.postSave, input),
    move: (input) => ipcRenderer.invoke(ipcChannels.postsMove, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.postsDelete, input)
  },
  workspaceSrc: {
    listTree: () => ipcRenderer.invoke(ipcChannels.workspaceSrcListTree),
    read: (input) => ipcRenderer.invoke(ipcChannels.workspaceSrcRead, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.workspaceSrcSave, input),
    create: (input) => ipcRenderer.invoke(ipcChannels.workspaceSrcCreate, input),
    rename: (input) => ipcRenderer.invoke(ipcChannels.workspaceSrcRename, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.workspaceSrcDelete, input),
    openSitePreview: siteDevApi.openPreview,
    stopSitePreview: siteDevApi.stop,
    getMonacoTypescript: () => ipcRenderer.invoke(ipcChannels.workspaceMonacoTypescript)
  },
  assets: {
    saveImage: (input) => ipcRenderer.invoke(ipcChannels.assetsSaveImage, input),
    listImages: () => ipcRenderer.invoke(ipcChannels.assetsListImages),
    deleteImage: (input) => ipcRenderer.invoke(ipcChannels.assetsDeleteImage, input)
  },
  window: {
    minimize: () => ipcRenderer.invoke(ipcChannels.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(ipcChannels.windowToggleMaximize),
    close: () => ipcRenderer.invoke(ipcChannels.windowClose),
    isMaximized: () => ipcRenderer.invoke(ipcChannels.windowIsMaximized)
  },
  siteDev: siteDevApi,
  app: {
    onGithubSessionCleared: (handler) => {
      const listener = () => handler()
      ipcRenderer.on(ipcChannels.githubSessionCleared, listener)
      return () => ipcRenderer.removeListener(ipcChannels.githubSessionCleared, listener)
    }
  }
}

contextBridge.exposeInMainWorld('emprint', api)
contextBridge.exposeInMainWorld('emprintSiteDev', siteDevApi)
