'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sentry } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * P2-26 — Périmètre de sécurité d'erreur d'interface (Error Boundary).
 * Empêche le plantage complet de l'application en cas d'erreur de rendu imprévue,
 * notifie Sentry et propose une reprise en un clic.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    })
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="alert"
          aria-label="Erreur d'affichage"
          className="flex min-h-[320px] w-full flex-col items-center justify-center p-6 text-center"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-inner">
            <AlertTriangle className="size-7" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Une erreur inattendue est survenue
          </h2>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
            Un problème technique a empêché l&apos;affichage de ce module. Vos données
            locales sont préservées.
          </p>
          <div className="mt-5 flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={this.handleReload}
              className="gap-2 cursor-pointer font-semibold"
            >
              <RefreshCw className="size-3.5" />
              <span>Recharger l&apos;application</span>
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
