'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarX2,
  Eye,
  FlaskConical,
  Info,
  Package,
  Pill,
  Printer,
  Share2,
  ShieldPlus,
  Star,
  Syringe,
  Timer,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { fetchDrugDetail, postDrugView } from './api'
import type { DrugDetail } from './types'
import { RcpViewer } from './rcp-view'
import {
  ListeBadge,
  StatusBadge,
  countryCode,
  formatDate,
  formatNumber,
  isLocal,
} from './status-badge'
import { MAX_FAVORITES, useDzPharm } from './store'

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: typeof Pill
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {Icon ? <Icon className="size-3" aria-hidden /> : null}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold break-words text-foreground">{value || '—'}</p>
    </div>
  )
}

export function DrugSheet() {
  const sheetDrugId = useDzPharm((s) => s.sheetDrugId)
  const closeDrug = useDzPharm((s) => s.closeDrug)
  const openDrug = useDzPharm((s) => s.openDrug)
  const addToBasket = useDzPharm((s) => s.addToBasket)
  const setView = useDzPharm((s) => s.setView)
  const favorites = useDzPharm((s) => s.favorites)
  const toggleFavorite = useDzPharm((s) => s.toggleFavorite)
  const pushRecent = useDzPharm((s) => s.pushRecent)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [sheetTab, setSheetTab] = useState<'fiche' | 'rcp'>('fiche')

  // Repart sur l'onglet Fiche à chaque changement de médicament (ajustement au rendu)
  const [prevDrugId, setPrevDrugId] = useState(sheetDrugId)
  if (sheetDrugId !== prevDrugId) {
    setPrevDrugId(sheetDrugId)
    setSheetTab('fiche')
  }

  // Rafraîchit la fiche (compteur de consultations) à chaque ouverture
  useEffect(() => {
    if (sheetDrugId !== null) {
      queryClient.invalidateQueries({ queryKey: ['drug', sheetDrugId] })
    }
  }, [sheetDrugId, queryClient])

  const { data, isLoading } = useQuery({
    queryKey: ['drug', sheetDrugId],
    queryFn: ({ signal }) => fetchDrugDetail(sheetDrugId as number, signal),
    enabled: sheetDrugId !== null,
  })

  const drug = data?.drug
  const equivalents = data?.equivalents ?? []
  const isFav = drug ? favorites.some((f) => f.id === drug.id) : false

  // Historique récent + compteur de consultations (une fois par ouverture)
  const countedRef = useRef<number | null>(null)
  useEffect(() => {
    if (!drug) return
    pushRecent({ id: drug.id, brand: drug.brand, dci: drug.dci, status: drug.status })
    if (countedRef.current !== drug.id) {
      countedRef.current = drug.id
      postDrugView(drug.id)
    }
  }, [drug, pushRecent])

  function handleToggleFavorite() {
    if (!drug) return
    const res = toggleFavorite({ id: drug.id, brand: drug.brand, dci: drug.dci })
    if (res === 'added') {
      toast({
        title: 'Ajouté aux favoris',
        description: `${drug.brand} est accessible depuis l'accueil —Mes favoris.`,
      })
    } else if (res === 'removed') {
      toast({ title: 'Retiré des favoris', description: `${drug.brand} n'est plus dans vos favoris.` })
    } else {
      toast({
        title: 'Favoris complets',
        description: `Limite de ${MAX_FAVORITES} favoris atteinte.`,
        variant: 'destructive',
      })
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    if (!drug) return
    const text = [
      `${drug.brand} — ${drug.dci}`,
      `Statut : ${drug.status === 'ACTIF' ? 'Actif' : drug.status === 'RETRIE' ? 'Retiré du marché' : 'Non renouvelé'}`,
      drug.form ? `Forme : ${drug.form}` : '',
      drug.dosage ? `Dosage : ${drug.dosage}` : '',
      drug.lab ? `Laboratoire : ${drug.lab}` : '',
      drug.regNumber ? `AMM : ${drug.regNumber}` : '',
      `Voir la fiche complète sur DzPharm.`,
    ]
      .filter(Boolean)
      .join('\n')

    let shared = false
    try {
      if (navigator.share) {
        await navigator.share({ title: `${drug.brand} — DzPharm`, text })
        shared = true
      }
    } catch {
      /* partage natif annulé — repli presse-papier */
    }
    if (!shared) {
      let copied = false
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch {
        // Repli execCommand (contextes sans permission Clipboard API)
        try {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          copied = document.execCommand('copy')
          document.body.removeChild(ta)
        } catch {
          copied = false
        }
      }
      if (copied) {
        toast({
          title: 'Fiche copiée',
          description: 'Le résumé du médicament est dans le presse-papier.',
        })
      } else {
        toast({
          title: 'Copie impossible',
          description: 'Votre navigateur bloque le presse-papier.',
          variant: 'destructive',
        })
      }
    }
  }

  function handleAddToBasket() {
    if (!drug) return
    const result = addToBasket({
      id: drug.id,
      brand: drug.brand,
      dci: drug.dci,
      status: drug.status,
    })
    if (result === 'added') {
      toast({
        title: 'Ajouté au contrôle d\u2019interactions',
        description: `${drug.brand} (${drug.dci}) — retrouvez-le dans l\u2019onglet Interactions.`,
      })
      closeDrug()
      setView('interactions')
    } else if (result === 'duplicate') {
      toast({ title: 'Déjà présent', description: 'Ce médicament est déjà dans le panier d\u2019interactions.' })
    } else {
      toast({ title: 'Panier complet', description: 'Le contrôle d\u2019interactions est limité à 10 médicaments.' })
    }
  }

  return (
    <Sheet open={sheetDrugId !== null} onOpenChange={(o) => !o && closeDrug()}>
      <SheetContent
        side="right"
        className="scroll-thin w-full gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-md md:max-w-xl"
      >
        {isLoading || !drug ? (
          <div className="space-y-4 p-6">
            <SheetTitle className="sr-only">Chargement de la fiche médicament</SheetTitle>
            <SheetDescription className="sr-only">
              Les données du médicament sont en cours de chargement.
            </SheetDescription>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-2 gap-3 pt-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-3 border-b border-border/70 bg-card/50 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <SheetTitle className="text-2xl leading-tight font-bold tracking-tight text-foreground">
                    {drug.brand}
                  </SheetTitle>
                  <SheetDescription className="mt-1 text-sm font-medium text-muted-foreground">
                    {drug.dci}
                  </SheetDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    aria-label={`Partager la fiche de ${drug.brand}`}
                    className="size-9 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Share2 className="size-5" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    aria-label={isFav ? `Retirer ${drug.brand} des favoris` : `Ajouter ${drug.brand} aux favoris`}
                    aria-pressed={isFav}
                    className={cn(
                      'size-9 rounded-lg transition-colors',
                      isFav
                        ? 'text-chifa hover:bg-chifa/10'
                        : 'text-muted-foreground hover:text-chifa'
                    )}
                  >
                    <Star
                      className={cn('size-5', isFav && 'fill-chifa')}
                      aria-hidden
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrint}
                    aria-label="Imprimer la fiche du médicament"
                    className="size-9 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Printer className="size-5" aria-hidden />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={drug.status} />
                {drug.domains.slice(0, 2).map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {d}
                  </span>
                ))}
                <ListeBadge liste={drug.liste} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                    isLocal(drug.country)
                      ? 'border-state-safe/30 bg-state-safe/10 text-state-safe'
                      : 'border-chifa/30 bg-chifa/10 text-chifa'
                  )}
                >
                  {isLocal(drug.country) ? 'Produit local' : 'Importé'}
                </span>
                {typeof drug.views === 'number' && drug.views > 0 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
                    title="Consultations de cette fiche sur DzPharm"
                  >
                    <Eye className="size-3" aria-hidden />
                    {formatNumber(drug.views)}
                  </span>
                ) : null}
              </div>
            </SheetHeader>

            <Tabs
              value={sheetTab}
              onValueChange={(v) => setSheetTab(v as 'fiche' | 'rcp')}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="mx-5 mt-4 grid h-10 grid-cols-2">
                <TabsTrigger value="fiche" className="text-sm">
                  Fiche produit
                </TabsTrigger>
                <TabsTrigger value="rcp" className="gap-1.5 text-sm">
                  <BookOpen className="size-3.5" aria-hidden />
                  RCP
                  {drug.rcpSource === 'BOOK' && (
                    <span
                      className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary"
                      title="RCP issu des livres techniques DzPharm"
                    >
                      Livre
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="fiche" className="mt-0 flex-1">
            <div className="space-y-6 p-5">
              {/* Alertes statut */}
              {drug.status === 'RETRIE' && (
                <div className="rounded-lg border border-state-danger/40 bg-state-danger/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-danger">
                    <Ban className="size-4" aria-hidden />
                    Médicament retiré du marché
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-foreground/90">
                    {drug.withdrawDate ? (
                      <p>
                        <span className="text-muted-foreground">Date de retrait : </span>
                        {formatDate(drug.withdrawDate)}
                      </p>
                    ) : null}
                    {drug.withdrawReason ? (
                      <p>
                        <span className="text-muted-foreground">Motif : </span>
                        {drug.withdrawReason}
                      </p>
                    ) : null}
                    {!drug.withdrawDate && !drug.withdrawReason ? (
                      <p className="text-muted-foreground">
                        Ce produit figure sur la liste des retraits de la nomenclature.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
              {drug.status === 'NON_RENOUVELE' && (
                <div className="rounded-lg border border-state-warning/40 bg-state-warning/10 p-4" role="alert">
                  <p className="flex items-center gap-2 text-sm font-semibold text-state-warning">
                    <AlertTriangle className="size-4" aria-hidden />
                    Enregistrement non renouvelé
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/90">
                    L&apos;AMM de ce produit n&apos;a pas été renouvelée
                    {drug.regDateFinal ? ` (expiration : ${formatDate(drug.regDateFinal)})` : ''}.
                    Vérifiez son statut commercial avant toute dispensation.
                  </p>
                </div>
              )}

              {/* Métriques */}
              <section aria-label="Caractéristiques du médicament">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Caractéristiques
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <Metric label="N° AMM" value={drug.regNumber} icon={ShieldPlus} />
                  <Metric label="Forme" value={drug.form} icon={Pill} />
                  <Metric label="Dosage" value={drug.dosage} icon={FlaskConical} />
                  <Metric label="Conditionnement" value={drug.packaging} icon={Package} />
                  <Metric label="Laboratoire" value={drug.lab} icon={Building2} />
                  <Metric
                    label="Pays"
                    value={
                      drug.country ? (
                        <span className="flex items-center gap-1.5">
                          {countryCode(drug.country) ? (
                            <span
                              className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
                              aria-hidden
                            >
                              {countryCode(drug.country)}
                            </span>
                          ) : null}
                          {drug.country}
                        </span>
                      ) : null
                    }
                  />
                  <Metric label="Type" value={drug.type} icon={Type} />
                  <Metric label="Stabilité" value={drug.stability} icon={Timer} />
                  <Metric
                    label="Tarification P1/P2"
                    value={[drug.p1, drug.p2].filter(Boolean).join(' / ')}
                    icon={Syringe}
                  />
                  <Metric label="Enregistré le" value={formatDate(drug.regDateInitial)} icon={CalendarClock} />
                  <Metric label="Expire le" value={formatDate(drug.regDateFinal)} icon={CalendarX2} />
                </div>
                {drug.obs ? (
                  <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground/90">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <p>{drug.obs}</p>
                  </div>
                ) : null}
              </section>

              {/* Équivalents */}
              {equivalents.length > 0 && (
                <section aria-label="Équivalents même DCI">
                  <h3 className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <span>Équivalents même DCI</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
                      {formatNumber(equivalents.length)}
                    </span>
                  </h3>
                  <div className="scroll-thin max-h-72 overflow-y-auto rounded-lg border border-border/70">
                    <table className="w-full text-sm">
                      <tbody>
                        {equivalents.map((eq) => (
                          <tr
                            key={eq.id}
                            className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-accent"
                            onClick={() => openDrug(eq.id)}
                          >
                            <td className="px-3 py-2.5">
                              <span className="block font-semibold text-foreground">{eq.brand}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {eq.lab}
                                {eq.dosage ? ` · ${eq.dosage}` : ''}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <StatusBadge status={eq.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <Separator />

              <Button
                onClick={handleAddToBasket}
                className="h-11 w-full text-sm font-semibold"
                size="lg"
              >
                <ShieldPlus className="size-4" aria-hidden />
                Ajouter au contrôle d&apos;interactions
              </Button>
            </div>
              </TabsContent>
              <TabsContent value="rcp" className="mt-0 flex-1">
                <RcpViewer drugId={drug.id} brand={drug.brand} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
      {drug && sheetTab === 'fiche' ? (
        <PrintMonograph drug={drug} equivalents={equivalents.slice(0, 30)} />
      ) : null}
    </Sheet>
  )
}

/* ------------------------------------------------------------------ */
/* Fiche imprimable — monographie A4 (uniquement à l'impression)        */
/* ------------------------------------------------------------------ */

function PrintMonograph({
  drug,
  equivalents,
}: {
  drug: DrugDetail
  equivalents: Array<{ id: number; brand: string; lab: string; dosage: string | null; status: string }>
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="print-monograph fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible">
      <div className="mx-auto max-w-[190mm] px-6 py-8">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase">
              Référentiel Pharmaceutique Algérien — DzPharm
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{drug.brand}</h1>
            <p className="mt-0.5 text-sm font-semibold">{drug.dci}</p>
          </div>
          <div className="text-right text-[11px]">
            <p className="font-bold">Monographie</p>
            <p>Édité le {new Date().toLocaleDateString('fr-FR')}</p>
            <p>AMM : {drug.regNumber || '—'}</p>
          </div>
        </div>

        {/* Statut */}
        <p className="mt-3 text-[11px]">
          <strong>Statut :</strong> {drug.status === 'ACTIF' ? 'Actif (AMM en cours de validité)' : drug.status === 'RETRIE' ? 'RETIRÉ du marché' : 'Enregistrement non renouvelé'}
          {drug.liste ? (
            <>
              {' '}· <strong>Liste :</strong> {drug.liste}
            </>
          ) : null}
          {drug.domains?.length ? (
            <>
              {' '}· <strong>Domaine :</strong> {drug.domains.join(', ')}
            </>
          ) : null}
        </p>

        {/* Caractéristiques */}
        <h2 className="mt-5 border-b border-black/30 pb-1 text-[12px] font-bold tracking-widest uppercase">
          Caractéristiques du produit
        </h2>
        <table className="mt-2 w-full text-[11px]">
          <tbody>
            {[
              ['Forme', drug.form],
              ['Dosage', drug.dosage],
              ['Conditionnement', drug.packaging],
              ['Laboratoire titulaire', drug.lab],
              ['Pays', drug.country],
              ['Type d\'enregistrement', drug.type],
              ['Tarification P1 / P2', [drug.p1, drug.p2].filter(Boolean).join(' / ')],
              ['Date d\'enregistrement initial', formatDate(drug.regDateInitial)],
              ['Validité (date finale)', formatDate(drug.regDateFinal)],
              ['Stabilité', drug.stability],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <tr key={label} className="align-top">
                  <td className="w-56 py-1 pr-3 font-semibold">{label}</td>
                  <td className="py-1">{value}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {drug.obs ? (
          <p className="mt-3 text-[11px]">
            <strong>Observations : </strong>
            {drug.obs}
          </p>
        ) : null}

        {(drug.status === 'RETRIE' || drug.status === 'NON_RENOUVELE') && (
          <p className="mt-3 border-2 border-black p-2 text-[11px] font-bold">
            ⚠ {drug.status === 'RETRIE' ? 'PRODUIT RETIRÉ DU MARCHÉ' : 'ENREGISTREMENT NON RENOUVELÉ'}
            {drug.withdrawDate ? ` — retrait le ${formatDate(drug.withdrawDate)}` : ''}
            {drug.withdrawReason ? ` (${drug.withdrawReason})` : ''}
          </p>
        )}

        {/* Équivalents */}
        {equivalents.length > 0 ? (
          <>
            <h2 className="mt-5 border-b border-black/30 pb-1 text-[12px] font-bold tracking-widest uppercase">
              Équivalents — même DCI ({formatNumber(equivalents.length)}
              {equivalents.length === 30 ? '+' : ''})
            </h2>
            <table className="mt-2 w-full text-[10px]">
              <thead>
                <tr className="border-b border-black/40 text-left">
                  <th className="py-1 pr-2">Marque</th>
                  <th className="py-1 pr-2">Laboratoire</th>
                  <th className="py-1 pr-2">Dosage</th>
                  <th className="py-1">Statut</th>
                </tr>
              </thead>
              <tbody>
                {equivalents.map((eq) => (
                  <tr key={eq.id} className="border-b border-black/10">
                    <td className="py-1 pr-2 font-semibold">{eq.brand}</td>
                    <td className="py-1 pr-2">{eq.lab}</td>
                    <td className="py-1 pr-2">{eq.dosage || '—'}</td>
                    <td className="py-1">
                      {eq.status === 'ACTIF' ? 'Actif' : eq.status === 'RETRIE' ? 'Retiré' : 'Non renouvelé'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <p className="mt-6 border-t border-black/40 pt-2 text-[9px] text-black/70">
          Source : Nomenclature nationale des produits pharmaceutiques (Ministère de l&apos;Industrie
          Pharmaceutique, Algérie — Juin 2026). Document généré par DzPharm à titre informatif — ne
          remplace pas l&apos;AMM officielle ni les référentiels en vigueur.
        </p>
      </div>
    </div>,
    document.body
  )
}
