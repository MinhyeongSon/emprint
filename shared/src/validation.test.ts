import { describe, expect, it } from 'vitest'
import { parseWorkspaceConfig, parseWorkspaceManifest } from './validation'

describe('parseWorkspaceManifest', () => {
  it('returns null for invalid input', () => {
    expect(parseWorkspaceManifest(null)).toBeNull()
    expect(parseWorkspaceManifest({})).toBeNull()
  })

  it('parses minimal valid manifest', () => {
    const manifest = parseWorkspaceManifest({
      name: 'demo',
      title: 'Demo',
      description: 'Desc',
      locale: 'en',
      workspaceType: 'creator',
      templateId: 'blog',
      themeColor: '#000',
      layoutStyle: 'editorial',
      siteProjectKind: 'column'
    })
    expect(manifest?.title).toBe('Demo')
    expect(manifest?.siteProjectKind).toBe('column')
  })
})

describe('parseWorkspaceConfig', () => {
  it('throws on unsupported siteProjectKind', () => {
    expect(() =>
      parseWorkspaceConfig({
        authProvider: 'github',
        locale: 'en',
        workspaceType: 'creator',
        siteProjectKind: 'invalid',
        publicationSlug: 'demo',
        templateId: 'blog',
        title: 'Demo',
        description: 'Desc',
        themeColor: '#000',
        layoutStyle: 'editorial',
        localDirectory: '/tmp/demo',
        repository: { mode: 'create', providerId: 'github' }
      })
    ).toThrow(/Unsupported siteProjectKind/)
  })

  it('defaults empty siteProjectKind to column', () => {
    const config = parseWorkspaceConfig({
      authProvider: 'github',
      locale: 'en',
      workspaceType: 'creator',
      publicationSlug: 'demo',
      templateId: 'blog',
      title: 'Demo',
      description: 'Desc',
      themeColor: '#000',
      layoutStyle: 'editorial',
      localDirectory: '/tmp/demo',
      repository: { mode: 'create', providerId: 'github' }
    })
    expect(config.siteProjectKind).toBe('column')
  })
})
