import type { SiteDevServerState } from '@emprint/shared'

export const SITE_DEV_PREVIEW_URL = 'http://localhost:4321/'

type SiteDevBridge = {
  openPreview(): Promise<SiteDevServerState>
  stop(): Promise<SiteDevServerState>
  status(): Promise<SiteDevServerState>
}

function hasFn<T extends (...args: never[]) => unknown>(value: unknown): value is T {
  return typeof value === 'function'
}

function resolveSiteDevBridge(): SiteDevBridge | null {
  const emprint = window.emprint
  const siteDev = emprint?.siteDev
  if (siteDev && hasFn(siteDev.openPreview) && hasFn(siteDev.stop) && hasFn(siteDev.status)) {
    return siteDev
  }
  const src = emprint?.workspaceSrc
  if (src && hasFn(src.openSitePreview) && hasFn(src.stopSitePreview)) {
    return {
      openPreview: () => src.openSitePreview(),
      stop: () => src.stopSitePreview(),
      status: () => window.emprint!.siteDev!.status()
    }
  }
  const backup = (window as Window & { emprintSiteDev?: SiteDevBridge }).emprintSiteDev
  if (backup && hasFn(backup.openPreview) && hasFn(backup.stop) && hasFn(backup.status)) {
    return backup
  }
  return null
}

function unavailableError(): Error {
  if (typeof window === 'undefined' || !window.emprint) {
    return new Error(
      'Emprint desktop API is not available. Open this screen inside the Electron app (npm run dev at the repo root), not the Vite URL alone.'
    )
  }
  return new Error(
    'Site preview API is unavailable. Fully quit Emprint and run npm run dev again so the preload script reloads.'
  )
}

export async function pollSiteDevStatus(): Promise<SiteDevServerState> {
  const bridge = resolveSiteDevBridge()
  if (!bridge?.status) {
    return { status: 'stopped', url: SITE_DEV_PREVIEW_URL, phase: 'idle' }
  }
  return bridge.status()
}

export async function openSiteDevPreview(): Promise<SiteDevServerState> {
  const bridge = resolveSiteDevBridge()
  if (!bridge) {
    throw unavailableError()
  }
  return bridge.openPreview()
}

export async function stopSiteDevPreview(): Promise<SiteDevServerState> {
  const bridge = resolveSiteDevBridge()
  if (!bridge) {
    return { status: 'stopped', url: SITE_DEV_PREVIEW_URL, phase: 'idle' }
  }
  return bridge.stop()
}
