import type { EmprintDesktopApi } from '@emprint/shared'

declare global {
  interface Window {
    emprint: EmprintDesktopApi
    /** Backup bridge when `emprint.siteDev` is missing from a stale preload bundle. */
    emprintSiteDev?: EmprintDesktopApi['siteDev']
  }
}

declare module '*.css?raw' {
  const content: string
  export default content
}

export {}
