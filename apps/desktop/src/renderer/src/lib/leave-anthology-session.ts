/** Tear down mounted anthology + Astro preview when leaving workspace UI (Hub / wizard). */
export async function leaveAnthologySession(): Promise<void> {
  try {
    await window.emprint?.workspace?.unmount?.()
  } catch {
    /* best-effort */
  }
  try {
    await window.emprint?.siteDev?.stop?.()
  } catch {
    /* best-effort */
  }
}
