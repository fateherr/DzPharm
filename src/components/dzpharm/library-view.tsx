'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Baby,
  BookMarked,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Library,
  ListOrdered,
  Loader2,
  MessageCircleHeart,
  Pill as PillMeta,
  Search,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { fetchMonograph, fetchMonographs } from './api'
import type { MonoItem, MonographDetail } from './types'
import { useDzPharm } from './store'

/* ------------------------------------------------------------------ */
/* Sections — icônes, titres, criticité                                */
/* ------------------------------------------------------------------ */

interface SectionMeta {
  key: keyof MonographDetail['sections']
  title: string
  icon: typeof BookOpen
  critical?: boolean
}

const SECTIONS: SectionMeta[] = [
  { key: 'categories', title: 'Classification', icon: ListOrdered },
  { key: 'mechanism', title: 'Mécanisme & pharmacologie', icon: FlaskConical },
  { key: 'indications', title: 'Indications', icon: Stethoscope },
  { key: 'posology', title: 'Posologies', icon: Syringe },
  { key: 'contraindications', title: 'Contre-indications', icon: CircleAlert, critical: true },
  { key: 'adverse', title: 'Effets indésirables', icon: CircleAlert, critical: true },
  { key: 'interactions', title: 'Interactions', icon: HeartPulse, critical: true },
  { key: 'pregnancy', title: 'Grossesse & allaitement', icon: Baby, critical: true },
  { key: 'management', title: 'Conduite pratique', icon: ClipboardList },
  { key: 'galenic', title: 'Formes & galénique', icon: PillMeta },
  { key: 'pk', title: 'Pharmacocinétique', icon: FlaskConical },
  { key: 'advice', title: 'Conseils au comptoir', icon: MessageCircleHeart },
  { key: 'notes', title: 'Notes & références', icon: BookOpen },
  { key: 'available', title: 'Disponibles en Algérie', icon: Library },
]

// lucide aliases

/* ------------------------------------------------------------------ */
/* Vue principale                                                      */
/* ------------------------------------------------------------------ */

