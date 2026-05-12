import type { EmprintDesktopApi } from '@emprint/shared'

declare global {
  interface Window {
    emprint: EmprintDesktopApi
  }
}

export {}
