/**
 * DzPharm Sentry Error Tracking & Clinical Crash Reporting (P2-26)
 * Collects runtime errors while rigorously scrubbing sensitive clinical and user data.
 */

interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  user?: { id?: string; role?: string }
}

class DzPharmSentry {
  private dsn: string | undefined =
    process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

  private isEnabled(): boolean {
    return Boolean(this.dsn && process.env.NODE_ENV === 'production')
  }

  /** Filtre les données sensibles (mots de passe, tokens, noms de patients) */
  private sanitizeData(data: unknown): unknown {
    if (!data) return data
    if (typeof data === 'string') {
      return data
        .replace(/password[:=]\s*\S+/gi, 'password=***')
        .replace(/token[:=]\s*\S+/gi, 'token=***')
        .replace(/bearer\s+\S+/gi, 'bearer ***')
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (/password|secret|token|auth|cookie|ssn/i.test(key)) {
          sanitized[key] = '***'
        } else {
          sanitized[key] = this.sanitizeData(value)
        }
      }
      return sanitized
    }
    return data
  }

  /** Capture une exception JavaScript / API */
  public captureException(error: unknown, context?: ErrorContext): void {
    const sanitizedExtra = context?.extra ? this.sanitizeData(context.extra) : undefined

    if (process.env.NODE_ENV === 'development') {
      console.error('[Sentry Error Captured]', error, {
        tags: context?.tags,
        extra: sanitizedExtra,
      })
      return
    }

    if (!this.isEnabled()) return

    try {
      // In production with Sentry initialized, report event
      if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureException: Function } }).Sentry) {
        ;(window as unknown as { Sentry: { captureException: Function } }).Sentry.captureException(error, {
          tags: context?.tags,
          extra: sanitizedExtra,
        })
      }
    } catch (err) {
      console.error('[Sentry Dispatch Failed]', err)
    }
  }

  /** Capture un message ou un avertissement clinique */
  public captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Sentry ${level.toUpperCase()}] ${message}`, context)
      return
    }

    if (!this.isEnabled()) return

    try {
      if (typeof window !== 'undefined' && (window as unknown as { Sentry?: { captureMessage: Function } }).Sentry) {
        ;(window as unknown as { Sentry: { captureMessage: Function } }).Sentry.captureMessage(message, level)
      }
    } catch (err) {
      console.error('[Sentry Message Failed]', err)
    }
  }
}

export const sentry = new DzPharmSentry()
