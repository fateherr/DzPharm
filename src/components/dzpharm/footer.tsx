import { Badge } from '@/components/ui/badge'
import { Database, RefreshCw, ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-border/70 bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p className="flex items-center gap-1.5 text-center sm:text-left">
          <Database className="size-3.5 shrink-0" aria-hidden />
          <span>
            DzPharm — Données : Nomenclature Nationale (Ministère de
            l&apos;Industrie Pharmaceutique, DZ)
          </span>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Usage professionnel — Vérifiez toujours les RCP officiels
          </p>
          <span className="hidden items-center gap-1.5 sm:flex">
            <RefreshCw className="size-3 shrink-0 text-state-safe" aria-hidden />
            <span className="text-state-safe font-medium">Référentiel en ligne</span>
          </span>
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/5 text-primary"
          >
            MAJ Juin 2026
          </Badge>
        </div>
      </div>
    </footer>
  )
}
