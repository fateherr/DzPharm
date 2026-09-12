'use client'

/**
 * Armoire à Pharmacie Familiale — vue principale (v2, plan complet).
 *
 * Architecture conforme au plan « New Feature — Armoire à Pharmacie
 * Familiale » : membres du foyer (drapeaux cliniques → outils dédiés),
 * entrées assignables à plusieurs membres, catégories, kits de rangement,
 * analyse du foyer entier, urgence, réglages de confidentialité.
 *
 * Toutes les données restent locales (store persisté + localStorage) ;
 * aucune donnée nominative ne quitte l'appareil.
 */

import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Boxes,
  HeartPulse,
  Lock,
  Plus,
  Printer,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useDzPharm } from '../store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type {
  ArmoireEntry,
  ArmoireEntryInput,
  ArmoireMember,
  ArmoireMemberInput,
  ArmoireTab,
  ExpiryReminders,
} from './types'
import {
  CONSENT_KEY,
  FIRST_AID_KEY,
  PIN_KEY,
  MAX_ENTRIES,
  MAX_MEMBERS,
} from './constants'
import { computeCabinetAlerts, alertsByEntry, readReminders, writeReminders } from './utils'
import { MemberDialog } from './member-dialog'
import { EntryDialog } from './entry-dialog'
import { EntryCard } from './entry-card'
import { OverviewTab } from './overview-tab'
import { InventoryTab } from './inventory-tab'
import { AnalysisTab } from './analysis-tab'
import { EmergencyTab } from './emergency-tab'
import { SettingsTab } from './settings-tab'
import { PrintSummary } from './print-summary'

/* ------------------------------------------------------------------ */
/* Écran de verrou PIN (plan 3.6 — verrou dédié à l'armoire)           */
/* ------------------------------------------------------------------ */

