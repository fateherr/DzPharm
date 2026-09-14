'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Baby,
  BookMarked,
  BookOpen,
  Bone,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  ClipboardList,
  Copy,
  Droplets,
  Flower2,
  FlaskConical,
  HeartHandshake,
  HeartPulse,
  Home,
  Library,
  ListOrdered,
  Loader2,
  MessageCircleHeart,
  Pill as PillMeta,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Soup,
  Stethoscope,
  Syringe,
  Thermometer,
  Wind,
  ZapOff,
  type LucideIcon,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { fetchMonograph, fetchMonographs } from './api'
import type { MonoItem, MonographDetail } from './types'
import { useDzPharm } from './store'
import { SafetyNote } from './safety-note'
import {
  GLOSSARY_CATEGORIES,
  GLOSSARY_TERMS,
  normalizeFr,
  type GlossaryTerm,
} from '@/lib/glossary-data'
import { PATIENT_GUIDES, type PatientGuide } from '@/lib/patient-guides'

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
              932 monographies DCI de référence (livres techniques &amp; synthèses cliniques),
              un glossaire de {GLOSSARY_TERMS.length} termes pharmaceutiques et{' '}
              {PATIENT_GUIDES.length} guides d&apos;éducation pour vos patients.
            </p>
          </div>
        </div>
      </div>

      {/* Onglets : Monographies · Glossaire · Guides patients */}
      <Tabs defaultValue="monographies">
        <TabsList className="h-11 w-full justify-center rounded-xl p-1 sm:w-auto">
          <TabsTrigger
            value="monographies"
            className="gap-1.5 px-3 text-xs sm:px-4 sm:text-[13px]"
          >
            <BookOpen className="size-4" aria-hidden />
            Monographies
          </TabsTrigger>
          <TabsTrigger
            value="glossaire"
            className="gap-1.5 px-3 text-xs sm:px-4 sm:text-[13px]"
          >
            <BookMarked className="size-4" aria-hidden />
            Glossaire
          </TabsTrigger>
          <TabsTrigger
            value="guides"
            className="gap-1.5 px-3 text-xs sm:px-4 sm:text-[13px]"
          >
            <HeartHandshake className="size-4" aria-hidden />
            Guides patients
          </TabsTrigger>
        </TabsList>

        {/* ---------------- Onglet Monographies (comportement inchangé) -------- */}
        <TabsContent value="monographies" className="mt-6">
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
        </TabsContent>

        {/* ---------------- Onglet Glossaire ------------------------------------ */}
        <TabsContent value="glossaire" className="mt-6">
          <GlossaryTab />
        </TabsContent>

        {/* ---------------- Onglet Guides patients ----------------------------- */}
        <TabsContent value="guides" className="mt-6">
          <GuidesTab />
        </TabsContent>
      </Tabs>

      {/* Lecteur de monographie */}
      <MonographReader dciKey={openKey} onClose={closeMonograph} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet Glossaire                                                    */
/* ------------------------------------------------------------------ */

