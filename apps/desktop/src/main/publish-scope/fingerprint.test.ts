import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { flatDirFingerprint } from './fingerprint'

const tempDirs: string[] = []

afterEach(async () => {
  const { rm } = await import('node:fs/promises')
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
})

describe('flatDirFingerprint', () => {
  it('returns 0:0 for missing directory', async () => {
    const missing = path.join(os.tmpdir(), `emprint-missing-${Date.now()}`)
    await expect(flatDirFingerprint(missing)).resolves.toBe('0:0')
  })

  it('changes when a file is added', async () => {
    const dir = path.join(os.tmpdir(), `emprint-fp-${Date.now()}`)
    tempDirs.push(dir)
    await mkdir(dir)
    const before = await flatDirFingerprint(dir)
    await writeFile(path.join(dir, 'a.txt'), 'hello')
    const after = await flatDirFingerprint(dir)
    expect(before).toBe('0:0')
    expect(after).toMatch(/^1:\d+(\.\d+)?$/)
  })
})
