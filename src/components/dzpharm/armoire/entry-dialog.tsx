'use client'

/**
 * Armoire — dialogue d'ajout/édition d'une entrée (plan 3.4.1/3/4).
 *
 * Deux modes à la création :
 *  - « Répertoire » : recherche débouncée (300 ms, requête annulable via le
 *    signal TanStack Query) dans les 9 555 AMM du registre DzPharm →
 *    pré-remplissage marque/DCI/forme/dosage, badge de statut (texte +
 *    couleur, jamais la couleur seule), bannière si produit retiré/non
 *    renouvelé (soumission autorisée, remplacement à prévoir) ;
 *  - « Saisie manuelle » : OTC/parapharmacie hors répertoire.
 *
 * L'édition affiche l'en-tête « résolu » (répertoire lié ou manuel) puis
 * tous les champs directement. Aucun contrôle de doublon ici : le store le
 * fait à la soumission. Aucune donnée clinique n'est inventée — seules les
 * dates, quantités et catégories déclarées par l'utilisateur sont
 * enregistrées.
 *
 * Le formulaire vit DANS le DialogContent : Radix démonte le contenu à la
 * fermeture, donc chaque ouverture repart d'un état vierge pré-rempli depuis
 * `editing`/`presetMemberIds` (le parent les définit AVANT d'ouvrir).
 */

import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { fetchDrugs } from '../api'
import { StatusBadge, formatPrice } from '../status-badge'
import type { Drug } from '../types'
import type {
  ArmoireCategory,
  ArmoireEntry,
  ArmoireEntryInput,
  ArmoireKit,
  ArmoireMember,
} from './types'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  KIT_META,
  KIT_ORDER,
  MAX_NOTES_CHARS,
  memberColor,
} from './constants'
import { initials, normKey } from './utils'

export interface EntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: ArmoireMember[]
  editing: ArmoireEntry | null
  /** Membres présélectionnés à la création. */
  presetMemberIds?: string[]
  onSubmit: (input: ArmoireEntryInput) => void
}

/* ------------------------------------------------------------------ */
/* Recherche débouncée                                                 */
/* ------------------------------------------------------------------ */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type FormMode = 'repertoire' | 'manuel'

/* ------------------------------------------------------------------ */
/* Formulaire (remonté à chaque ouverture du dialogue)                 */
/* ------------------------------------------------------------------ */

interface EntryFormProps {
  members: ArmoireMember[]
  editing: ArmoireEntry | null
  presetMemberIds?: string[]
  onOpenChange: (open: boolean) => void
  onSubmit: (input: ArmoireEntryInput) => void
}

