export interface FileSystemGateway {
  ensureDirectory(path: string): Promise<void>
  writeFile(path: string, content: string): Promise<void>
  readFile(path: string): Promise<string>
  fileExists(path: string): Promise<boolean>
  listEntries(path: string): Promise<string[]>
}
