import type { WorkspaceArtifact } from '@emprint/core'

/** Dictionary-only package.json tweaks: Pagefind devDependency + post-build index step. */
export function dictionaryPackageJsonPatch(artifacts: WorkspaceArtifact[]): WorkspaceArtifact[] {
  return artifacts.map((a) => {
    if (a.relativePath !== 'package.json') return a
    const pkg = JSON.parse(a.content) as {
      scripts: Record<string, string>
      dependencies: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const build = pkg.scripts.build ?? 'astro build'
    if (!build.includes('build-pagefind')) {
      pkg.scripts.build = `${build} && node ./scripts/build-pagefind.mjs`
    }
    pkg.devDependencies = { ...pkg.devDependencies, pagefind: '^1.3.0' }
    return { ...a, content: `${JSON.stringify(pkg, null, 2)}\n` }
  })
}
