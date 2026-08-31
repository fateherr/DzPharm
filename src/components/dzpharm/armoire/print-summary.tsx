'use client'

/**
 * Armoire — Résumé A4 imprimable (plan 3.4.15).
 *
 * Rendu UNIQUEMENT à l'impression : portal vers <body> avec la classe
 * `.print-counter` (whitelist CSS globale d'impression — même mécanisme que
 * la bibliothèque), tout le reste de l'application étant masqué en mode
 * impression. Noir & blanc, texte + bordures uniquement, base 11 pt.
 *
 * Aucune donnée clinique calculée : relevé déclaratif local + alertes déjà
 * produites par computeCabinetAlerts.
 */

import { createPortal } from 'react-dom'
import { ALERT_KIND_META, ageLabel, fmtDate } from './utils'
import { CATEGORY_META, KIT_META, RELATION_META } from './constants'
import type { ArmoireEntry, ArmoireJournalEntry, ArmoireMember, CabinetAlert } from './types'

export interface PrintSummaryProps {
  members: ArmoireMember[]
  entries: ArmoireEntry[]
  journal: ArmoireJournalEntry[]
  alerts: CabinetAlert[]
}

const SEVERITY_PRINT_LABELS: Record<string, string> = {
  'CONTRE-INDIQUE': 'Contre-indication',
  MAJEURE: 'Majeure',
  MODEREE: 'Modérée',
  MINEURE: 'Mineure',
}

/* ------------------------------------------------------------------ */
/* Table d'inventaire (noir & blanc)                                   */
/* ------------------------------------------------------------------ */

