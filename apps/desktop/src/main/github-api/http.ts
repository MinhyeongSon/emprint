export function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

export function githubApiErrorFromResponse(status: number, text: string): Error {
  const maybeJson = safeJsonParse(text)

  if (status === 422 && maybeJson && typeof maybeJson === 'object') {
    const message = typeof (maybeJson as { message?: unknown }).message === 'string' ? String((maybeJson as { message?: unknown }).message) : ''
    const errors = Array.isArray((maybeJson as { errors?: unknown }).errors) ? ((maybeJson as { errors?: unknown }).errors as unknown[]) : []
    const nameConflict = errors.some(
      (err) =>
        err &&
        typeof err === 'object' &&
        (err as { field?: unknown }).field === 'name' &&
        String((err as { message?: unknown }).message || '').includes('already exists')
    )
    if (nameConflict) {
      return new Error('Repository name already exists for this owner. Please choose a different name.')
    }
    return new Error(message ? `GitHub API failed (${status}): ${message}` : `GitHub API failed (${status}): ${text}`)
  }

  return new Error(`GitHub API failed (${status}): ${text}`)
}

export async function githubApiPostRaw(
  url: string,
  token: string,
  body: unknown
): Promise<{ ok: boolean; status: number; text: string; json: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Emprint',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const text = await safeReadText(res)
  const json = safeJsonParse(text)
  return { ok: res.ok, status: res.status, text, json }
}
