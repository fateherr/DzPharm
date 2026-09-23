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
  Barcode,
  BookOpen,
  ChevronDown,
  Flower2,
  HeartHandshake,
  Home,
  Leaf,
  Library,
  Lock,
  Moon,
  Palette,
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
import { PaletteDialog } from './palette-dialog'

interface NavItem {
  id: ViewId
  label: string
  icon: typeof Home
  desc?: string
}

// Toujours visibles sur tablettes et PC (>= 768px)
const CORE_NAV: NavItem[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'repertoire', label: 'Répertoire', icon: BookOpen },
  { id: 'catalogue', label: 'Prix & Chifa', icon: Store },
  { id: 'interactions', label: 'Interactions', icon: ShieldAlert },
]

// Visibles sur grand écran (>= 1280px), intégrés dans "Plus" sur tablettes (768px-1279px)
const EXTENDED_NAV: NavItem[] = [
  { id: 'armoire', label: 'Armoire', icon: Users, desc: 'Armoire à pharmacie de maison' },
  { id: 'copilote', label: 'Copilote IA', icon: Sparkles, desc: 'Assistant clinique intelligent (Gemini)' },
]

// Toujours dans le menu "Plus"
const SECONDARY_NAV: NavItem[] = [
  { id: 'bibliotheque', label: 'Bibliothèque', icon: Library, desc: 'Monographies RCP & DCI officielles' },
  { id: 'outils', label: 'Outils Médicaux', icon: Wrench, desc: 'Calculateurs de clairance, posologies' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, desc: 'Observatoire du marché algérien' },
]

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-pressed={isDark}
      className="size-8 shrink-0 rounded-lg bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-300 hover:rotate-12 active:rotate-45"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="block size-4 dark:hidden" aria-hidden />
    </Button>
  )
}

