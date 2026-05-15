/** True when a normalized POSIX path contains `.` or `..` path segments (not substrings like `[...slug]`). */
export function hasPathTraversalSegment(normalizedPosixPath: string): boolean {
  return normalizedPosixPath.split('/').some((segment) => segment === '..' || segment === '.')
}