function EntryDialogForm({
  members,
  editing,
  presetMemberIds,
  onOpenChange,
  onSubmit,
}: EntryFormProps) {
  /* ---------- Médicament (identité) ---------- */
  const [mode, setMode] = useState<FormMode>('repertoire')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Drug | null>(null)
  const [brand, setBrand] = useState(() => editing?.brand ?? '')
  const [brandLocked, setBrandLocked] = useState(false)
  const [dci, setDci] = useState(() => editing?.dci ?? '')
  const [form, setForm] = useState(() => editing?.form ?? '')
  const [dosage, setDosage] = useState(() => editing?.dosage ?? '')
  /** Lien répertoire conservé (création : médicament sélectionné ; édition : entrée liée). */
  const [linkedDrugId, setLinkedDrugId] = useState<number | null>(() => editing?.drugId ?? null)
  const [registryStatus, setRegistryStatus] = useState<string>(() => editing?.status ?? 'MANUEL')

  /* ---------- Détails de l'entrée ---------- */
  const [category, setCategory] = useState<ArmoireCategory>(() => editing?.category ?? 'besoin')
  const [memberIds, setMemberIds] = useState<string[]>(
    () => editing?.memberIds ?? presetMemberIds ?? []
  )
  const [kits, setKits] = useState<ArmoireKit[]>(() => editing?.kits ?? [])
  const [qtyText, setQtyText] = useState(() => String(editing?.quantity ?? 1))
  const [expiry, setExpiry] = useState(() => editing?.expiry ?? '')
  const [openedAt, setOpenedAt] = useState(() => editing?.openedAt ?? '')
  const [purchasedAt, setPurchasedAt] = useState(() => editing?.purchasedAt ?? '')
  const [batch, setBatch] = useState(() => editing?.batch ?? '')
  const [prescription, setPrescription] = useState(() => editing?.prescription ?? '')
  const [daysLeft, setDaysLeft] = useState(() =>
    editing?.daysLeft != null ? String(editing.daysLeft) : ''
  )
  const [notes, setNotes] = useState(() => editing?.notes ?? '')
  const [error, setError] = useState('')

  /* ---------- Recherche répertoire (débounce 300 ms + annulation) ---------- */
  const debouncedQuery = useDebounce(query, 300)
  const trimmed = debouncedQuery.trim()
  const searchEnabled = editing == null && mode === 'repertoire' && trimmed.length >= 2

  const { data, isFetching } = useQuery({
    queryKey: ['armoire', 'entry-search', trimmed],
    queryFn: ({ signal }) =>
      fetchDrugs({ q: trimmed, pageSize: 8, sort: 'relevance' }, signal),
    enabled: searchEnabled,
    placeholderData: keepPreviousData,
  })
  const results = data?.drugs ?? []

  /* ---------- Sélection / déverrouillage ---------- */
  function selectDrug(drug: Drug) {
    setSelected(drug)
    setBrand(drug.brand)
    setBrandLocked(true)
    setDci(drug.dci)
    setForm(drug.form)
    setDosage(drug.dosage)
    setLinkedDrugId(drug.id)
    setRegistryStatus(drug.status)
    setError('')
  }

  /** Crayon : passe en saisie manuelle (le lien répertoire est retiré). */
  function unlockBrand() {
    setSelected(null)
    setBrandLocked(false)
    setLinkedDrugId(null)
    setRegistryStatus('MANUEL')
    setMode('manuel')
  }

  function switchMode(next: string) {
    const m = next as FormMode
    setMode(m)
    if (m === 'manuel' && editing == null && selected) {
      // Bascule explicite vers la saisie manuelle → on conserve les textes
      // pré-remplis mais on détache le médicament du répertoire.
      setSelected(null)
      setBrandLocked(false)
      setLinkedDrugId(null)
      setRegistryStatus('MANUEL')
    }
  }

  /* ---------- Champs ---------- */
  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  function toggleKit(k: ArmoireKit) {
    setKits((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }

  function stepQuantity(delta: number) {
    const current = Number.parseInt(qtyText, 10)
    const base = Number.isFinite(current) ? current : 1
    setQtyText(String(Math.max(1, base + delta)))
  }

  /* ---------- Soumission ---------- */
  function computeDciKey(): string {
    const t = dci.trim()
    if (selected?.dciKey) return selected.dciKey
    if (editing && t === editing.dci && editing.dciKey) return editing.dciKey
    return t ? normKey(t) : ''
  }

  function submit() {
    setError('')
    const brandTrim = brand.trim()
    if (!brandTrim) {
      setError('Le nom (marque) est requis — recherchez dans le répertoire ou saisissez-le.')
      return
    }
    const qty = Number.parseInt(qtyText, 10)
    if (!Number.isFinite(qty) || qty < 1) {
      setError('Quantité invalide — indiquez au moins 1 (boîte/unité).')
      return
    }
    let daysLeftValue: number | null = null
    if (category === 'chronique' && daysLeft.trim() !== '') {
      const n = Number(daysLeft)
      if (!Number.isFinite(n) || n < 0 || n > 365) {
        setError('Jours de traitement restants : nombre entier entre 0 et 365.')
        return
      }
      daysLeftValue = Math.floor(n)
    }

    onSubmit({
      drugId: linkedDrugId,
      brand: brandTrim,
      dci: dci.trim(),
      dciKey: computeDciKey(),
      status: registryStatus,
      form: form.trim(),
      dosage: dosage.trim(),
      category,
      quantity: qty,
      expiry,
      openedAt,
      purchasedAt,
      kits,
      memberIds,
      batch: batch.trim(),
      prescription: prescription.trim(),
      daysLeft: category === 'chronique' ? daysLeftValue : null,
      notes: notes.trim().slice(0, MAX_NOTES_CHARS),
    })
  }

  /* ---------- Rendu ---------- */
  const showFields = editing != null || mode === 'manuel' || selected != null
  const statusWord =
    registryStatus === 'RETRIE'
      ? 'retiré du marché'
      : registryStatus === 'NON_RENOUVELE'
        ? 'non renouvelé'
        : ''

  return (
    <>
      {/* Édition : en-tête « résolu » du médicament */}
      {editing ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={editing.status} />
            {editing.drugId != null ? (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary"
              >
                <BookOpen className="size-3" aria-hidden />
                Répertoire (AMM liée)
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-border bg-muted/60 text-muted-foreground"
              >
                Saisie manuelle
              </Badge>
            )}
          </div>
          <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
            {editing.brand}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {[editing.dci, editing.form, editing.dosage].filter(Boolean).join(' · ') ||
              'Détails non renseignés'}
          </p>
        </div>
      ) : (
        <Tabs value={mode} onValueChange={switchMode}>
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="repertoire" className="gap-1.5">
              <Search className="size-3.5" aria-hidden />
              Répertoire
            </TabsTrigger>
            <TabsTrigger value="manuel" className="gap-1.5">
              <Pencil className="size-3.5" aria-hidden />
              Saisie manuelle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repertoire" className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 focus-within:border-primary/60">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, DCI ou laboratoire (min. 2 caractères)…"
                aria-label="Rechercher un médicament dans le répertoire"
                autoComplete="off"
                spellCheck={false}
                className="h-11 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              {isFetching ? (
                <Loader2
                  className="size-4 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </div>

            {trimmed.length < 2 ? (
              <p className="px-1 text-xs text-muted-foreground">
                Tapez au moins 2 caractères — marque, DCI ou laboratoire.
              </p>
            ) : null}

            {searchEnabled && isFetching && results.length === 0 ? (
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : null}

            {searchEnabled && !isFetching && results.length === 0 ? (
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                Aucun résultat dans le répertoire (9 555 AMM) — utilisez la saisie manuelle
                pour OTC/parapharmacie.
              </p>
            ) : null}

            {results.length > 0 ? (
              <div
                role="listbox"
                aria-label="Suggestions du répertoire"
                className="scroll-thin max-h-64 space-y-1 overflow-y-auto"
              >
                {results.map((drug) => (
                  <button
                    key={drug.id}
                    type="button"
                    role="option"
                    aria-selected={selected?.id === drug.id}
                    onClick={() => selectDrug(drug)}
                    className={cn(
                      'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      selected?.id === drug.id
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-card hover:bg-accent'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {drug.brand}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {drug.dci}
                        {drug.form ? ` · ${drug.form}` : ''}
                        {drug.dosage ? ` · ${drug.dosage}` : ''}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground/80">
                        {drug.lab}
                        {drug.price != null ? ` · PPA ${formatPrice(drug.price)}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={drug.status} className="shrink-0" />
                  </button>
                ))}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      )}

      {/* Bannière contextuelle : statut registre non actif (soumission autorisée) */}
      {statusWord ? (
        <Alert
          className="border-state-warning/40 bg-state-warning/10 text-state-warning"
          role="status"
        >
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Produit {statusWord}</AlertTitle>
          <AlertDescription className="text-state-warning/90">
            Il peut rester conservé mais un remplacement est à prévoir — voir Analyse et
            fiche prix.
          </AlertDescription>
        </Alert>
      ) : null}

      {showFields ? (
        <div className="space-y-4">
          {/* Médicament sélectionné (création via répertoire) */}
          {selected ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {selected.brand}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[selected.dci, selected.form, selected.dosage]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 border-primary/30 bg-primary/10 text-primary"
                >
                  <BookOpen className="size-3" aria-hidden />
                  Répertoire
                </Badge>
              </div>
            </div>
          ) : null}

          {/* Identité du médicament */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="entry-brand">
                  Nom / marque <span className="text-state-danger">*</span>
                </Label>
                {brandLocked ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-primary/30 bg-primary/10 text-primary"
                  >
                    <BookOpen className="size-3" aria-hidden />
                    Répertoire
                  </Badge>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Input
                  id="entry-brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  disabled={brandLocked}
                  aria-required="true"
                  placeholder="Ex. : DOLIPRANE, sirop vitamine C…"
                  className="h-11"
                />
                {brandLocked ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Modifier le nom manuellement (saisie manuelle)"
                    title="Passer en saisie manuelle"
                    onClick={unlockBrand}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
              {brandLocked ? (
                <p className="text-[11px] text-muted-foreground">
                  Prérempli depuis le répertoire DzPharm — le crayon passe en saisie
                  manuelle (le lien AMM est retiré).
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entry-dci">DCI (optionnel)</Label>
              <Input
                id="entry-dci"
                value={dci}
                onChange={(e) => setDci(e.target.value)}
                placeholder="Ex. : PARACETAMOL"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry-form">Forme (optionnel)</Label>
                <Input
                  id="entry-form"
                  value={form}
                  onChange={(e) => setForm(e.target.value)}
                  placeholder="Ex. : COMPRIME"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-dosage">Dosage (optionnel)</Label>
                <Input
                  id="entry-dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="Ex. : 500 MG"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Détails de l'entrée */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Détails de l&apos;entrée
            </p>

            {/* Catégorie */}
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <div
                role="radiogroup"
                aria-label="Catégorie de l’entrée"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {CATEGORY_ORDER.map((c) => {
                  const meta = CATEGORY_META[c]
                  const Icon = meta.icon
                  const active = category === c
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'flex min-h-11 flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/50'
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Icon
                          className={cn(
                            'size-3.5',
                            active ? 'text-primary' : 'text-muted-foreground'
                          )}
                          aria-hidden
                        />
                        {meta.label}
                      </span>
                      <span className="text-[10px] leading-snug text-muted-foreground">
                        {meta.hint}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Membres concernés */}
            <div className="space-y-2">
              <Label>Membres concernés</Label>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun membre dans le foyer — ajoutez d&apos;abord un membre (bouton
                  « Ajouter un membre ») pour assigner ce médicament.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const active = memberIds.includes(m.id)
                    const c = memberColor(m.color)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-primary/50 bg-primary/10 text-foreground'
                            : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white',
                            c.dot
                          )}
                          aria-hidden
                        >
                          {initials(m.name)}
                        </span>
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              )}
              {memberIds.length >= 2 ? (
                <p className="flex items-center gap-1 text-[11px] text-primary">
                  <Users className="size-3" aria-hidden />
                  Médicament partagé
                </p>
              ) : null}
            </div>

            {/* Kits de rangement */}
            <div className="space-y-2">
              <Label>Kits de rangement (optionnel)</Label>
              <div className="flex flex-wrap gap-1.5">
                {KIT_ORDER.map((k) => {
                  const meta = KIT_META[k]
                  const Icon = meta.icon
                  const active = kits.includes(k)
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleKit(k)}
                      className={cn(
                        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-3.5',
                          active ? 'text-primary' : 'text-muted-foreground'
                        )}
                        aria-hidden
                      />
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quantité + dates */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="entry-quantity">Quantité restante</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Diminuer la quantité"
                    onClick={() => stepQuantity(-1)}
                  >
                    <Minus className="size-4" aria-hidden />
                  </Button>
                  <Input
                    id="entry-quantity"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={qtyText}
                    onChange={(e) => setQtyText(e.target.value)}
                    aria-label="Quantité restante (boîtes ou unités)"
                    className="h-11 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Augmenter la quantité"
                    onClick={() => stepQuantity(1)}
                  >
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Boîtes ou unités.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-expiry">Date d&apos;expiration</Label>
                <Input
                  id="entry-expiry"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sur la boîte — pour les alertes de péremption.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry-opened">Date d&apos;ouverture</Label>
                <Input
                  id="entry-opened"
                  type="date"
                  value={openedAt}
                  onChange={(e) => setOpenedAt(e.target.value)}
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  Sirops/suspensions : respectez la durée après ouverture de la notice.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="entry-purchased">Date d&apos;achat (optionnel)</Label>
                <Input
                  id="entry-purchased"
                  type="date"
                  value={purchasedAt}
                  onChange={(e) => setPurchasedAt(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-batch">N° de lot (optionnel)</Label>
                <Input
                  id="entry-batch"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  maxLength={30}
                  placeholder="Ex. : 2409A"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-prescription">Réf. ordonnance (optionnel)</Label>
                <Input
                  id="entry-prescription"
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  maxLength={40}
                  className="h-11"
                />
              </div>
            </div>

            {/* Jours restants — uniquement pour les traitements chroniques */}
            {category === 'chronique' ? (
              <div className="space-y-2 sm:max-w-xs">
                <Label htmlFor="entry-days">Jours de traitement restants</Label>
                <Input
                  id="entry-days"
                  type="number"
                  min={0}
                  max={365}
                  step={1}
                  inputMode="numeric"
                  value={daysLeft}
                  onChange={(e) => setDaysLeft(e.target.value)}
                  placeholder="Ex. : 10"
                  className="h-11"
                />
                <p className="text-[11px] text-muted-foreground">
                  Estimation pour l&apos;alerte de renouvellement (stock faible).
                </p>
              </div>
            ) : null}

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="entry-notes">Notes (optionnel)</Label>
                <p
                  aria-live="polite"
                  className="text-[11px] tabular-nums text-muted-foreground"
                >
                  {notes.length}/{MAX_NOTES_CHARS}
                </p>
              </div>
              <Textarea
                id="entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_CHARS))}
                maxLength={MAX_NOTES_CHARS}
                rows={3}
                placeholder="Ex. : « conserver au frais », « prendre au repas »…"
                aria-label="Notes libres (200 caractères maximum)"
              />
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-state-danger">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={!brand.trim() && !showFields}>
          {editing ? 'Enregistrer les modifications' : 'Ajouter à l’armoire'}
        </Button>
      </DialogFooter>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Dialogue (contenu démonté à la fermeture → état vierge à l'ouverture)*/
/* ------------------------------------------------------------------ */

export function EntryDialog({
  open,
  onOpenChange,
  members,
  editing,
  presetMemberIds,
  onSubmit,
}: EntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-thin max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Modifier ${editing.brand}` : 'Ajouter un médicament'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Corrigez la quantité, les dates, l’assignation ou la catégorie — le lien au répertoire est conservé.'
              : 'Recherchez le médicament dans le répertoire DzPharm (9 555 AMM) ou saisissez-le manuellement pour les produits hors répertoire (OTC, parapharmacie).'}
          </DialogDescription>
        </DialogHeader>
        <EntryDialogForm
          members={members}
          editing={editing}
          presetMemberIds={presetMemberIds}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
