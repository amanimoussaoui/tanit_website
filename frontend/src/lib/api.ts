const base = ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: unknown }
    let msg = res.statusText
    const e = err.error
    if (typeof e === 'string') msg = e
    else if (e != null && typeof e === 'object') msg = JSON.stringify(e)
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}
