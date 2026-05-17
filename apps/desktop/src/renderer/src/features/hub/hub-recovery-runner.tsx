import { useEffect } from 'react'
import { useAppStore } from '@renderer/state/app-store'

/**
 * When `hubRecovery` is set, runs delete + re-clone IPC and updates progress in the store.
 * Mounted from App so it survives the workspace → hub transition.
 */
export function HubRecoveryRunner() {
  const hubRecovery = useAppStore((s) => s.hubRecovery)
  const setHubRecoveryProgress = useAppStore((s) => s.setHubRecoveryProgress)
  const finishHubRecovery = useAppStore((s) => s.finishHubRecovery)
  const bumpHubCatalogRefresh = useAppStore((s) => s.bumpHubCatalogRefresh)

  useEffect(() => {
    if (!hubRecovery) return

    const workspaceId = hubRecovery.workspaceId
    let cancelled = false

    const unsubscribe = window.emprint.git.onRecoverWorkspaceProgress?.((payload) => {
      if (cancelled || payload.workspaceId !== workspaceId) return
      setHubRecoveryProgress({ message: payload.message, progress: payload.progress })
    })

    void (async () => {
      try {
        await window.emprint.git.recoverWorkspace({ workspaceId })
        if (cancelled) return
        bumpHubCatalogRefresh()
        finishHubRecovery()
      } catch (caught) {
        if (cancelled) return
        const message = caught instanceof Error ? caught.message : String(caught)
        setHubRecoveryProgress({ message, progress: 0 })
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [hubRecovery, bumpHubCatalogRefresh, finishHubRecovery, setHubRecoveryProgress])

  return null
}
