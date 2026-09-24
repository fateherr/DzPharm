'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowUpDown,
  BookOpen,
  CornerDownLeft,
  Keyboard,
  Layers,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
} from 'lucide-react'
import { useDzPharm, type DensityMode } from './store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ShortcutItem {
  keys: string[]
  description: string
  context?: string
}

const GENERAL_SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'K'], description: 'Ouvrir la palette de commandes globale' },
  { keys: ['Ctrl', 'L'], description: 'Verrouiller la session (immédiat, depuis tout écran)' },
  { keys: ['?'], description: 'Afficher / Masquer ce guide des raccourcis' },
  { keys: ['Échap'], description: 'Fermer la fenêtre active, la fiche ou le menu' },
]

const PALETTE_SHORTCUTS: ShortcutItem[] = [
  { keys: ['H'], description: 'Aller à l’Accueil / Tableau de bord', context: 'Dans la palette' },
  { keys: ['R'], description: 'Accéder au Répertoire officiel des médicaments', context: 'Dans la palette' },
  { keys: ['P'], description: 'Ouvrir le simulateur Prix & Chifa (CNAS/CASNOS)', context: 'Dans la palette' },
  { keys: ['I'], description: 'Ouvrir le contrôle des Interactions', context: 'Dans la palette' },
  { keys: ['C'], description: 'Consulter le Copilote IA clinique', context: 'Dans la palette' },
  { keys: ['S'], description: 'Démarrer le Scanner de code-barres / DataMatrix', context: 'Dans la palette' },
  { keys: ['B'], description: 'Basculer entre Mode Clinique et Mode Botanique', context: 'Dans la palette' },
  { keys: ['T'], description: 'Ouvrir le Nuancier de palettes (20 thèmes)', context: 'Dans la palette' },
]

const NAVIGATION_SHORTCUTS: ShortcutItem[] = [
  { keys: ['↑', '↓'], description: 'Naviguer dans les suggestions et résultats' },
  { keys: ['Entrée'], description: 'Valider la sélection ou ouvrir la fiche médicament' },
  { keys: ['Tab'], description: 'Passer au champ ou bouton interactif suivant' },
  { keys: ['Shift', 'Tab'], description: 'Revenir à l’élément interactif précédent' },
]

export function ShortcutsModal() {
  const shortcutsOpen = useDzPharm((s) => s.shortcutsOpen)
  const setShortcutsOpen = useDzPharm((s) => s.setShortcutsOpen)
  const density = useDzPharm((s) => s.density)
  const setDensity = useDzPharm((s) => s.setDensity)

  // Écouteur global pour la touche '?' (Shift + /)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignorer si l'utilisateur est en train de taper dans un champ de saisie
      const target = e.target as HTMLElement | null
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isInput) return

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setShortcutsOpen(!shortcutsOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcutsOpen, setShortcutsOpen])

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scroll-thin rounded-2xl border border-border/80 bg-background/98 p-6 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Keyboard className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Raccourcis Clavier & Densité</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Optimisé pour une utilisation fluide en officine et en milieu hospitalier.
                </DialogDescription>
              </div>
            </div>

            {/* P2-39 — Sélecteur rapide de densité */}
            <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/50 p-1">
              {(['compact', 'standard', 'spacious'] as DensityMode[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all capitalize ${
                    density === d
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={`Passer en affichage ${d}`}
                >
                  {d === 'compact' ? 'Compact' : d === 'standard' ? 'Standard' : 'Aéré'}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* Section 1: Navigation générale */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Search className="size-3.5" />
              <span>Contrôles Principaux</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GENERAL_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-card/60 text-xs"
                >
                  <span className="text-muted-foreground">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Touches directes de la palette */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              <span>Accès Direct (Palette active)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PALETTE_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-card/60 text-xs"
                >
                  <span className="text-muted-foreground truncate" title={item.description}>
                    {item.description}
                  </span>
                  <kbd className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {item.keys[0]}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Navigation au clavier */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500 mb-3 flex items-center gap-1.5">
              <ArrowUpDown className="size-3.5" />
              <span>Navigation dans les Listes & Tableaux</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NAVIGATION_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border/60 bg-card/60 text-xs"
                >
                  <span className="text-muted-foreground">{item.description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-2xs"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Appuyez sur <kbd className="font-mono font-semibold">?</kbd> à tout moment pour rouvrir ce guide.</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShortcutsOpen(false)}
            className="text-xs h-7 px-3"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