function InventoryTable({ entries }: { entries: ArmoireEntry[] }) {
  return (
    <table className="w-full border-collapse text-[9pt]">
      <thead>
        <tr>
          {['Médicament', 'DCI · dosage', 'Forme', 'Catégorie', 'Qté', 'Péremption', 'Kits'].map(
            (h) => (
              <th
                key={h}
                scope="col"
                className="border border-black px-1.5 py-1 text-left font-bold"
              >
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.uid} className="break-inside-avoid">
            <td className="border border-black px-1.5 py-1 font-semibold">{e.brand}</td>
            <td className="border border-black px-1.5 py-1">
              {e.dci || '—'}
              {e.dosage ? ` · ${e.dosage}` : ''}
            </td>
            <td className="border border-black px-1.5 py-1">{e.form || '—'}</td>
            <td className="border border-black px-1.5 py-1">{CATEGORY_META[e.category].label}</td>
            <td className="border border-black px-1.5 py-1 text-right tabular-nums">
              {e.quantity}
            </td>
            <td className="border border-black px-1.5 py-1">{fmtDate(e.expiry)}</td>
            <td className="border border-black px-1.5 py-1">
              {e.kits.length > 0
                ? e.kits.map((k) => KIT_META[k]?.label ?? k).join(', ')
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function MemberBlock({
  title,
  member,
  entries,
}: {
  title: string
  member?: ArmoireMember
  entries: ArmoireEntry[]
}) {
  const flags: string[] = []
  if (member?.pregnant) flags.push('Grossesse')
  if (member?.breastfeeding) flags.push('Allaitement')
  if (member?.renal) flags.push('Fonction rénale à surveiller')

  return (
    <section className="mt-4 break-inside-avoid" aria-label={title}>
      <h2 className="text-[12pt] font-bold">
        {title}
        {member ? ` — ${member.name}` : ''}
      </h2>
      {member ? (
        <p className="text-[9pt]">
          {RELATION_META[member.relation].label} · {ageLabel(member.ageYears)}
          {member.weightKg != null ? ` · ${member.weightKg} kg` : ''}
          {flags.length > 0 ? ` · ${flags.join(' · ')}` : ''}
        </p>
      ) : null}
      {member ? (
        <p className="text-[9pt]">
          <span className="font-bold">Allergies : </span>
          <span className={member.allergies.length > 0 ? 'font-bold' : undefined}>
            {member.allergies.length > 0 ? member.allergies.join(', ') : 'Aucune'}
          </span>
        </p>
      ) : null}
      {entries.length > 0 ? (
        <div className="mt-1.5">
          <InventoryTable entries={entries} />
        </div>
      ) : (
        <p className="mt-1.5 text-[9pt] italic">
          Aucun médicament propre — voir les entrées partagées ci-dessous.
        </p>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Résumé imprimable                                                   */
/* ------------------------------------------------------------------ */

export function PrintSummary(props: PrintSummaryProps) {
  const { members, entries, journal, alerts } = props

  if (members.length === 0 && entries.length === 0) return null
  if (typeof document === 'undefined') return null

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const shared = entries.filter((e) => e.memberIds.length > 1)
  const unassigned = entries.filter((e) => e.memberIds.length === 0)
  const memberSections = members.map((m) => ({
    member: m,
    list: entries.filter((e) => e.memberIds.length === 1 && e.memberIds[0] === m.id),
  }))

  const totalBoxes = entries.reduce((acc, e) => acc + e.quantity, 0)

  return createPortal(
    <div className="print-counter fixed inset-0 z-[999] hidden bg-white text-black print:block print:overflow-visible">
      <div className="mx-auto max-w-[186mm] px-2 py-4 text-[11pt] leading-snug text-black">
        {/* En-tête */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-black pb-2">
          <div>
            <p className="text-[13pt] font-bold tracking-tight">
              DzPharm — Armoire familiale
            </p>
            <p className="text-[9pt]">
              {members.length} membre{members.length > 1 ? 's' : ''} · {entries.length} médicament
              {entries.length > 1 ? 's' : ''} · {totalBoxes} boîte{totalBoxes > 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right text-[9pt]">
            <p className="font-semibold">{today}</p>
            <p>Données locales — usage privé</p>
          </div>
        </header>

        {/* Sections par membre */}
        {memberSections.map(({ member, list }) => (
          <MemberBlock key={member.id} title="Membre" member={member} entries={list} />
        ))}

        {/* Entrées partagées */}
        {shared.length > 0 ? (
          <section className="mt-4 break-inside-avoid" aria-label="Entrées partagées">
            <h2 className="text-[12pt] font-bold">Entrées partagées</h2>
            <ul className="mt-0.5 space-y-0.5 text-[9pt]">
              {shared.map((e) => {
                const names = e.memberIds
                  .map((id) => members.find((m) => m.id === id)?.name)
                  .filter((n): n is string => n != null)
                return (
                  <li key={e.uid}>
                    <span className="font-semibold">{e.brand}</span>
                    {e.dci ? ` (${e.dci}${e.dosage ? ` · ${e.dosage}` : ''})` : ''} —{' '}
                    {names.length > 0 ? names.join(', ') : 'membres supprimés'}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {/* Non assigné */}
        {unassigned.length > 0 ? (
          <MemberBlock title="Non assigné" entries={unassigned} />
        ) : null}

        {/* Alertes */}
        {alerts.length > 0 ? (
          <section className="mt-5 break-inside-avoid" aria-label="Alertes de l’armoire">
            <h2 className="border-b border-black pb-1 text-[12pt] font-bold">
              Alertes ({alerts.length})
            </h2>
            <ul className="mt-1 space-y-0.5 text-[9pt]">
              {alerts.map((a, i) => (
                <li key={`${a.uid}-${a.kind}-${i}`}>
                  <span className="font-semibold">
                    {ALERT_KIND_META[a.kind]?.label ?? a.kind}
                  </span>{' '}
                  — {a.message}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Derniers contrôles */}
        {journal.length > 0 ? (
          <section className="mt-5 break-inside-avoid" aria-label="Derniers contrôles">
            <h2 className="border-b border-black pb-1 text-[12pt] font-bold">
              Derniers contrôles
            </h2>
            <ul className="mt-1 space-y-0.5 text-[9pt]">
              {journal.slice(0, 5).map((j) => (
                <li key={j.id}>
                  <span className="font-semibold">
                    {new Date(j.at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </span>{' '}
                  — {j.scope} · {j.itemsCount} médicaments · {j.interactions} interaction
                  {j.interactions > 1 ? 's' : ''}
                  {j.maxSeverity
                    ? ` · gravité max : ${SEVERITY_PRINT_LABELS[j.maxSeverity] ?? j.maxSeverity}`
                    : ''}
                  {j.pregnancyAlerts > 0 ? ` · ${j.pregnancyAlerts} alerte(s) grossesse` : ''}
                  {` · ${j.cabinetAlerts} alerte(s) armoire`}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Pied de page */}
        <footer className="mt-6 border-t-2 border-black pt-2 text-[8pt] leading-relaxed">
          <p>
            Sources : répertoire officiel algérien (nomenclature — dernière vérification Juin
            2026) ; alertes calculées localement à partir des données déclarées.
          </p>
          <p>
            Usage professionnel — vérifiez toujours les RCP officiels avant toute décision
            clinique. En urgence : SAMU 14 (
            <a href="tel:14" className="font-semibold underline">
              14
            </a>
            ) — Centre Anti-Poison (Alger) : 021 71 30 42. Carte d&apos;aide — ne remplace pas
            une prise en charge médicale.
          </p>
        </footer>
      </div>
    </div>,
    document.body
  )
}