function PinLockScreen({
  onUnlock: onUnlock,
  onRequestWipe: onRequestWipe,
}: {
  onUnlock: () => void
  onRequestWipe: () => void
}) {
  const [pin, setPin] = useState('')
  const [tries, setTries] = useState(0)

  function tryUnlock() {
    const stored = localStorage.getItem(PIN_KEY)
    if (pin && stored && pin === stored) {
      setPin('')
      setTries(0)
      onUnlock()
    } else {
      const next = tries + 1
      setTries(next)
      setPin('')
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 pt-16">
      <Card className="w-full">
        <CardHeader className="pb-3 text-center">
          <span
            className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-state-danger/10"
            aria-hidden
          >
            <Lock className="size-6 text-state-danger" />
          </span>
          <CardTitle className="mt-2 text-lg">Armoire verrouillée</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Saisissez le code PIN de l’armoire.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') tryUnlock()
            }}
            placeholder="••••"
            autoFocus
            aria-label="Code PIN de l’armoire"
            className="text-center text-lg tracking-[0.5em]"
          />
          {tries > 0 ? (
            <p role="alert" className="text-center text-xs text-state-danger">
              Code incorrect ({tries}/3)
            </p>
          ) : null}
          <Button onClick={tryUnlock} className="w-full" disabled={pin.length < 4}>
            Déverrouiller
          </Button>
          {tries >= 3 ? (
            <Button variant="ghost" className="w-full text-xs" onClick={onRequestWipe}>
              Code oublié ? Réinitialiser l’armoire (efface tout)
            </Button>
          ) : (
            <p className="text-center text-[11px] text-muted-foreground">
              Verrou de confort local — ne remplace pas une sécurité forte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Écran de consentement premier usage (plan 3.6)                      */
/* ------------------------------------------------------------------ */

function ConsentDialog({ onAccept }: { onAccept: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => (o ? null : onAccept())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Avant d’utiliser votre armoire familiale
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-sm leading-relaxed text-muted-foreground">
              <p>
                L’armoire enregistre <strong className="text-foreground">qui prend quel
                médicament</strong> dans votre foyer — ce sont des données de santé sensibles.
              </p>
              <ul className="space-y-1.5">
                <li>
                  <strong className="text-foreground">Stockage 100 % local :</strong> tout reste
                  sur cet appareil (navigateur). Rien n’est envoyé sur Internet.
                </li>
                <li>
                  <strong className="text-foreground">Aucune donnée nominative en ligne :</strong>{' '}
                  lors d’une analyse, seuls les noms de médicaments sont transmis aux moteurs
                  (interactions, grossesse) — jamais les noms de personnes.
                </li>
                <li>
                  <strong className="text-foreground">Zéro publicité, zéro profilage :</strong>{' '}
                  aucune donnée de santé n’est utilisée à des fins d’analyse ou de publicité.
                </li>
                <li>
                  <strong className="text-foreground">Vos droits :</strong> export et effacement
                  complet disponibles dans Réglages à tout moment.
                </li>
              </ul>
              <p className="text-xs">
                Cadre : loi algérienne 18-07 (modifiée 25-11) — les données de santé sont des
                données sensibles. Une révision juridique reste recommandée avant tout usage
                professionnel.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onAccept}>J’ai compris et j’accepte</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Vue principale                                                      */
/* ------------------------------------------------------------------ */

export function ArmoireView() {
  const members = useDzPharm((s) => s.armoireMembers)
  const entries = useDzPharm((s) => s.armoireEntries)
  const journal = useDzPharm((s) => s.armoireJournal)
  const addMember = useDzPharm((s) => s.addArmoireMember)
  const updateMember = useDzPharm((s) => s.updateArmoireMember)
  const deleteMember = useDzPharm((s) => s.deleteArmoireMember)
  const addEntry = useDzPharm((s) => s.addArmoireEntry)
  const updateEntry = useDzPharm((s) => s.updateArmoireEntry)
  const removeEntry = useDzPharm((s) => s.removeArmoireEntry)
  const addJournalEntry = useDzPharm((s) => s.addArmoireJournalEntry)
  const wipeData = useDzPharm((s) => s.wipeArmoireData)
  const openDrug = useDzPharm((s) => s.openDrug)
  const setView = useDzPharm((s) => s.setView)

  const [tab, setTab] = useState<ArmoireTab>('apercu')

  /* ------------- Confidentialité (plan 3.6) ------------------------ */
  /*
   * Hydratation locale par initialiseurs paresseux (conforme à la règle
   * react-hooks/set-state-in-effect) : ArmoireView n'est jamais rendue en
   * SSR (la vue démarre toujours sur 'accueil'), donc la lecture directe
   * de localStorage à l'initialisation est sûre — et le verrou PIN
   * s'applique dès le premier rendu client, sans flash de contenu.
   */
  const [initial] = useState(readArmoireLocalState)
  const [gate, setGate] = useState<'locked' | 'open'>(() => (initial.pinEnabled ? 'locked' : 'open'))
  const [consentOpen, setConsentOpen] = useState(() => !initial.consentAt)
  const [consentAt, setConsentAt] = useState<string | null>(initial.consentAt)
  const [pinEnabled, setPinEnabled] = useState(initial.pinEnabled)
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false)
  const [reminders, setReminders] = useState<ExpiryReminders>(initial.reminders)

  /* ------------- Alertes (seuils configurables) -------------------- */
  const alerts = useMemo(() => computeCabinetAlerts(entries, reminders), [entries, reminders])
  const perEntryAlerts = useMemo(() => alertsByEntry(entries, reminders), [entries, reminders])

  /* ------------- Dialogues ----------------------------------------- */
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<ArmoireMember | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ArmoireEntry | null>(null)
  const [presetMemberIds, setPresetMemberIds] = useState<string[]>([])
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<ArmoireMember | null>(null)

  const handleAddMember = useCallback(() => {
    setEditingMember(null)
    setMemberDialogOpen(true)
  }, [])

  const handleEditMember = useCallback((m: ArmoireMember) => {
    setEditingMember(m)
    setMemberDialogOpen(true)
  }, [])

  const handleDeleteMember = useCallback((m: ArmoireMember) => {
    setDeleteMemberTarget(m)
  }, [])

  const confirmDeleteMember = useCallback(() => {
    if (!deleteMemberTarget) return
    deleteMember(deleteMemberTarget.id)
    toast({
      title: 'Membre supprimé',
      description: `Les entrées de ${deleteMemberTarget.name} restent dans l’inventaire (non assignées).`,
    })
    setDeleteMemberTarget(null)
  }, [deleteMemberTarget, deleteMember])

  const submitMember = useCallback(
    (input: ArmoireMemberInput) => {
      if (editingMember) {
        updateMember(editingMember.id, input)
        toast({ title: 'Membre mis à jour', description: input.name })
      } else {
        const created = addMember(input)
        if (!created) {
          toast({
            title: 'Limite atteinte',
            description: `Maximum ${MAX_MEMBERS} membres par foyer.`,
            variant: 'destructive',
          })
          return
        }
        toast({ title: 'Membre ajouté', description: `${input.name} rejoint le foyer.` })
      }
      setMemberDialogOpen(false)
      setEditingMember(null)
    },
    [editingMember, addMember, updateMember]
  )

  const handleAddEntry = useCallback((presetMemberId?: string) => {
    setEditingEntry(null)
    setPresetMemberIds(presetMemberId ? [presetMemberId] : [])
    setEntryDialogOpen(true)
  }, [])

  const handleEditEntry = useCallback((e: ArmoireEntry) => {
    setEditingEntry(e)
    setPresetMemberIds([])
    setEntryDialogOpen(true)
  }, [])

  const submitEntry = useCallback(
    (input: ArmoireEntryInput) => {
      if (editingEntry) {
        updateEntry(editingEntry.uid, input)
        toast({ title: 'Entrée mise à jour', description: input.brand })
      } else {
        const result = addEntry(input)
        if (result === 'added') {
          toast({
            title: 'Ajouté à l’armoire',
            description: `${input.brand} — pensez à relancer l’analyse du foyer.`,
          })
          setTab('analyse')
        } else if (result === 'duplicate') {
          toast({
            title: 'Déjà présent',
            description: `${input.brand} figure déjà pour ce(s) membre(s) — même médicament, même assignation.`,
            variant: 'destructive',
          })
          return
        } else {
          toast({
            title: 'Armoire pleine',
            description: `Maximum ${MAX_ENTRIES} entrées.`,
            variant: 'destructive',
          })
          return
        }
      }
      setEntryDialogOpen(false)
      setEditingEntry(null)
    },
    [editingEntry, addEntry, updateEntry]
  )

  const handleRemoveEntry = useCallback(
    (uid: string) => {
      const entry = entries.find((e) => e.uid === uid)
      removeEntry(uid)
      if (entry) toast({ title: 'Entrée retirée', description: entry.brand })
    },
    [entries, removeEntry]
  )

  /** Plan 2.6 — PAO : marque un flacon/sachet comme ouvert aujourd'hui. */
  const handleMarkOpened = useCallback(
    (uid: string) => {
      const today = new Date().toISOString().slice(0, 10)
      updateEntry(uid, { openedAt: today })
      const entry = entries.find((e) => e.uid === uid)
      toast({
        title: 'Flacon marqué comme ouvert',
        description: `${entry?.brand ?? 'Médicament'} — ouvert le ${today}. La durée après ouverture (PAO) est maintenant suivie.`,
      })
    },
    [entries, updateEntry]
  )

  const handleOpenSheet = useCallback(
    (drugId: number) => {
      openDrug(drugId)
    },
    [openDrug]
  )

  /** Plan 3.4.14 — lien réassort vers la fiche (prix PPA + équivalents). */
  const handleRestock = useCallback(
    (entry: ArmoireEntry) => {
      if (entry.drugId != null) {
        setView('catalogue')
        openDrug(entry.drugId)
        toast({
          title: 'Fiche prix ouverte',
          description: `${entry.brand} — prix public et équivalents génériques.`,
        })
      } else {
        setView('catalogue')
        toast({
          title: 'Catalogue ouvert',
          description: 'Produit hors répertoire — recherchez-le dans le catalogue.',
        })
      }
    },
    [setView, openDrug]
  )

  const handleRemindersChange = useCallback((r: ExpiryReminders) => {
    writeReminders(r)
    setReminders(r)
  }, [])

  /* ------------- Confidentialité : actions -------------------------- */

  const acceptConsent = useCallback(() => {
    const iso = new Date().toISOString()
    try {
      localStorage.setItem(CONSENT_KEY, iso)
    } catch {
      /* stockage indisponible — le consentement sera redemandé */
    }
    setConsentAt(iso)
    setConsentOpen(false)
  }, [])

  const enablePin = useCallback((pin: string) => {
    try {
      localStorage.setItem(PIN_KEY, pin)
    } catch {
      /* ignore */
    }
    setPinEnabled(true)
    toast({
      title: 'Code PIN activé',
      description: 'Il sera demandé à chaque ouverture de l’armoire sur cet appareil.',
    })
  }, [])

  const disablePin = useCallback(() => {
    try {
      localStorage.removeItem(PIN_KEY)
    } catch {
      /* ignore */
    }
    setPinEnabled(false)
    toast({ title: 'Code PIN désactivé', description: 'L’armoire s’ouvre désormais sans code.' })
  }, [])

  /** Export JSON complet (droit d'accès) — inclut membres, entrées, journal. */
  const exportArmoireData = useCallback(() => {
    try {
      const payload = {
        format: 'dzpharm-armoire-export-v2',
        app: 'DzPharm',
        exportedAt: new Date().toISOString(),
        membres: members,
        entrees: entries,
        journal,
        trousseSecours: readFirstAid(),
        confidentialite: {
          consentementAccepteLe: consentAt,
          pinActif: pinEnabled,
          rappels: reminders,
          note: 'Le code PIN n’est volontairelement pas inclus dans l’export.',
        },
        note: 'Données enregistrées uniquement sur cet appareil (localStorage) — aucun envoi en ligne.',
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dzpharm-armoire-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({
        title: 'Export JSON généré',
        description: 'Toutes les données locales de l’armoire ont été téléchargées.',
      })
    } catch {
      toast({
        title: 'Échec de l’export',
        description: 'Une erreur est survenue lors de la génération du fichier JSON.',
        variant: 'destructive',
      })
    }
  }, [members, entries, journal, consentAt, pinEnabled, reminders])

  /** Effacement définitif (droit d'effacement). */
  const wipeArmoire = useCallback(() => {
    setWipeConfirmOpen(false)
    try {
      wipeData()
      localStorage.removeItem(PIN_KEY)
      localStorage.removeItem(FIRST_AID_KEY)
      localStorage.removeItem(CONSENT_KEY)
    } catch {
      /* ignore */
    }
    window.location.reload()
  }, [wipeData])

  /* --------------------------- Rendu -------------------------------- */

  if (gate === 'locked') {
    return (
      <div className="pb-10">
        <PinLockScreen
          onUnlock={() => setGate('open')}
          onRequestWipe={() => setWipeConfirmOpen(true)}
        />
        <ConfirmWipeDialog open={wipeConfirmOpen} onOpenChange={setWipeConfirmOpen} onConfirm={wipeArmoire} />
      </div>
    )
  }

  const expiringCount = alerts.filter((a) => a.kind === 'expired' || a.kind === 'expiring7').length

  return (
    <div className="pb-10">
      {consentOpen ? <ConsentDialog onAccept={acceptConsent} /> : null}

      {/* En-tête */}
      <section aria-labelledby="armoire-title" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              id="armoire-title"
              className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              <span
                className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/20"
                aria-hidden
              >
                <Users className="size-5.5 text-primary-foreground" />
              </span>
              Armoire familiale
              <span className="hidden text-base font-normal text-muted-foreground sm:inline">
                خزانة الأدوية العائلية
              </span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Inventaire privé des médicaments du foyer — membres, catégories, rangement,
              péremptions, analyse d’interactions du foyer entier et fiche d’urgence.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={entries.length === 0}
              className="gap-1.5"
            >
              <Printer className="size-3.5" aria-hidden />
              Exporter (PDF)
            </Button>
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/25 bg-primary/5 text-primary"
            >
              <Lock className="size-3" aria-hidden />
              Données locales uniquement
            </Badge>
          </div>
        </div>
      </section>

      {/* Actions rapides + état */}
      <section
        aria-label="Actions rapides"
        className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 print:hidden"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => handleAddEntry()} className="gap-1.5">
            <Plus className="size-3.5" aria-hidden />
            Ajouter un médicament
          </Button>
          <Button size="sm" variant="outline" onClick={handleAddMember} className="gap-1.5">
            <UserPlus className="size-3.5" aria-hidden />
            Ajouter un membre
          </Button>
          {members.length === 0 ? null : (
            <Badge variant="outline" className="gap-1.5 border-border bg-muted/50">
              <Users className="size-3" aria-hidden />
              {members.length} membre{members.length > 1 ? 's' : ''}
            </Badge>
          )}
          {entries.length === 0 ? null : (
            <Badge variant="outline" className="gap-1.5 border-border bg-muted/50">
              <Boxes className="size-3" aria-hidden />
              {entries.length} médicament{entries.length > 1 ? 's' : ''}
            </Badge>
          )}
          {expiringCount > 0 ? (
            <Badge variant="outline" className="gap-1.5 border-state-danger/30 bg-state-danger/10 text-state-danger">
              <AlertTriangle className="size-3" aria-hidden />
              {expiringCount} péremption{expiringCount > 1 ? 's' : ''} urgente{expiringCount > 1 ? 's' : ''}
            </Badge>
          ) : null}
          {alerts.some((a) => a.kind === 'controle') ? (
            <Badge variant="outline" className="gap-1.5 border-state-danger/30 bg-state-danger/10 text-state-danger">
              <ScanLine className="size-3" aria-hidden />
              Liste contrôlée
            </Badge>
          ) : null}
          {members.some((m) => m.pregnant) ? (
            <Badge variant="outline" className="gap-1.5 border-state-danger/30 bg-state-danger/10 text-state-danger">
              <HeartPulse className="size-3" aria-hidden />
              Grossesse suivie
            </Badge>
          ) : null}
        </div>
      </section>

      {/* Onglets */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ArmoireTab)}
        className="mx-auto mt-6 max-w-7xl px-4 sm:px-6"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="apercu" className="gap-1.5">
            Vue d’ensemble
          </TabsTrigger>
          <TabsTrigger value="inventaire" className="gap-1.5">
            Inventaire
            {entries.length > 0 ? (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {entries.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="analyse" className="gap-1.5">
            Analyse
            {alerts.length > 0 ? (
              <span className="rounded-full bg-state-danger/15 px-1.5 text-[10px] text-state-danger tabular-nums">
                {alerts.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="urgence" className="gap-1.5">
            Urgence
          </TabsTrigger>
          <TabsTrigger value="reglages" className="gap-1.5">
            Réglages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <OverviewTab
              members={members}
              entries={entries}
              alerts={alerts}
              journal={journal}
              hasPin={pinEnabled}
              onAddEntry={() => handleAddEntry()}
              onAddMember={handleAddMember}
              onGoTab={setTab}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="inventaire" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <InventoryTab
              members={members}
              entries={entries}
              onAddEntry={handleAddEntry}
              onEdit={handleEditEntry}
              onRemove={handleRemoveEntry}
              onOpenSheet={handleOpenSheet}
              onRestock={handleRestock}
              onManageMembers={handleAddMember}
              onMarkOpened={handleMarkOpened}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="analyse" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <AnalysisTab
              members={members}
              entries={entries}
              onJournal={addJournalEntry}
              onOpenSheet={handleOpenSheet}
            />
          </motion.div>
        </TabsContent>

        <TabsContent value="urgence" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <EmergencyTab members={members} entries={entries} />
          </motion.div>
        </TabsContent>

        <TabsContent value="reglages" className="mt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <SettingsTab
              consentAt={consentAt}
              pinEnabled={pinEnabled}
              onEnablePin={enablePin}
              onDisablePin={disablePin}
              onExport={exportArmoireData}
              onWipe={() => setWipeConfirmOpen(true)}
              members={members}
              entries={entries}
              journal={journal}
              onAddMember={handleAddMember}
              onEditMember={handleEditMember}
              onDeleteMember={handleDeleteMember}
              onRemindersChange={handleRemindersChange}
            />
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Dialogues */}
      <MemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        editing={editingMember}
        onSubmit={submitMember}
        onDelete={handleDeleteMember}
      />
      <EntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        members={members}
        editing={editingEntry}
        presetMemberIds={presetMemberIds}
        onSubmit={submitEntry}
      />

      {/* Confirmation suppression membre */}
      <Dialog
        open={deleteMemberTarget != null}
        onOpenChange={(o) => (o ? null : setDeleteMemberTarget(null))}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {deleteMemberTarget?.name} ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Les médicaments restent dans l’inventaire mais ne seront plus assignés à ce membre.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteMemberTarget(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDeleteMember}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmWipeDialog
        open={wipeConfirmOpen}
        onOpenChange={setWipeConfirmOpen}
        onConfirm={wipeArmoire}
      />

      {/* Résumé imprimable (plan 3.4.15) */}
      <PrintSummary members={members} entries={entries} journal={journal} alerts={alerts} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Confirmation d'effacement complet                                   */
/* ------------------------------------------------------------------ */

function ConfirmWipeDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-state-danger" aria-hidden />
            Tout effacer ?
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Membres, médicaments, journal, trousse de secours et code PIN seront définitivement
          supprimés de cet appareil. Les favoris et le panier Chifa des autres vues sont conservés.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Effacer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers locaux                                                      */
/* ------------------------------------------------------------------ */

/**
 * Lecture unique des réglages locaux au premier montage client
 * (consentement, PIN, rappels d'expiration). Garde SSR.
 */
function readArmoireLocalState(): {
  consentAt: string | null
  pinEnabled: boolean
  reminders: ExpiryReminders
} {
  if (typeof window === 'undefined') {
    return { consentAt: null, pinEnabled: false, reminders: { d7: true, d30: true, d90: false } }
  }
  try {
    return {
      consentAt: window.localStorage.getItem(CONSENT_KEY),
      pinEnabled: window.localStorage.getItem(PIN_KEY) !== null,
      reminders: readReminders(),
    }
  } catch {
    return { consentAt: null, pinEnabled: false, reminders: { d7: true, d30: true, d90: false } }
  }
}

function readFirstAid(): string[] {
  try {
    const raw = localStorage.getItem(FIRST_AID_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return []
}