const CATEGORY_ACCENTS: Record<string, { text: string; dot: string }> = {
  'Forms & galénique': {
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  'Voies d’administration': {
    text: 'text-teal-600 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  Pharmacocinétique: {
    text: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  Interactions: {
    text: 'text-rose-600 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  'Statuts réglementaires': {
    text: 'text-primary',
    dot: 'bg-primary',
  },
  'Dispensation & ordonnance': {
    text: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  'Pharmacovigilance & sécurité': {
    text: 'text-state-danger',
    dot: 'bg-state-danger',
  },
  'Économie du médicament': {
    text: 'text-chifa',
    dot: 'bg-chifa',
  },
}

function categoryAccent(category: string) {
  return (
    CATEGORY_ACCENTS[category] ?? {
      text: 'text-primary',
      dot: 'bg-primary',
    }
  )
}

function GlossaryTab() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 280)
    return () => clearTimeout(t)
  }, [q])

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of GLOSSARY_TERMS) map[t.category] = (map[t.category] ?? 0) + 1
    return map
  }, [])

  const filtered = useMemo(() => {
    const needle = normalizeFr(debouncedQ.trim())
    return GLOSSARY_TERMS.filter((t) => {
      if (category && t.category !== category) return false
      if (!needle) return true
      return (
        normalizeFr(t.term).includes(needle) ||
        normalizeFr(t.definition).includes(needle) ||
        normalizeFr(t.category).includes(needle)
      )
    })
  }, [debouncedQ, category])

  const searchRelated = (term: string) => {
    setQ(term)
    setCategory('')
  }

  return (
    <div>
      {/* Compteur global */}
      <p className="mb-4 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{GLOSSARY_TERMS.length} termes</span>{' '}
        · {GLOSSARY_CATEGORIES.length} catégories — nomenclature, galénique,
        pharmacocinétique, dispensation et économie du médicament.
      </p>

      {/* Catégories — chips scrollables avec comptages */}
      <div className="relative mb-5">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              !category
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
            )}
          >
            Toutes
            <span className="ml-1.5 text-xs opacity-70">{GLOSSARY_TERMS.length}</span>
          </button>
          {GLOSSARY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(category === cat ? '' : cat)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                category === cat
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {cat}
              <span className="ml-1.5 text-xs opacity-70">{counts[cat] ?? 0}</span>
            </button>
          ))}
          <span className="w-6 shrink-0 sm:hidden" aria-hidden />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
          aria-hidden
        />
      </div>

      {/* Recherche insensible aux accents */}
      <div className="relative mb-6 max-w-xl">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un terme ou une définition (ex. générique, AMM, biodisponibilité…)"
          className="h-11 rounded-xl pl-10 text-sm"
          aria-label="Rechercher dans le glossaire"
        />
      </div>

      {/* Résultats */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BookMarked className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 font-medium text-foreground">Aucun terme trouvé</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Essayez un autre mot-clé ou sélectionnez « Toutes » les catégories.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
            terme{filtered.length > 1 ? 's' : ''}
            {category ? ` — ${category}` : ''}
            {debouncedQ ? ` pour « ${debouncedQ} »` : ''}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => (
              <GlossaryCard
                key={t.term}
                term={t}
                index={i}
                onSeeAlso={searchRelated}
              />
            ))}
          </div>
        </>
      )}

      {/* Note de bas d'onglet */}
      <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
        Glossaire à visée pédagogique — les définitions simplifient les concepts
        pour la formation et le conseil ; elles ne remplacent ni le RCP ni les
        textes réglementaires officiels.
      </p>
    </div>
  )
}