export function LibraryView() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [domain, setDomain] = useState('')
  const [page, setPage] = useState(1)
  // Monographie ouverte — source de vérité dans le store (cross-link fiches)
  const openKey = useDzPharm((s) => s.libraryDciKey)
  const openMonograph = useDzPharm((s) => s.openLibraryMonograph)
  const closeMonograph = useDzPharm((s) => s.closeLibraryMonograph)

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q)
      setPage(1)
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  const selectDomain = (value: string) => {
    setDomain(value)
    setPage(1)
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['monographs', debouncedQ, domain, page],
    queryFn: ({ signal }) =>
      fetchMonographs(
        { q: debouncedQ, domain: domain || undefined, page, pageSize: 24 },
        signal
      ),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  })

  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Library className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bibliothèque clinique
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              911 monographies DCI extraites des 24 livres de pharmacologie clinique —
              mécanismes, posologies, contre-indications, grossesse et conseils au comptoir.
            </p>
          </div>
        </div>
      </div>

      {/* Domaines — chips scrollables avec indicateur de défilement */}
      <div className="relative mb-5">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => selectDomain('')}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              !domain
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            Tous les domaines
            <span className="ml-1.5 text-xs opacity-70">{total || '—'}</span>
          </button>
          {(data?.domains ?? []).map((d) => (
            <button
              key={d.name}
              type="button"
              onClick={() => selectDomain(domain === d.name ? '' : d.name)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                domain === d.name
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {d.name}
              <span className="ml-1.5 text-xs opacity-70">{d.count}</span>
            </button>
          ))}
          {/* Espaceur final pour le fondu */}
          <span className="w-6 shrink-0 sm:hidden" aria-hidden />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
          aria-hidden
        />
      </div>

      {/* Recherche */}
      <div className="relative mb-6 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une DCI (ex. amoxicilline, metformine, bisoprolol…)"
          className="h-11 rounded-xl pl-10 text-sm"
          aria-label="Rechercher une monographie par DCI"
        />
        {isFetching && (
          <Loader2
            className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      {/* Grille des fiches */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium text-foreground">Aucune monographie trouvée</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Essayez une autre orthographe ou parcourez les domaines.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{total.toLocaleString('fr-FR')}</span>{' '}
            monographie{total > 1 ? 's' : ''}
            {domain ? ` — ${domain}` : ''}
            {debouncedQ ? ` pour « ${debouncedQ} »` : ''}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((m, i) => (
              <motion.button
                key={m.dciKey}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.02, 0.3) }}
                onClick={() => openMonograph(m.dciKey)}
                className="group flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base leading-snug font-semibold text-foreground group-hover:text-primary">
                    {m.dci}
                  </h3>
                  {m.hasPregnancy && (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-pink-300/60 bg-pink-50 text-[10px] text-pink-700 dark:border-pink-500/30 dark:bg-pink-950/40 dark:text-pink-300"
                    >
                      <Baby className="size-3" aria-hidden />
                      CRAT
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs font-medium text-primary/80">{m.domain}</p>
                {m.summary && (
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                    {m.summary}…
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                    <BookMarked className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{m.book}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {m.itemCount} blocs
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Page précédente"
              >
                <ChevronLeft className="size-4" aria-hidden />
                Précédent
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Page suivante"
              >
                Suivant
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Lecteur de monographie */}
      <MonographReader dciKey={openKey} onClose={closeMonograph} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Lecteur — Sheet plein écran                                         */
/* ------------------------------------------------------------------ */

function MonographReader({ dciKey, onClose }: { dciKey: string | null; onClose: () => void }) {
  const openDrug = useDzPharm((s) => s.openDrug)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['monograph', dciKey],
    queryFn: ({ signal }) => fetchMonograph(dciKey!, signal),
    enabled: !!dciKey,
    staleTime: 10 * 60 * 1000,
  })

  const visibleSections = useMemo(() => {
    if (!data) return []
    return SECTIONS.filter((s) => data.sections[s.key].length > 0)
  }, [data])

  const goToSection = (key: string) => {
    const el = scrollRef.current?.querySelector(`[data-section="${key}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(key)
    }
  }

  return (
    <Sheet open={!!dciKey} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {isLoading || !data ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">
              Chargement de la monographie
            </SheetTitle>
            <SheetDescription className="sr-only">
              Fiche issue des livres de pharmacologie clinique
            </SheetDescription>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Chargement de la monographie…
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {/* En-tête */}
            <SheetHeader className="space-y-3 border-b border-border/70 bg-card/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-xl leading-tight font-bold tracking-tight text-foreground">
                    {data.dci}
                  </SheetTitle>
                  <SheetDescription className="mt-1 text-sm font-medium text-primary">
                    {data.domain} — monographie issue des livres techniques
                  </SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1.5 border-primary/30 bg-primary/10 text-primary"
                >
                  <BookOpen className="size-3.5" aria-hidden />
                  Livre technique
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookMarked className="size-3.5" aria-hidden />
                  {data.book}
                </span>
                {data.registryTotal > 0 && (
                  <span className="flex items-center gap-1">
                    <BookMarked className="size-3.5" aria-hidden />
                    {data.registryTotal} spécialités actives au registre
                  </span>
                )}
              </div>
              {/* Navigation par sections */}
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto pt-1">
                {visibleSections.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => goToSection(s.key)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                      activeSection === s.key
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : s.critical
                          ? 'border-state-danger/30 bg-state-danger/5 text-state-danger hover:bg-state-danger/10'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <s.icon className="size-3" aria-hidden />
                    {s.title}
                  </button>
                ))}
              </div>
            </SheetHeader>

            {/* Corps */}
            <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto">
              <div className="space-y-6 p-5">
                {visibleSections.map((s) => (
                  <section
                    key={s.key}
                    data-section={s.key}
                    className="scroll-mt-4 rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <h3
                      className={cn(
                        'mb-3 flex items-center gap-2 text-sm font-semibold',
                        s.critical ? 'text-state-danger' : 'text-foreground'
                      )}
                    >
                      <s.icon className="size-4" aria-hidden />
                      {s.title}
                      <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {data.sections[s.key].length}
                      </span>
                    </h3>
                    <MonoSection items={data.sections[s.key]} />
                  </section>
                ))}

                {/* Spécialités du registre */}
                {data.registry.length > 0 && (
                  <section className="rounded-xl border border-border/60 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Library className="size-4 text-primary" aria-hidden />
                      Spécialités actives ({data.registryTotal})
                      <button
                        type="button"
                        onClick={() => openDrug(data.registry[0].id)}
                        className="ml-auto text-[11px] font-medium text-primary hover:underline"
                      >
                        Ouvrir la fiche complète →
                      </button>
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {data.registry.slice(0, 24).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            onClose()
                            openDrug(r.id)
                          }}
                          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <span className="font-semibold text-foreground">
                            {r.brand}
                          </span>
                          {r.dosage && (
                            <span className="ml-1 text-muted-foreground">{r.dosage}</span>
                          )}
                          <span className="ml-1.5 text-[10px] text-muted-foreground/80">
                            {r.lab}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <p className="border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground">
                  Contenu extrait des 24 livres de pharmacologie clinique DzPharm.
                  Ce document est un aide à la dispensation — il ne remplace pas le RCP du
                  produit ni l&apos;avis d&apos;un professionnel de santé. En cas d&apos;urgence :
                  SAMU 14 · Centre Anti-Poison (Alger) 021 71 30 42.
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Rendu d'une section                                                 */
/* ------------------------------------------------------------------ */

function MonoSection({ items }: { items: MonoItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="text-[13px] leading-relaxed text-foreground/90">
          {item.label && (
            <span className="mr-1.5 inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {item.label}
            </span>
          )}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}
