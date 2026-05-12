import path from 'node:path'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import type { FileSystemGateway } from './file-system-gateway'

export class NodeFileSystemGateway implements FileSystemGateway {
  async ensureDirectory(directoryPath: string): Promise<void> {
    await mkdir(directoryPath, { recursive: true })
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content, 'utf8')
  }

  async readFile(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8')
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await readFile(filePath, 'utf8')
      return true
    } catch {
      return false
    }
  }

  async listEntries(directoryPath: string): Promise<string[]> {
    try {
      return await readdir(directoryPath)
    } catch {
      return []
    }
  }
}
