'use client'

import { useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Home,
  LayoutGrid,
  Library,
  MoreHorizontal,
  Pill,
  Search,
  ShieldAlert,
  Sparkles,
  Store,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useDzPharm, type ViewId } from './store'

interface NavTab {
  id: ViewId
  label: string
  icon: typeof Home
}

const PRIMARY_MOBILE_TABS: NavTab[] = [
  { id: 'accueil', label: 'Accueil', icon: Home },
  { id: 'repertoire', label: 'Répertoire', icon: BookOpen },
]

const SECONDARY_MOBILE_TABS: NavTab[] = [
  { id: 'interactions', label: 'Interactions', icon: ShieldAlert },
]

const MORE_MENU_ITEMS: Array<{ id: ViewId; label: string; icon: typeof Home; desc: string }> = [
  { id: 'catalogue', label: 'Prix & Chifa', icon: Store, desc: '1 791 produits d’officine avec PPA et remboursement CNAS' },
  { id: 'bibliotheque', label: 'Bibliothèque RCP', icon: Library, desc: 'Monographies cliniques et RCP officiels ANSM' },
  { id: 'copilote', label: 'Copilote IA', icon: Sparkles, desc: 'Assistant clinique intelligent (Gemini 3.8 Flash)' },
  { id: 'armoire', label: 'Armoire Familiale', icon: Users, desc: 'Gestion de la pharmacie de maison et péremptions' },
  { id: 'outils', label: 'Outils Médicaux', icon: Wrench, desc: 'Calculateurs pédiatriques, clairance, Ramadan' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, desc: 'Observatoire du marché pharmaceutique algérien' },
]

export function MobileBottomNav() {
  const view = useDzPharm((s) => s.view)
  const setView = useDzPharm((s) => s.setView)
  const setCommandOpen = useDzPharm((s) => s.setCommandOpen)
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = MORE_MENU_ITEMS.some((m) => m.id === view)

  function handleSelect(id: ViewId) {
    setView(id)
    setMoreOpen(false)
  }

  return (
    <>
      {/* Menu étendu "Plus d'outils" */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />

            {/* Bottom Sheet Menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border/80 bg-background/95 p-5 shadow-2xl backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="size-4 text-primary" />
                  <span className="font-semibold text-foreground">Tous les Modules</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Fermer le menu"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pb-8">
                {MORE_MENU_ITEMS.map((item) => {
                  const active = view === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        'flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all',
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary shadow-xs'
                          : 'border-border/70 bg-card hover:border-primary/20 hover:bg-accent'
                      )}
                    >
                      <span className={cn('flex size-8 items-center justify-center rounded-xl', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <item.icon className="size-4" />
                      </span>
                      <span className="mt-1 text-xs font-semibold text-foreground">{item.label}</span>
                      <span className="line-clamp-2 text-[10px] text-muted-foreground leading-tight">{item.desc}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Barre de navigation basse permanente */}
      <nav
        aria-label="Navigation mobile principale"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-around">
          {/* 1. Accueil */}
          <button
            type="button"
            onClick={() => handleSelect('accueil')}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition-colors',
              view === 'accueil' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className="size-5" />
            <span>Accueil</span>
          </button>

          {/* 2. Répertoire */}
          <button
            type="button"
            onClick={() => handleSelect('repertoire')}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition-colors',
              view === 'repertoire' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BookOpen className="size-5" />
            <span>Répertoire</span>
          </button>

          {/* 3. Bouton central Flash Search (Surélevé) */}
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label="Recherche universelle rapide"
            className="group relative -top-3 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-sky-600 text-primary-foreground shadow-lg shadow-primary/35 transition-transform active:scale-95"
          >
            <Search className="size-5.5 transition-transform group-hover:scale-110" />
          </button>

          {/* 4. Interactions */}
          <button
            type="button"
            onClick={() => handleSelect('interactions')}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition-colors',
              view === 'interactions' ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShieldAlert className="size-5" />
            <span>Sécurité</span>
          </button>

          {/* 5. Menu / Plus */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1 text-[10px] font-medium transition-colors',
              isMoreActive || moreOpen ? 'text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MoreHorizontal className="size-5" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