function GlossaryCard({
  term,
  index,
  onSeeAlso,
}: {
  term: GlossaryTerm
  index: number
  onSeeAlso: (term: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const accent = categoryAccent(term.category)
  const isLong = term.definition.length > 260

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn('text-[15px] leading-snug font-bold', accent.text)}>
          {term.term}
        </h3>
        <span
          className={cn('mt-1.5 size-2 shrink-0 rounded-full', accent.dot)}
          aria-hidden
        />
      </div>
      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <span className={cn('size-1.5 rounded-full', accent.dot)} aria-hidden />
        {term.category}
      </p>

      <p
        className={cn(
          'mt-2 text-sm leading-relaxed text-foreground/90',
          isLong && !expanded && 'line-clamp-4'
        )}
      >
        {term.definition}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Réduire <ChevronUp className="size-3.5" aria-hidden />
            </>
          ) : (
            <>
              Voir la définition complète <ChevronDown className="size-3.5" aria-hidden />
            </>
          )}
        </button>
      )}

      {term.seeAlso && term.seeAlso.length > 0 && (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Voir aussi
          </span>
          {term.seeAlso.map((related) => (
            <button
              key={related}
              type="button"
              onClick={() => onSeeAlso(related)}
              className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Rechercher le terme ${related} dans le glossaire`}
            >
              {related}
            </button>
          ))}
        </div>
      )}
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/* Onglet Guides patients                                              */
/* ------------------------------------------------------------------ */

const GUIDE_ICONS: Record<string, LucideIcon> = {
  Antibiotiques: ShieldPlus,
  Diabétologie: Droplets,
  Antalgiques: Thermometer,
  Pneumologie: Wind,
  Cardiologie: HeartPulse,
  'Gastro-entérologie': Soup,
  'Dermatologie/ORL': Flower2,
  Rhumatologie: Bone,
  Transversal: Home,
  Gynécologie: Baby,
}

function guideIcon(domain: string): LucideIcon {
  return GUIDE_ICONS[domain] ?? Stethoscope
}

function prettifyDci(key: string): string {
  return key
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function GuidesTab() {
  const [openGuideId, setOpenGuideId] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState<string | null>(null)
  const openLibraryMonograph = useDzPharm((s) => s.openLibraryMonograph)
  const { toast } = useToast()

  const guide = openGuideId
    ? (PATIENT_GUIDES.find((g) => g.id === openGuideId) ?? null)
    : null

  // Vérifie l'existence de la monographie puis ouvre le lecteur existant.
  const openMonographFromGuide = async (dciKey: string) => {
    if (lookingUp) return
    setLookingUp(dciKey)
    try {
      await fetchMonograph(dciKey)
      setOpenGuideId(null)
      openLibraryMonograph(dciKey)
    } catch {
      toast({
        title: 'Monographie introuvable',
        description: `Aucune fiche clinique trouvée pour « ${prettifyDci(dciKey)} ».`,
        variant: 'destructive',
      })
    } finally {
      setLookingUp(null)
    }
  }

  return (
    <div>
      <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {PATIENT_GUIDES.length} guides d&apos;éducation thérapeutique rédigés en
        français accessible, adaptés au contexte algérien — à remettre ou à
        commenter avec vos patients au comptoir.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PATIENT_GUIDES.map((g, i) => {
          const Icon = guideIcon(g.domain)
          return (
            <motion.button
              key={g.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => setOpenGuideId(g.id)}
              className="group flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={`Ouvrir le guide : ${g.title}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <Badge
                  variant="outline"
                  className="shrink-0 border-primary/25 bg-primary/5 text-[10px] text-primary"
                >
                  {g.domain}
                </Badge>
              </div>
              <h3 className="mt-3 text-base leading-snug font-semibold text-foreground group-hover:text-primary">
                {g.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                {g.sections.length} sections · {g.relatedDci.length} médicament
                {g.relatedDci.length > 1 ? 's' : ''} associé
                {g.relatedDci.length > 1 ? 's' : ''}
              </p>
              <span className="mt-auto pt-3 text-xs font-medium text-primary group-hover:underline">
                Lire le guide →
              </span>
            </motion.button>
          )
        })}
      </div>

      {/* Lecteur de guide */}
      <GuideReader
        guide={guide}
        onClose={() => setOpenGuideId(null)}
        lookingUp={lookingUp}
        onOpenMonograph={openMonographFromGuide}
      />
    </div>
  )
}

