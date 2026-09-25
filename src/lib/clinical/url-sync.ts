/**
 * Utility for synchronizing clinical tool state with URL query parameters.
 * Enables shareable, bookmarkable clinical links without full-page reloads.
 */

export function syncToolQueryParams(
  allowedPath: string,
  params: Record<string, string | number | boolean | null | undefined>
) {
  if (typeof window === 'undefined') return
  const pathname = window.location.pathname
  if (!pathname.includes(allowedPath)) return

  const url = new URL(window.location.href)
  let changed = false

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key)
        changed = true
      }
    } else {
      const strVal = String(value)
      if (url.searchParams.get(key) !== strVal) {
        url.searchParams.set(key, strVal)
        changed = true
      }
    }
  }

  if (changed) {
    window.history.replaceState(null, '', url.toString())
  }
}

export function readQueryParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}
