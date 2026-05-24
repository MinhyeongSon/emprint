import { contextBridge, ipcRenderer } from 'electron'
import { ipcChannels, type EmprintDesktopApi, type GitRecoverWorkspaceProgress } from '@emprint/shared'

const siteDevApi = {
  stop: () => ipcRenderer.invoke(ipcChannels.siteDevStop),
  status: () => ipcRenderer.invoke(ipcChannels.siteDevStatus),
  openPreview: () => ipcRenderer.invoke(ipcChannels.siteDevOpenPreview),
  installDependencies: () => ipcRenderer.invoke(ipcChannels.siteDevInstallDependencies)
}

const api: EmprintDesktopApi = {
  env: {
    platform: process.platform,
    ...(process.env.EMPRINT_QA_MODE === '1' ? { qaMode: true } : {})
  },
  system: {
    getRuntimeInfo: () => ipcRenderer.invoke(ipcChannels.systemGetRuntimeInfo),
    selectDirectory: () => ipcRenderer.invoke(ipcChannels.systemSelectDirectory)
  },
  node: {
    detect: () => ipcRenderer.invoke(ipcChannels.nodeDetect)
  },
  github: {
    oauthClientGet: () => ipcRenderer.invoke(ipcChannels.githubOAuthClientGet),
    oauthClientSet: (input) => ipcRenderer.invoke(ipcChannels.githubOAuthClientSet, input),
    authStatus: () => ipcRenderer.invoke(ipcChannels.githubAuthStatus),
    authStart: (input) => ipcRenderer.invoke(ipcChannels.githubAuthStart, input),
    authPoll: (input) => ipcRenderer.invoke(ipcChannels.githubAuthPoll, input),
    logout: () => ipcRenderer.invoke(ipcChannels.githubLogout),
    repoCreate: (input) => ipcRenderer.invoke(ipcChannels.githubRepoCreate, input),
    deployStatus: () => ipcRenderer.invoke(ipcChannels.githubDeployStatus)
  },
  workspace: {
    initialize: (config) => ipcRenderer.invoke(ipcChannels.workspaceInitialize, config),
    open: (input) => ipcRenderer.invoke(ipcChannels.workspaceOpen, input),
    unmount: () => ipcRenderer.invoke(ipcChannels.workspaceUnmount)
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
    log: (input) => ipcRenderer.invoke(ipcChannels.gitLog, input),
    rollback: (input) => ipcRenderer.invoke(ipcChannels.gitRollback, input),
    resetDraft: () => ipcRenderer.invoke(ipcChannels.gitResetDraft)
  },
  catalog: {
    list: () => ipcRenderer.invoke(ipcChannels.catalogList),
    reconcile: (input) => ipcRenderer.invoke(ipcChannels.catalogReconcile, input),
    add: (input) => ipcRenderer.invoke(ipcChannels.catalogAdd, input),
    remove: (input) => ipcRenderer.invoke(ipcChannels.catalogRemove, input)
  },
  sections: {
    list: () => ipcRenderer.invoke(ipcChannels.sectionsList),
    read: (input) => ipcRenderer.invoke(ipcChannels.sectionRead, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.sectionSave, input),
    saveStructured: (input) => ipcRenderer.invoke(ipcChannels.sectionSaveStructured, input),
    create: (input) => ipcRenderer.invoke(ipcChannels.sectionCreate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.sectionsDelete, input),
    reorderRoots: (input) => ipcRenderer.invoke(ipcChannels.sectionsReorderRoots, input)
  },
  posts: {
    list: (input) => ipcRenderer.invoke(ipcChannels.postsList, input),
    read: (input) => ipcRenderer.invoke(ipcChannels.postRead, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.postSave, input),
    move: (input) => ipcRenderer.invoke(ipcChannels.postsMove, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.postsDelete, input)
  },
  knowledge: {
    list: (input) => ipcRenderer.invoke(ipcChannels.knowledgeList, input),
    read: (input) => ipcRenderer.invoke(ipcChannels.knowledgeRead, input),
    save: (input) => ipcRenderer.invoke(ipcChannels.knowledgeSave, input),
    move: (input) => ipcRenderer.invoke(ipcChannels.knowledgeMove, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.knowledgeDelete, input),
    indexTree: () => ipcRenderer.invoke(ipcChannels.knowledgeIndexTree)
  },
  index: {
    list: () => ipcRenderer.invoke(ipcChannels.indexList),
    tree: () => ipcRenderer.invoke(ipcChannels.indexTree),
    create: (input) => ipcRenderer.invoke(ipcChannels.indexCreate, input),
    update: (input) => ipcRenderer.invoke(ipcChannels.indexUpdate, input),
    delete: (input) => ipcRenderer.invoke(ipcChannels.indexDelete, input),
    rename: (input) => ipcRenderer.invoke(ipcChannels.indexRename, input)
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
  migration: {
    tistory: {
      scan: (input) => ipcRenderer.invoke(ipcChannels.migrationTistoryScan, input),
      run: (input) => ipcRenderer.invoke(ipcChannels.migrationTistoryRun, input)
    },
    markdown: {
      scan: (input) => ipcRenderer.invoke(ipcChannels.migrationMarkdownScan, input),
      run: (input) => ipcRenderer.invoke(ipcChannels.migrationMarkdownRun, input)
    }
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
