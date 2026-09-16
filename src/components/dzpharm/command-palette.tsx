'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
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
  Library,
  Lock,
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function CommandPalette() {
  const commandOpen = useDzPharm((s) => s.commandOpen)
  const setCommandOpen = useDzPharm((s) => s.setCommandOpen)
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)
  const setPaletteOpen = useDzPharm((s) => s.setPaletteOpen)
  const setView = useDzPharm((s) => s.setView)
  const openDrug = useDzPharm((s) => s.openDrug)
  const openTool = useDzPharm((s) => s.openTool)
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const audience = useDzPharm((s) => s.audience)
  const setAudience = useDzPharm((s) => s.setAudience)
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

  // Écouteur global pour Cmd+K / Ctrl+K (recherche) et Ctrl+I (interactions)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(!commandOpen)
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault()
        setView('interactions')
        setCommandOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandOpen, setCommandOpen, setView])

  // Recherche en direct des médicaments
  const { data: drugResults, isLoading: drugsLoading } = useQuery({
    queryKey: ['command-drugs', cleanQuery, scopePrefix],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: cleanQuery, pageSize: 6, sort: 'relevance', scope: scopePrefix }, signal),
    enabled: cleanQuery.length >= 2,
    staleTime: 30 * 1000,
  })

  function navigateTo(view: ViewId) {
    setView(view)
    setCommandOpen(false)
    setQuery('')
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
        <CommandGroup heading="Urgences Médicales Algérie">
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:14'
              setCommandOpen(false)
            }}
            className="cursor-pointer text-red-600 dark:text-red-400 font-medium"
          >
            <Siren className="size-4 text-red-500 animate-pulse" />
            <span>Appeler le SAMU (14) — Urgence vitale</span>
            <CommandShortcut>14</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              window.location.href = 'tel:021713042'
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            <PhoneCall className="size-4 text-amber-500" />
            <span>Centre Antipoison d&apos;Alger (021 71 30 42 / 021 71 30 43)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-1" />

        {/* Actions rapides */}
        <CommandGroup heading="Actions rapides">
          <CommandItem
            onSelect={() => {
              setCommandOpen(false)
              setPaletteOpen(true)
            }}
            className="cursor-pointer"
          >
            <Palette className="size-4 text-primary" />
            <span>Nuancier : Changer la palette de design &amp; couleurs (10 thèmes)</span>
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
            <span>Répertoire officiel des 9 555 AMM</span>
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
              setTheme(theme === 'dark' ? 'light' : 'dark')
              setCommandOpen(false)
            }}
            className="cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="size-4 text-amber-400" />
                <span>Activer le Thème Clair</span>
              </>
            ) : (
              <>
                <Moon className="size-4 text-sky-400" />
                <span>Activer le Thème Sombre</span>
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
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
