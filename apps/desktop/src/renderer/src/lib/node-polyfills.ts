/**
 * Browser polyfills for Node-flavored libraries we use in the renderer.
 *
 * Some libraries that ship for both Node and the browser (notably `gray-matter`)
 * call `Buffer.from(...)` internally without checking for environment. Electron
 * renderer windows with `nodeIntegration: false` do not expose `Buffer` globally,
 * so we shim it here.
 *
 * Import this module as a SIDE EFFECT before any code path that touches
 * `gray-matter`'s `stringify` (or anything else relying on `Buffer`).
 */
import { Buffer } from 'buffer'

const target = globalThis as unknown as { Buffer?: typeof Buffer }
if (!target.Buffer) {
  target.Buffer = Buffer
}