function GuideReader({
  guide,
  onClose,
  lookingUp,
  onOpenMonograph,
}: {
  guide: PatientGuide | null
  onClose: () => void
  lookingUp: string | null
  onOpenMonograph: (dciKey: string) => void
}) {
  return (
    <Sheet open={!!guide} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {guide ? (
          <GuideReaderBody
            guide={guide}
            lookingUp={lookingUp}
            onOpenMonograph={onOpenMonograph}
          />
        ) : (
          <>
            <SheetTitle className="sr-only">Guide patient</SheetTitle>
            <SheetDescription className="sr-only">
              Guide d&apos;éducation thérapeutique
            </SheetDescription>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function GuideReaderBody({
  guide,
  lookingUp,
  onOpenMonograph,
}: {
  guide: PatientGuide
  lookingUp: string | null
  onOpenMonograph: (dciKey: string) => void
}) {
  const Icon = GUIDE_ICONS[guide.domain] ?? Stethoscope

  return (
    <>
      <SheetHeader className="space-y-3 border-b border-border/70 bg-card/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <SheetTitle className="text-xl leading-tight font-bold tracking-tight text-foreground">
                      {guide.title}
                    </SheetTitle>
                    <SheetDescription className="mt-1 text-sm font-medium text-primary">
                      Guide patient — {guide.domain}
                    </SheetDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1.5 border-primary/30 bg-primary/10 text-primary"
                >
                  <HeartHandshake className="size-3.5" aria-hidden />
                  Éducation
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {guide.sections.length} sections · rédigé pour les patients, en
                français simple
              </p>
            </SheetHeader>

            {/* Corps */}
            <div className="scroll-thin flex-1 overflow-y-auto">
              <div className="space-y-5 p-5">
                {guide.sections.map((s, i) => (
                  <section
                    key={s.heading}
                    className="rounded-xl border border-border/60 bg-card/40 p-4"
                  >
                    <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      {s.heading}
                    </h3>
                    <div className="mt-3 space-y-2.5">
                      {s.body.map((p, j) => (
                        <p
                          key={j}
                          className="text-[13px] leading-relaxed text-foreground/90"
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  </section>
                ))}

                {/* Monographies liées */}
                {guide.relatedDci.length > 0 && (
                  <section className="rounded-xl border border-border/60 p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PillMeta className="size-4 text-primary" aria-hidden />
                      Médicaments abordés dans ce guide
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {guide.relatedDci.map((dciKey) => (
                        <button
                          key={dciKey}
                          type="button"
                          disabled={lookingUp === dciKey}
                          onClick={() => onOpenMonograph(dciKey)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
                        >
                          {lookingUp === dciKey ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <PillMeta className="size-3.5" aria-hidden />
                          )}
                          {prettifyDci(dciKey)}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[11px] text-muted-foreground">
                      Cliquez sur un médicament pour ouvrir sa monographie clinique
                      complète.
                    </p>
                  </section>
                )}

                <SafetyNote>
                  Contenu éducatif — ne remplace pas les conseils de votre médecin
                  ou pharmacien.
                </SafetyNote>
              </div>
            </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Lecteur — Sheet plein écran                                         */
/* ------------------------------------------------------------------ */

function MonographReader({ dciKey, onClose }: { dciKey: string | null; onClose: () => void }) {
  const openDrug = useDzPharm((s) => s.openDrug)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [copiedSummary, setCopiedSummary] = useState(false)
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
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-primary/30 bg-primary/10 text-primary"
                  >
                    <BookOpen className="size-3.5" aria-hidden />
                    Livre technique
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="h-8 gap-1.5 px-2.5 text-xs"
                    aria-label="Imprimer la fiche comptoir de cette DCI"
                  >
                    <Printer className="size-3.5" aria-hidden />
                    Fiche comptoir
                  </Button>
                </div>
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

              {/* Badges de sécurité clinique */}
              {data.safety && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50">
                  {data.safety.pregnancy && (
                    <button
                      type="button"
                      onClick={() => goToSection('pregnancy')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80',
                        data.safety.pregnancy === 'AUTORISE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : data.safety.pregnancy === 'CONTRE-INDIQUE'
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      )}
                      title="Voir section Grossesse & Allaitement"
                    >
                      {data.safety.pregnancy === 'AUTORISE' ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <AlertTriangle className="size-3" />
                      )}
                      Grossesse : {data.safety.pregnancyLabel || data.safety.pregnancy}
                    </button>
                  )}

                  {data.safety.breastfeeding && (
                    <button
                      type="button"
                      onClick={() => goToSection('pregnancy')}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80',
                        data.safety.breastfeeding === 'COMPATIBLE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : data.safety.breastfeeding === 'A_EVITER'
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      )}
                      title="Voir section Grossesse & Allaitement"
                    >
                      <Baby className="size-3" />
                      Allaitement : {data.safety.breastfeeding === 'COMPATIBLE' ? 'Compatible' : data.safety.breastfeeding === 'A_EVITER' ? 'À éviter' : 'Surveillance'}
                    </button>
                  )}

                  {data.safety.driving !== undefined && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                        data.safety.driving === 0
                          ? 'border-border bg-muted/60 text-muted-foreground'
                          : data.safety.driving === 1
                            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                            : data.safety.driving === 2
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold'
                      )}
                    >
                      <Car className="size-3" />
                      Conduite : Niv. {data.safety.driving}
                    </span>
                  )}

                  {data.safety.doping ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                      <ZapOff className="size-3" />
                      Dopage : Substance réglementée
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="size-3" />
                      Sport : Non dopant
                    </span>
                  )}

                  {data.safety.renalAlert && (
                    <button
                      type="button"
                      onClick={() => goToSection('posology')}
                      className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-300 transition hover:opacity-80"
                      title="Voir section Posologies pour adaptation"
                    >
                      <Activity className="size-3" />
                      Adaptation DFG requise
                    </button>
                  )}
                </div>
              )}

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
                {/* Flash Card Synthèse */}
                {data.summary && (
                  <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                          ⚡
                        </span>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                          Synthèse Clinique Rapide (30s)
                        </h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-xs text-primary hover:bg-primary/15"
                        onClick={() => {
                          navigator.clipboard.writeText(`[SYNTHÈSE CLINIQUE DZPHARM - ${data.dci}]\n\n${data.summary}`)
                          setCopiedSummary(true)
                          setTimeout(() => setCopiedSummary(false), 2000)
                        }}
                        aria-label="Copier la synthèse clinique"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Copié !</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3.5" />
                            <span>Copier</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed font-medium text-foreground/90">
                      {data.summary}
                    </p>
                  </div>
                )}
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
      {data ? <PrintCounterSheet data={data} /> : null}
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

/* ------------------------------------------------------------------ */
/* Fiche comptoir imprimable — A4 noir & blanc (uniquement impression) */
/* ------------------------------------------------------------------ */

function PrintItems({ items, max }: { items: MonoItem[]; max?: number }) {
  const list = (max ? items.slice(0, max) : items).filter((i) => i.text?.trim())
  if (list.length === 0) return <p className="italic opacity-60">Non renseigné dans la source.</p>
  return (
    <ul className="space-y-0.5">
      {list.map((it, i) => (
        <li key={i} className="leading-snug">
          {it.label ? <strong className="mr-1">{it.label}&nbsp;:</strong> : null}
          {it.text}
        </li>
      ))}
    </ul>
  )
}

function PrintSection({
  title,
  items,
  max,
}: {
  title: string
  items: MonoItem[]
  max?: number
}) {
  return (
    <section className="mb-1.5 break-inside-avoid border border-black/70 p-1.5">
      <h2 className="mb-1.5 border-b border-black/40 pb-1 text-[10px] font-bold tracking-[0.15em] uppercase">
        {title}
      </h2>
      <PrintItems items={items} max={max} />
    </section>
  )
}

function PrintCounterSheet({ data }: { data: MonographDetail }) {
  if (typeof document === 'undefined') return null
  const s = data.sections
  const now = new Date().toLocaleDateString('fr-FR')

  return createPortal(
    <div className="print-counter fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible">
      <div className="mx-auto max-w-[186mm] px-4 py-3 text-[10px] leading-snug">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase">
              DzPharm — Référentiel Pharmaceutique Algérien
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{data.dci}</h1>
            <p className="mt-0.5 font-semibold">
              {data.domain}
              {data.registryTotal > 0
                ? ` · ${data.registryTotal} spécialité(s) active(s) au registre`
                : ''}
            </p>
          </div>
          <div className="shrink-0 text-right text-[9px]">
            <p className="font-bold">Fiche comptoir</p>
            <p>Source : {data.book}</p>
            <p>Éditée le {now}</p>
          </div>
        </div>

        {/* Corps en 2 colonnes compactes */}
        <div className="mt-2 columns-2 gap-3">
          <PrintSection title="Résumé express" items={s.mechanism} max={3} />
          <PrintSection title="Posologie" items={s.posology} max={5} />
          <PrintSection title="Contre-indications" items={s.contraindications} max={5} />
          <PrintSection title="Interactions clés" items={s.interactions} max={4} />
          <PrintSection title="Grossesse / Allaitement" items={s.pregnancy} max={4} />
          <PrintSection
            title="Conseils au comptoir — règles d'or"
            items={[...s.advice, ...s.notes]}
            max={3}
          />
        </div>

        {/* Pied de page */}
        <p className="mt-2 border-t border-black/50 pt-1.5 text-[8px] leading-relaxed text-black/80">
          Document de travail officine — ne remplace pas le RCP. Sources : 24 livres
          DzPharm ({data.book}). Généré le {now}. Vérifiez toujours le statut
          d&apos;enregistrement et le prix PPA en vigueur avant dispensation.
        </p>
      </div>
    </div>,
    document.body
  )
}
