'use client'

import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import {
  BarChart3,
  BookOpen,
  HeartHandshake,
  Home,
  Library,
  Moon,
  Pill,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  Users,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchStats } from './api'
import { formatNumber } from './status-badge'
import { useDzPharm, type ViewId } from './store'

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'repertoire', label: 'Répertoire', icon: BookOpen },
  { id: 'catalogue', label: 'Prix', icon: Store },
  { id: 'bibliotheque', label: 'Bibliothèque', icon: Library },
  { id: 'interactions', label: 'Interactions', icon: ShieldAlert },
  { id: 'armoire', label: 'Armoire', icon: Users },
  { id: 'outils', label: 'Outils', icon: Wrench },
  { id: 'copilote', label: 'Copilote IA', icon: Sparkles },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Changer de thème"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {/* Icônes pilotées par CSS pour éviter tout décalage d'hydratation */}
      <Sun className="hidden size-4.5 dark:block" aria-hidden />
      <Moon className="block size-4.5 dark:hidden" aria-hidden />
    </Button>
  )
}

/**
 * Bascule Mode professionnel / Mode famille (audit 1.3 / P14).
 * Segmente compact à côté du thème — icônes seules sur mobile
 * (labels visibles à partir de `sm`) pour éviter tout débordement.
 */
function AudienceToggle() {
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)

  const base =
    'flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  return (
    <div
      role="group"
      aria-label="Mode d’usage — professionnel ou famille"
      className="flex h-9 items-center rounded-lg border border-border bg-muted/60 p-0.5"
    >
      <button
        type="button"
        onClick={() => setAudience('pro')}
        aria-pressed={audience === 'pro'}
        aria-label="Mode professionnel"
        title="Mode professionnel"
        className={cn(
          base,
          audience === 'pro'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Stethoscope className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Pro</span>
      </button>
      <button
        type="button"
        onClick={() => setAudience('famille')}
        aria-pressed={audience === 'famille'}
        aria-label="Mode famille"
        title="Mode famille"
        className={cn(
          base,
          audience === 'famille'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <HeartHandshake className="size-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Famille</span>
      </button>
    </div>
  )
}

export function Header() {
  const view = useDzPharm((s) => s.view)
  const setView = useDzPharm((s) => s.setView)
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  return (
    <header className="sticky top-9 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button
          type="button"
          onClick={() => setView('accueil')}
          className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label="DzPharm — retour à l'accueil"
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
            aria-hidden
          >
            <Pill className="size-5 text-primary-foreground" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">
              Dz<span className="text-primary">Pharm</span>
            </span>
            <span className="hidden truncate text-[10px] font-medium tracking-wide text-muted-foreground sm:block">
              Référentiel Pharmaceutique Algérien
            </span>
          </span>
        </button>

        {/* Navigation desktop */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                view === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {stats ? (
            <Badge
              variant="outline"
              className="hidden gap-1.5 border-primary/25 bg-primary/5 text-primary sm:inline-flex"
            >
              <Pill className="size-3" aria-hidden />
              {formatNumber(stats.total)} médicaments
            </Badge>
          ) : (
            <Skeleton className="hidden h-6 w-32 rounded-full sm:block" aria-hidden />
          )}
          <AudienceToggle />
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation mobile — barre scrollable */}
      <nav
        aria-label="Navigation principale mobile"
        className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border/50 px-3 py-1.5 md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            aria-current={view === item.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
              'min-h-11',
              view === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className="size-3.5" aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
