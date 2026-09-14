'use client'

import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  HeartHandshake,
  Home,
  Library,
  Lock,
  Moon,
  Pill,
  Search,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fetchStats } from './api'
import { formatNumber } from './status-badge'
import { useDzPharm, type ViewId } from './store'

interface NavItem {
  id: ViewId
  label: string
  icon: typeof Home
  desc?: string
}

const PRIMARY_NAV: NavItem[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'repertoire', label: 'Répertoire', icon: BookOpen },
  { id: 'catalogue', label: 'Prix & Chifa', icon: Store },
  { id: 'interactions', label: 'Interactions', icon: ShieldAlert },
  { id: 'armoire', label: 'Armoire', icon: Users },
  { id: 'copilote', label: 'Copilote IA', icon: Sparkles },
]

const SECONDARY_NAV: NavItem[] = [
  { id: 'bibliotheque', label: 'Bibliothèque', icon: Library, desc: 'Monographies RCP & DCI officielles' },
  { id: 'outils', label: 'Outils Médicaux', icon: Wrench, desc: 'Calculateurs de clairance, posologies' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, desc: 'Observatoire du marché algérien' },
]

const ALL_NAV_ITEMS: NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Changer de thème"
      className="size-8 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="block size-4 dark:hidden" aria-hidden />
    </Button>
  )
}

/**
 * Bascule Mode professionnel / Mode famille.
 */
function AudienceToggle() {
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)

  const base =
    'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  return (
    <div
      role="group"
      aria-label="Mode d’usage — professionnel ou famille"
      className="flex h-8 items-center rounded-lg border border-border/70 bg-muted/60 p-0.5"
    >
      <button
        type="button"
        onClick={() => setAudience('pro')}
        aria-pressed={audience === 'pro'}
        title="Mode professionnel (médecin, pharmacien)"
        className={cn(
          base,
          audience === 'pro'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Stethoscope className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="hidden sm:inline">Pro</span>
      </button>
      <button
        type="button"
        onClick={() => setAudience('famille')}
        aria-pressed={audience === 'famille'}
        title="Mode famille (patients, grand public)"
        className={cn(
          base,
          audience === 'famille'
            ? 'bg-card text-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <HeartHandshake className="size-3.5 shrink-0 text-chifa" aria-hidden />
        <span className="hidden sm:inline">Famille</span>
      </button>
    </div>
  )
}

export function Header() {
  const router = useRouter()
  const view = useDzPharm((s) => s.view)
  const setView = useDzPharm((s) => s.setView)
  const setCommandOpen = useDzPharm((s) => s.setCommandOpen)

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: ({ signal }) => fetchStats(signal),
    staleTime: 30 * 60 * 1000,
  })

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('dzpharm_session')
      }
      await fetch('/api/logout', { method: 'POST' })
    } catch {
      // Continue redirect even if offline
    }
    router.push('/login')
    router.refresh()
  }

  const isSecondaryActive = SECONDARY_NAV.some((item) => item.id === view)

  return (
    <TooltipProvider delayDuration={200}>
      <header className="sticky top-7 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 print:hidden transition-all">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
          {/* Logo & Platform Name */}
          <button
            type="button"
            onClick={() => setView('accueil')}
            className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="DzPharm — retour à l'accueil"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-sky-600 shadow-md shadow-primary/25 transition-transform group-hover:scale-105"
              aria-hidden
            >
              <Pill className="size-5 text-primary-foreground" />
            </span>
            <span className="flex min-w-0 flex-col text-left leading-tight">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Dz<span className="bg-gradient-to-r from-primary to-sky-500 bg-clip-text text-transparent">Pharm</span>
              </span>
              <span className="hidden truncate text-[10px] font-medium tracking-wide text-muted-foreground xl:block">
                Référentiel Officiel · Juin 2026
              </span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-1 md:flex">
            {PRIMARY_NAV.map((item) => {
              const active = view === item.id
              const isAi = item.id === 'copilote'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:px-3 lg:text-sm',
                    active
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="activeNavTab"
                      className="absolute inset-0 rounded-lg bg-card shadow-xs border border-border/60"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'relative z-10 size-3.5 sm:size-4',
                      active ? 'text-primary' : isAi ? 'text-sky-500 animate-pulse' : 'text-muted-foreground'
                    )}
                    aria-hidden
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              )
            })}

            {/* Secondary Modules Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:px-2.5 lg:text-sm',
                    isSecondaryActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isSecondaryActive && (
                    <motion.span
                      layoutId="activeNavTab"
                      className="absolute inset-0 rounded-lg bg-card shadow-xs border border-border/60"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">Plus</span>
                  <ChevronDown className="relative z-10 size-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-xl">
                {SECONDARY_NAV.map((sub) => {
                  const subActive = view === sub.id
                  return (
                    <DropdownMenuItem
                      key={sub.id}
                      onClick={() => setView(sub.id)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer',
                        subActive && 'bg-primary/10 text-primary font-semibold'
                      )}
                    >
                      <sub.icon className={cn('size-4 mt-0.5 shrink-0', subActive ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{sub.label}</span>
                        {sub.desc && <span className="text-[10px] text-muted-foreground">{sub.desc}</span>}
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Quick Actions Right */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Integrated Spotlight Search Capsule */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group relative flex h-8 w-36 sm:w-44 lg:w-48 items-center justify-between rounded-lg border border-border/70 bg-card/60 px-2.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Recherche universelle (Cmd+K)"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="size-3.5 text-primary group-hover:scale-110 transition-transform" aria-hidden />
                <span className="truncate">Rechercher…</span>
              </span>
              <kbd className="hidden rounded border border-border/80 bg-muted/80 px-1 text-[10px] font-semibold text-muted-foreground shadow-2xs sm:inline-block">
                ⌘K
              </kbd>
            </button>

            {/* Total AMM count pill */}
            {stats ? (
              <Badge
                variant="outline"
                className="hidden gap-1.5 border-primary/25 bg-primary/5 text-primary 2xl:inline-flex"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                {formatNumber(stats.total)} AMM
              </Badge>
            ) : (
              <Skeleton className="hidden h-6 w-20 rounded-full 2xl:block" aria-hidden />
            )}

            <AudienceToggle />
            <ThemeToggle />

            {/* Workstation lock / Logout button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Verrouiller la session"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Lock className="size-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Verrouiller la session
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Navigation mobile — ruban tactile */}
        <nav
          aria-label="Navigation principale mobile"
          className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border/50 px-2.5 py-1 md:hidden"
        >
          {ALL_NAV_ITEMS.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="size-3.5" aria-hidden />
                {item.label}
              </button>
            )
          })}
        </nav>
      </header>
    </TooltipProvider>
  )
}