function AudienceToggle() {
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)

  const base =
    'flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  return (
    <div
      role="group"
      aria-label="Mode d’usage — professionnel ou famille"
      className="flex h-8 shrink-0 items-center rounded-lg border border-border/80 bg-muted/60 p-0.5"
    >
      <button
        type="button"
        onClick={() => setAudience('pro')}
        aria-pressed={audience === 'pro'}
        title="Mode professionnel (médecin, pharmacien)"
        className={cn(
          base,
          audience === 'pro'
            ? 'bg-primary/15 text-primary font-semibold shadow-xs border border-primary/25'
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
            ? 'bg-chifa/15 text-chifa font-semibold shadow-xs border border-chifa/25'
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
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const setAdminBarcodeModalOpen = useDzPharm((s) => s.setAdminBarcodeModalOpen)
  const designMode = useDzPharm((s) => s.designMode)
  const setDesignMode = useDzPharm((s) => s.setDesignMode)

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

  // Vérifier si un élément du menu déroulant est actif
  const isSecondaryActive =
    SECONDARY_NAV.some((item) => item.id === view) ||
    EXTENDED_NAV.some((item) => item.id === view)

  const isBotanique = designMode === 'botanique'

  return (
    <TooltipProvider delayDuration={200}>
      <header className="relative z-0 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 print:hidden transition-all">
        <div className="mx-auto flex h-14 max-w-[1720px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8 w-full min-w-0">
          {/* Logo & Nom de la Plateforme */}
          <button
            type="button"
            onClick={() => setView('accueil')}
            className="group flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="DzPharm — retour à l'accueil"
          >
            {isBotanique ? (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#be185d] shadow-md shadow-[#1b4332]/30 ring-1 ring-[#dcd4c5]/40 transition-transform group-hover:scale-105"
                aria-hidden
              >
                <Leaf className="size-5 text-emerald-200" />
              </span>
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-primary to-chifa shadow-md shadow-primary/30 ring-1 ring-white/10 dark:ring-white/5 transition-transform group-hover:scale-105"
                aria-hidden
              >
                <Pill className="size-5 text-white" />
              </span>
            )}
            <span className="flex min-w-0 flex-col text-left leading-tight">
              <span className="text-lg font-bold tracking-tight text-foreground">
                Dz
                {isBotanique ? (
                  <span className="bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#be185d] dark:from-[#5eead4] dark:via-[#34d399] dark:to-[#fb7185] bg-clip-text text-transparent">
                    Pharm
                  </span>
                ) : (
                  <span className="bg-gradient-to-r from-primary via-sky-500 to-chifa bg-clip-text text-transparent">
                    Pharm
                  </span>
                )}
              </span>
              <span className="hidden truncate text-[10px] font-medium tracking-wide text-muted-foreground xl:block">
                Référentiel Officiel · 2026
              </span>
            </span>
          </button>

          {/* Navigation Adaptative Desktop & Tablette */}
          <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 rounded-xl border border-border/60 bg-muted/60 p-1 shadow-inner md:flex">
            {/* 4 modules fondamentaux */}
            {CORE_NAV.map((item) => {
              const active = view === item.id
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
                      className="absolute inset-0 rounded-lg bg-card shadow-md shadow-primary/10 border border-border/60"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      'relative z-10 size-3.5 sm:size-4',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-hidden
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              )
            })}

            {/* Modules étendus visibles uniquement sur très grand écran (>= 1536px) pour éviter le tassement */}
            {EXTENDED_NAV.map((item) => {
              const active = view === item.id
              const isAi = item.id === 'copilote'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none 2xl:flex lg:text-sm',
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

            {/* Menu "Plus" adaptatif */}
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
                {/* Affiche Armoire et Copilote sur écran standard s'ils sont masqués de la barre principale */}
                <div className="2xl:hidden">
                  {EXTENDED_NAV.map((sub) => {
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
                  <div className="my-1 border-t border-border/60" />
                </div>

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

                <div className="my-1 border-t border-border/60" />
                <DropdownMenuItem
                  onClick={() => setAdminBarcodeModalOpen(true)}
                  className="flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 focus:bg-amber-500/10"
                >
                  <Barcode className="size-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold">Admin · Codes-Barres</span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider">
                        Admin
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Intégrer les codes-barres originaux aux médicaments
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Quick Actions Droite */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
            {/* Capsule de recherche universelle fluide */}
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="group relative flex h-8 w-28 sm:w-32 md:w-36 lg:w-40 xl:w-48 shrink-0 items-center justify-between gap-0 rounded-lg border border-border/70 bg-card/60 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-card hover:text-foreground hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
              title="Recherche universelle (Cmd+K)"
            >
              <span className="flex items-center gap-1.5 bg-primary/8 px-2 sm:px-2.5 h-full border-r border-border/50 shrink-0">
                <Search className="size-3.5 text-primary group-hover:scale-110 transition-transform" aria-hidden />
              </span>
              <span className="truncate px-1.5 sm:px-2.5 flex-1 text-left">Rechercher…</span>
              <kbd className="hidden shrink-0 rounded border border-border/80 bg-muted/80 px-1.5 mr-1.5 text-[10px] font-semibold text-muted-foreground shadow-2xs sm:inline-block">
                ⌘K
              </kbd>
            </button>

            {/* Bouton Scanner code-barres / CBM */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setScannerOpen(true)}
                  aria-label="Scanner un médicament (Code-barres / CBM)"
                  className="size-8 shrink-0 rounded-lg bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Barcode className="size-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Scanner un médicament (CBM)
              </TooltipContent>
            </Tooltip>

            {/* Badge total AMM */}
            {stats ? (
              <Badge
                variant="outline"
                className="hidden gap-1.5 border-primary/25 bg-primary/5 text-primary 2xl:inline-flex shrink-0"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                {formatNumber(stats.total)} AMM
              </Badge>
            ) : (
              <Skeleton className="hidden h-6 w-20 rounded-full 2xl:block shrink-0" aria-hidden />
            )}

            <AudienceToggle />

            {/* Bascule 1-Clic : Mode Botanique & Pharmacopée vs Mode Clinique */}
            <Tooltip>
              <TooltipTrigger asChild>
                {isBotanique ? (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-pressed={isBotanique}
                    aria-label="Désactiver le mode botanique — revenir au design Clinique Standard"
                    onClick={() => setDesignMode('standard')}
                    className="h-8 gap-1.5 rounded-lg border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300 hover:bg-sky-500/20 font-semibold text-xs px-2 sm:px-2.5 shadow-2xs transition-all duration-300 cursor-pointer shrink-0"
                  >
                    <Pill className="size-3.5 text-sky-600 dark:text-sky-400" />
                    <span className="hidden 2xl:inline">Mode Clinique</span>
                    <span className="hidden sm:inline 2xl:hidden">Clinique</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-pressed={isBotanique}
                    aria-label="Activer le mode botanique — design Pharmacopée Royale & Botanique"
                    onClick={() => setDesignMode('botanique')}
                    className="h-8 gap-1.5 rounded-lg border-[#2d6a4f]/40 bg-[#1b4332]/10 text-[#1b4332] dark:text-[#34d399] dark:border-[#34d399]/40 hover:bg-[#1b4332]/20 font-semibold text-xs px-2 sm:px-2.5 shadow-2xs transition-all duration-300 cursor-pointer shrink-0"
                  >
                    <Leaf className="size-3.5 text-[#1b4332] dark:text-[#34d399]" />
                    <span className="hidden 2xl:inline">Mode Botanique</span>
                    <span className="hidden sm:inline 2xl:hidden">Botanique</span>
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isBotanique
                  ? 'Revenir au design Clinique Standard (20 palettes)'
                  : 'Basculer vers le design Pharmacopée Royale & Botanique (1 clic)'}
              </TooltipContent>
            </Tooltip>

            {/* Sélecteur de Nuancier & Palettes (uniquement si en mode standard) */}
            {!isBotanique && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPaletteOpen(true)}
                    aria-label="Nuancier & Palettes de couleurs"
                    className="size-8 shrink-0 rounded-lg bg-accent/50 text-muted-foreground hover:bg-accent hover:text-primary transition-all duration-200"
                  >
                    <Palette className="size-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Nuancier & Palettes (20 designs)
                </TooltipContent>
              </Tooltip>
            )}

            <ThemeToggle />

            {/* Bouton Verrouiller la session */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Verrouiller la session"
                  className="size-8 shrink-0 rounded-lg bg-accent/50 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
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
        <PaletteDialog />
      </header>
    </TooltipProvider>
  )
}
