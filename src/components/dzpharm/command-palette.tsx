'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import {
  Baby,
  Barcode,
  BarChart3,
  BookOpen,
  Coins,
  CreditCard,
  Droplets,
  GitCompareArrows,
  HeartHandshake,
  HeartPulse,
  Home,
  Keyboard,
  Layers,
  Leaf,
  Library,
  Lock,
  Monitor,
  Moon,
  Palette,
  PhoneCall,
  Pill,
  Search,
  ShieldAlert,
  Siren,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  Users,
  Wrench,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { fetchDrugs } from './api'
import { StatusBadge, formatPrice, isLocal } from './status-badge'
import { useDzPharm, type ViewId } from './store'
import { terminateSession } from './session-guard'
import { cn } from '@/lib/utils'
import { PLATFORM_STATS, formatAmmCount } from '@/lib/constants/stats'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function CommandPalette() {
  const router = useRouter()
  const commandOpen = useDzPharm((s) => s.commandOpen)
  const setCommandOpen = useDzPharm((s) => s.setCommandOpen)
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const designMode = useDzPharm((s) => s.designMode)
  const setDesignMode = useDzPharm((s) => s.setDesignMode)
  const view = useDzPharm((s) => s.view)
  const setView = useDzPharm((s) => s.setView)
  const openDrug = useDzPharm((s) => s.openDrug)
  const openTool = useDzPharm((s) => s.openTool)
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)
  const setShortcutsOpen = useDzPharm((s) => s.setShortcutsOpen)
  const density = useDzPharm((s) => s.density)
  const setDensity = useDzPharm((s) => s.setDensity)
  const { theme, setTheme } = useTheme()

  const [query, setQuery] = useState('')
  const debounced = useDebounce(query.trim(), 200)

  // Analyse des préfixes (@ pour DCI, # pour Laboratoire)
  const { cleanQuery, scopePrefix } = useMemo(() => {
    const raw = debounced.trim()
    if (raw.startsWith('@')) {
      return { cleanQuery: raw.slice(1).trim(), scopePrefix: 'dci' as const }
    }
    if (raw.startsWith('#')) {
      return { cleanQuery: raw.slice(1).trim(), scopePrefix: 'lab' as const }
    }
    return { cleanQuery: raw, scopePrefix: undefined }
  }, [debounced])

  // Écouteur global pour raccourcis clavier & touches d'accès rapide
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setView('interactions')
        router.push('/interactions')
        setCommandOpen(false)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandOpen, setCommandOpen, setView, router])

  // P0-06 (Bug #1) — Single-key hotkeys when the palette is open and focus is
  // NOT in the search input. Matches the CommandShortcut badges shown in the UI.
  // H=Accueil, R=Répertoire, P=Prix & Chifa, I=Interactions, C=Copilote,
  // S=Scanner, B=Botanique toggle, T=Nuancier.
  useEffect(() => {
    if (!commandOpen) return
    function handleHotkey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key.toLowerCase()
      const go = (targetView: ViewId, href: string) => {
        setView(targetView)
        router.push(href)
        setCommandOpen(false)
        setQuery('')
      }
      const HOTKEYS: Record<string, () => void> = {
        h: () => go('accueil', '/'),
        r: () => go('repertoire', '/repertoire'),
        p: () => go('catalogue', '/prix-chifa'),
        i: () => go('interactions', '/interactions'),
        c: () => go('copilote', '/copilote'),
        s: () => {
          setCommandOpen(false)
          setScannerOpen(true)
        },
        b: () => {
          setDesignMode(designMode === 'botanique' ? 'standard' : 'botanique')
          setCommandOpen(false)
        },
        t: () => {
          setCommandOpen(false)
          setPaletteOpen(true)
        },
      }
      if (HOTKEYS[key]) {
        e.preventDefault()
        HOTKEYS[key]()
      }
    }
    window.addEventListener('keydown', handleHotkey)
    return () => window.removeEventListener('keydown', handleHotkey)
  }, [commandOpen, setCommandOpen, setView, router, setScannerOpen, designMode, setDesignMode, setPaletteOpen])

  // Recherche en direct des médicaments
  const { data: drugResults, isLoading: drugsLoading } = useQuery({
    queryKey: ['command-drugs', cleanQuery, scopePrefix],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: cleanQuery, pageSize: 6, sort: 'relevance', scope: scopePrefix }, signal),
    enabled: cleanQuery.length >= 2,
    staleTime: 30 * 1000,
  })

  function navigateTo(targetView: ViewId, href?: string) {
    setView(targetView)
    setCommandOpen(false)
    setQuery('')
    const defaultHrefs: Record<ViewId, string> = {
      accueil: '/',
      repertoire: '/repertoire',
      catalogue: '/prix-chifa',
      interactions: '/interactions',
      copilote: '/copilote',
      bibliotheque: '/bibliotheque',
      armoire: '/armoire',
      outils: '/outils',
      stats: '/stats',
      apropos: '/a-propos',
    }
    const targetHref = href ?? defaultHrefs[targetView]
    if (targetHref) {
      router.push(targetHref)
    }
  }

  function handleOpenTool(tab: string) {
    openTool(tab)
    setCommandOpen(false)
    setQuery('')
  }

  function handleSelectDrug(id: number) {
    openDrug(id)
    setCommandOpen(false)
    setQuery('')
  }

  function handleSearchInDirectory(q: string) {
    gotoDirectory({ q })
    setCommandOpen(false)
    setQuery('')
  }

  return (
    <CommandDialog
      open={commandOpen}
      onOpenChange={setCommandOpen}
      title="Recherche universelle DzPharm"
      description="Rechercher un médicament, un outil clinique ou une commande système…"
      className="rounded-2xl border border-border/80 bg-popover/95 p-0 shadow-2xl backdrop-blur-2xl sm:max-w-2xl"
    >
      <CommandInput
        placeholder="Rechercher médicament (DCI, marque, dosage), outil… (@dci, #labo)"
        value={query}
        onValueChange={setQuery}
        className="text-base"
      />
      <CommandList className="scroll-thin max-h-[26rem] p-2">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {drugsLoading ? (
            <span>Recherche dans les 9&nbsp;555 AMM…</span>
          ) : (
            <div className="space-y-3">
              <p>Aucun résultat exact trouvé pour «&nbsp;{query}&nbsp;».</p>
              {drugResults?.suggestion && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                  <p className="flex items-center justify-center gap-1.5 font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    <span>
                      Vouliez-vous dire :{' '}
                      <strong className="text-foreground">{drugResults.suggestion}</strong> ?
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setQuery(drugResults.suggestion!)}
                    className="mt-2 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Chercher « {drugResults.suggestion} »
                  </button>
                </div>
              )}
              {query.length >= 2 && (
                <button
                  type="button"
                  onClick={() => handleSearchInDirectory(query)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-all"
                >
                  <Search className="size-3.5" />
                  <span>Chercher « {query} » dans le Répertoire</span>
                </button>
              )}
            </div>
          )}
        </CommandEmpty>

        {/* Section Action directe si texte saisi */}
        {debounced.length >= 2 && (
          <CommandGroup heading="Action de recherche">
            <CommandItem
              onSelect={() => handleSearchInDirectory(cleanQuery || debounced)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 cursor-pointer bg-primary/5 text-primary hover:bg-primary/10"
            >
              <Search className="size-4 text-primary" />
              <span className="font-semibold">Ouvrir « {cleanQuery || debounced} » dans le Répertoire complet</span>
              <CommandShortcut>⏎</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Section Médicaments en direct */}
        {debounced.length >= 2 && drugResults && drugResults.drugs.length > 0 && (
          <CommandGroup heading="Médicaments officiels (Nomenclature)">
            {drugResults.drugs.map((drug) => (
              <CommandItem
                key={drug.id}
                value={`${drug.brand} ${drug.dci} ${drug.dosage ?? ''} ${drug.lab ?? ''}`}
                onSelect={() => handleSelectDrug(drug.id)}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 cursor-pointer"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Pill className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-foreground">
                        {drug.brand}
                      </span>
                      {drug.dosage && (
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-foreground/80">
                          {drug.dosage}
                        </span>
                      )}
                      {drug.form && (
                        <span className="hidden sm:inline-block rounded border border-border/80 px-1 py-0.2 text-[9px] text-muted-foreground">
                          {drug.form}
                        </span>
                      )}
                      {drug.country && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.2 text-[9px] font-semibold',
                            isLocal(drug.country) ? 'bg-state-safe/10 text-state-safe' : 'bg-chifa/10 text-chifa'
                          )}
                        >
                          {isLocal(drug.country) ? 'Local' : 'Importé'}
                        </span>
                      )}
                      {drug.hasBookRcp && (
                        <span className="rounded bg-sky-500/10 border border-sky-500/30 px-1 py-0.2 text-[9px] font-semibold text-sky-700 dark:text-sky-300">
                          RCP
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {drug.dci}
                      {drug.lab ? ` · ${drug.lab}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {drug.price != null && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-chifa tabular-nums">
                      <Coins className="size-3" />
                      {formatPrice(drug.price)}
                    </span>
                  )}
                  <StatusBadge status={drug.status} className="shrink-0" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator className="my-1" />

        {/* Urgences Médicales Nationales */}
        <CommandGroup heading="Urgences Médicales & Secours Algérie">
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:14'
              setCommandOpen(false)
            }}
            className="cursor-pointer text-red-600 dark:text-red-400 font-medium"
          >
            <Siren className="size-4 text-red-500 animate-pulse" />
            <span>SAMU (14) — Urgence vitale</span>
            <CommandShortcut>14</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:1021'
              setCommandOpen(false)
            }}
            className="cursor-pointer text-amber-600 dark:text-amber-400 font-medium"
          >
            <PhoneCall className="size-4 text-amber-500" />
            <span>Protection Civile (1021 / 14) — Pompiers &amp; Secours</span>
            <CommandShortcut>1021</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:021713042'
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            <PhoneCall className="size-4 text-sky-500" />
            <span>Centre Antipoison National d&apos;Alger (021 71 30 42)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:1548'
              setCommandOpen(false)
            }}
            className="cursor-pointer text-blue-600 dark:text-blue-400"
          >
            <PhoneCall className="size-4 text-blue-500" />
            <span>Police Secours — Sûreté Nationale (1548 / 17)</span>
            <CommandShortcut>1548</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:1055'
              setCommandOpen(false)
            }}
            className="cursor-pointer text-emerald-600 dark:text-emerald-400"
          >
            <PhoneCall className="size-4 text-emerald-500" />
            <span>Gendarmerie Nationale (1055) — Secours routier</span>
            <CommandShortcut>1055</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Actions rapides */}
        <CommandGroup heading="Actions rapides">
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              setDesignMode(designMode === 'botanique' ? 'standard' : 'botanique')
            }}
            className="cursor-pointer"
          >
            {designMode === 'botanique' ? (
              <>
                <Pill className="size-4 text-sky-500" />
                <span>Basculer vers le Mode Clinique Standard</span>
              </>
            ) : (
              <>
                <Leaf className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Basculer vers le Mode Pharmacopée Royale &amp; Botanique (1 clic)</span>
              </>
            )}
            <CommandShortcut>B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              setPaletteOpen(true)
            }}
            className="cursor-pointer"
          >
            <Palette className="size-4 text-primary" />
            <span>Nuancier : Changer la palette de design &amp; couleurs (20 designs)</span>
            <CommandShortcut>T</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              setScannerOpen(true)
            }}
            className="cursor-pointer"
          >
            <Barcode className="size-4 text-primary" />
            <span>Scanner un médicament (Code-barres CBM / AMM)</span>
            <CommandShortcut>S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Navigation vers les vues */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigateTo('accueil')} className="cursor-pointer">
            <Home className="size-4 text-primary" />
            <span>Accueil &amp; Tableau de bord</span>
            <CommandShortcut>H</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('repertoire')} className="cursor-pointer">
            <BookOpen className="size-4 text-primary" />
            <span>Répertoire officiel des {formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} AMM</span>
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('catalogue')} className="cursor-pointer">
            <Store className="size-4 text-chifa" />
            <span>Catalogue Prix &amp; Remboursement Chifa</span>
            <CommandShortcut>P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('bibliotheque')} className="cursor-pointer">
            <Library className="size-4 text-primary" />
            <span>Bibliothèque clinique &amp; Monographies (24 livres)</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('interactions')} className="cursor-pointer">
            <ShieldAlert className="size-4 text-state-danger" />
            <span>Contrôle d&apos;interactions médicamenteuses</span>
            <CommandShortcut>I</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('armoire')} className="cursor-pointer">
            <Users className="size-4 text-primary" />
            <span>Armoire à pharmacie familiale</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('copilote')} className="cursor-pointer">
            <Sparkles className="size-4 text-primary" />
            <span>Copilote IA (Gemini 3.8 Flash)</span>
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('outils')} className="cursor-pointer">
            <Wrench className="size-4 text-chifa" />
            <span>Hub des outils cliniques</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo('stats')} className="cursor-pointer">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span>Statistiques du marché pharmaceutique</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Outils & Calculateurs directs */}
        <CommandGroup heading="Calculateurs cliniques">
          <CommandItem onSelect={() => handleOpenTool('pediatrie')} className="cursor-pointer">
            <Baby className="size-4 text-primary" />
            <span>Calculateur de posologies pédiatriques (mg/kg → mL)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleOpenTool('chifa')} className="cursor-pointer">
            <CreditCard className="size-4 text-chifa" />
            <span>Simulateur Chifa &amp; Reste à charge patient</span>
          </CommandItem>
          <CommandItem onSelect={() => handleOpenTool('renal')} className="cursor-pointer">
            <Droplets className="size-4 text-state-danger" />
            <span>Calculateur de fonction rénale (Cockcroft / MDRD)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleOpenTool('grossesse')} className="cursor-pointer">
            <HeartPulse className="size-4 text-pink-500" />
            <span>Compatibilité Grossesse &amp; Allaitement (CRAT)</span>
          </CommandItem>
          <CommandItem onSelect={() => handleOpenTool('ramadan')} className="cursor-pointer">
            <Moon className="size-4 text-chifa" />
            <span>Adaptateur de prises chronopharmacologiques Ramadan</span>
          </CommandItem>
          <CommandItem onSelect={() => handleOpenTool('comparateur')} className="cursor-pointer">
            <GitCompareArrows className="size-4 text-primary" />
            <span>Comparateur d&apos;équivalences et génériques</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Commandes Système */}
        <CommandGroup heading="Poste &amp; Sécurité">
          <CommandItem
            onSelect={() => {
              setAudience(audience === 'pro' ? 'famille' : 'pro')
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            {audience === 'pro' ? (
              <>
                <HeartHandshake className="size-4 text-chifa" />
                <span>Passer en Mode Famille (grand public)</span>
              </>
            ) : (
              <>
                <Stethoscope className="size-4 text-primary" />
                <span>Passer en Mode Professionnel (clinique)</span>
              </>
            )}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              setShortcutsOpen(true)
            }}
            className="cursor-pointer"
          >
            <Keyboard className="size-4 text-primary" />
            <span>Guide des raccourcis clavier</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              const nextDensity = density === 'compact' ? 'standard' : density === 'standard' ? 'spacious' : 'compact'
              setDensity(nextDensity)
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            <Layers className="size-4 text-emerald-500" />
            <span>
              Densité d’affichage : <strong className="capitalize">{density === 'compact' ? 'Compact' : density === 'standard' ? 'Standard' : 'Aéré'}</strong> (cliquer pour changer)
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
              setTheme(next)
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            {theme === 'system' ? (
              <>
                <Monitor className="size-4 text-sky-400" />
                <span>Thème : <strong>Système (auto)</strong> — cliquer pour Clair</span>
              </>
            ) : theme === 'dark' ? (
              <>
                <Sun className="size-4 text-amber-400" />
                <span>Thème : <strong>Sombre</strong> — cliquer pour Système</span>
              </>
            ) : (
              <>
                <Moon className="size-4 text-sky-400" />
                <span>Thème : <strong>Clair</strong> — cliquer pour Sombre</span>
              </>
            )}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              void terminateSession()
            }}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <Lock className="size-4" />
            <span>Verrouiller la session immédiatement</span>
            <CommandShortcut>⌘ L</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
