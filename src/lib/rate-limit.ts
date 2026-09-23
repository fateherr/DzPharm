/**
 * Limiteur de débit en mémoire (par IP) pour les endpoints IA.
 * Objectif : maîtriser le coût et l'abus — pas une sécurité forte
 * (l'IP peut être partagée derrière un proxy), mais une garde utile.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Nettoyage périodique pour éviter la fuite mémoire
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSec: number
}

/**
 * @param key   identifiant du client (généralement l'IP)
 * @param limit nombre de requêtes autorisées
 * @param windowMs fenêtre en millisecondes
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterSec: 0,
  }
}

/** Extrait l'IP du client depuis les en-têtes usuels (proxy/gateway). */
export function clientIpFrom(req: Request): string {
  const h = req.headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'local'
  )
}
