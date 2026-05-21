import type { EmprintDesktopApi } from '@emprint/shared'

declare global {
  interface Window {
    emprint: EmprintDesktopApi
    /** Fallback bridge when `window.emprint.siteDev` is missing (stale preload after dev HMR). See `design-dev-preview.ts`. */
    emprintSiteDev?: EmprintDesktopApi['siteDev']
  }
}

export {}
