'use client'

import {
  AlertTriangle,
  BookOpen,
  Coins,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FlaskConical,
  Info,
  Lock,
  Megaphone,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SafetyNote } from './safety-note'
import { FreshnessBadge } from './freshness-badge'
import { PLATFORM_STATS, formatAmmCount } from '@/lib/constants/stats'

/* ------------------------------------------------------------------ */
/* Petits blocs réutilisables                                          */
/* ------------------------------------------------------------------ */

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen
  title: string
  description?: string
}) {
  return (
    <div className="mb-4 mt-10 first:mt-0">
      <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" aria-hidden />
        </span>
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}

function ExternalLinkRow({
  href,
  label,
  detail,
}: {
  href: string
  label: string
  detail: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground group-hover:text-primary">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {detail}
        </span>
      </span>
      <ExternalLink
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden
      />
    </a>
  )
}

function NumberedStep({
  step,
  title,
  children,
}: {
  step: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-3.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
        {step}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Vue À propos                                                        */
/* ------------------------------------------------------------------ */

export function AboutView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-12 sm:px-6">
      {/* En-tête */}
      <div className="mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ScrollText className="size-6" aria-hidden />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                À propos de DzPharm — Sources &amp; méthodologie
              </h1>
              <FreshnessBadge />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Transparence sur nos données, nos traitements et les limites de
              l’outil — pour un usage professionnel éclairé.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Nos sources ---------------- */}
      <SectionHeading
        icon={Database}
        title="Nos sources"
        description="DzPharm agrège des référentiels pharmaceutiques algériens réels, sans les modifier. Voici l’origine exacte de chaque jeu de données."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <FileSpreadsheet className="size-4 shrink-0 text-primary" aria-hidden />
                Nomenclature nationale
              </CardTitle>
              <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/5 text-[10px] text-primary">
                Juin 2026
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Ministère de l’Industrie Pharmaceutique — édition Juin 2026
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Référentiel officiel des produits pharmaceutiques enregistrés :
              <span className="font-semibold text-foreground"> {formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)} produits</span>,
              dont {formatAmmCount(PLATFORM_STATS.ACTIVE_DRUGS)} actifs, {formatAmmCount(PLATFORM_STATS.NON_RENEWED_DRUGS)} non renouvelés et {formatAmmCount(PLATFORM_STATS.WITHDRAWN_DRUGS)} retirés. La
              réconciliation exacte
              ({formatAmmCount(PLATFORM_STATS.ACTIVE_DRUGS)} + {formatAmmCount(PLATFORM_STATS.NON_RENEWED_DRUGS)} + {formatAmmCount(PLATFORM_STATS.WITHDRAWN_DRUGS)} = {formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS)}) est affichée telle quelle dans nos
              statistiques.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <BookOpen className="size-4 shrink-0 text-primary" aria-hidden />
                Pharmacologie clinique algérienne
              </CardTitle>
              <Badge variant="outline" className="shrink-0 border-primary/25 bg-primary/5 text-[10px] text-primary">
                24 fascicules
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Collection locale — fascicules I à XXIV
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Collection de pharmacologie clinique en 24 fascicules :
              <span className="font-semibold text-foreground"> ~997 DCI traitées</span>{' '}
              (~3 031 000 mots), structure standardisée en 12 sections par
              monographie. Complétude évaluée par un audit interne (Août 2026).
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Coins className="size-4 shrink-0 text-chifa" aria-hidden />
                Liste des prix PPA
              </CardTitle>
              <Badge variant="outline" className="shrink-0 border-chifa/25 bg-chifa/5 text-[10px] text-chifa">
                Août 2026
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Prix public algérien — liste officine
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">1 791 produits</span>{' '}
              avec leur prix PPA et leur identifiant CNAS, utilisés pour le
              catalogue officine et le simulateur d’économies génériques.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-[15px]">
              <ExternalLink className="size-4 shrink-0 text-primary" aria-hidden />
              Liens officiels
            </CardTitle>
            <CardDescription className="text-xs">
              Les autorités de référence en Algérie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            <ExternalLinkRow
              href="https://anpp.dz"
              label="ANPP — Agence Nationale des Produits Pharmaceutiques"
              detail="anpp.dz — enregistrement &amp; contrôle des médicaments"
            />
            <ExternalLinkRow
              href="https://cnas.dz"
              label="CNAS — Caisse Nationale des Assurances Sociales"
              detail="cnas.dz — remboursement &amp; carte Chifa"
            />
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Méthodologie ---------------- */}
      <SectionHeading
        icon={Workflow}
        title="Méthodologie"
        description="Notre chaîne de traitement des données, en toute transparence — y compris là où l’intelligence artificielle intervient."
      />

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <ol className="space-y-5">
            <NumberedStep step={1} title="Extraction automatisée du registre">
              La nomenclature nationale (format XLSX) est convertie en base SQL
              via un pipeline de normalisation des DCI et des noms de marque
              (nettoyage des dosages, des formes et des statuts). Aucune valeur
              n’est inventée : chaque ligne provient du fichier officiel.
            </NumberedStep>
            <NumberedStep step={2} title="Monographies extraites des 24 livres">
              Les fascicules de pharmacologie clinique sont analysés et rattachés
              au registre par correspondance de DCI (stratégies multiples :
              correspondance exacte, normalisation des accents et des
              associations).{' '}
              <span className="font-semibold text-foreground">
                90,5 % des actifs du registre sont couverts.
              </span>
            </NumberedStep>
            <NumberedStep step={3} title="Prix appariés au registre">
              Les 1 791 prix PPA sont rapprochés des spécialités par marque et
              identifiant CNAS.{' '}
              <span className="font-semibold text-foreground">
                62 % des produits du registre sont liés à un prix
              </span>{' '}
              — les autres s’affichent « prix non disponible », sans estimation.
            </NumberedStep>
            <NumberedStep step={4} title="RCP : priorité au livre, IA identifiée">
              Les résumés des caractéristiques produit suivent un ordre strict :
              fiche du livre technique en priorité, puis génération assistée par
              IA{' '}
              <span className="inline-flex items-center gap-1 rounded-md border border-violet-300/60 bg-violet-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300">
                <Sparkles className="size-3" aria-hidden />
                IA
              </span>{' '}
              (toujours signalée par un badge « IA »), puis informations du
              registre. Un RCP généré doit être vérifié avant usage.
            </NumberedStep>
            <NumberedStep step={5} title="Copilote IA encadré">
              Le copilote conversationnel ancre ses réponses sur le registre et
              les monographies : il refuse de donner une dose non sourcée et
              identifie clairement les contenus générés.
            </NumberedStep>
          </ol>
        </CardContent>
      </Card>

      {/* ---------------- Chiffres clés ---------------- */}
      <SectionHeading
        icon={Info}
        title="Chiffres clés"
        description="Chaque chiffre mesure une chose précise — les voici étiquetés, cohérents avec la réconciliation du registre."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            value: formatAmmCount(PLATFORM_STATS.TOTAL_DRUGS),
            label: `total de la nomenclature, tous statuts confondus (${formatAmmCount(PLATFORM_STATS.ACTIVE_DRUGS)} actifs + ${formatAmmCount(PLATFORM_STATS.NON_RENEWED_DRUGS)} non renouvelés + ${formatAmmCount(PLATFORM_STATS.WITHDRAWN_DRUGS)} retirés)`,
          },
          {
            value: formatAmmCount(PLATFORM_STATS.TOTAL_MONOGRAPHS),
            label: 'monographies DCI complètes extraites de la collection de pharmacologie clinique',
          },
          {
            value: formatAmmCount(PLATFORM_STATS.PHARMACY_PRODUCTS),
            label: 'prix PPA officine référencés (liste Août 2026, avec identifiant CNAS)',
          },
          {
            value: '24',
            label: 'livres / fascicules de pharmacologie clinique algérienne intégrés',
          },
        ].map((stat) => (
          <div
            key={stat.value}
            className="rounded-xl border border-border/80 bg-card p-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold tracking-tight text-primary">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ---------------- Limites & précautions ---------------- */}
      <SectionHeading
        icon={ShieldAlert}
        title="Limites & précautions"
        description="Ce que DzPharm n’est pas."
      />

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <ul className="space-y-3">
            {[
              'Les données sont indicatives : DzPharm n’est ni un substitut du RCP officiel, ni un outil de décision médicale autonome. Toute décision thérapeutique relève d’un professionnel de santé.',
              'Les signalements de pénurie sont communautaires et non vérifiés : ils traduisent des difficultés rapportées sur le terrain, pas une mesure officielle des stocks.',
              'L’annuaire des pharmacies de garde est indicatif : confirmez toujours par téléphone avant de vous déplacer.',
              'Les RCP estampillés « IA » sont des générations assistées : ils doivent être confrontés au RCP officiel avant toute utilisation professionnelle.',
              'Données actualisées sur la base des éditions Juin 2026 (nomenclature) et Août 2026 (prix PPA, audit des monographies) — les statuts et prix peuvent avoir évolué depuis.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-state-warning"
                  aria-hidden
                />
                <p className="text-[13px] leading-relaxed text-foreground/90">
                  {item}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ---------------- Pharmacovigilance ---------------- */}
      <SectionHeading
        icon={Megaphone}
        title="Pharmacovigilance : signaler un effet indésirable"
        description="Comment se déclare officiellement un effet indésirable en Algérie."
      />

      <Card className="border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="text-[13px] leading-relaxed text-foreground/90">
            En Algérie, la pharmacovigilance est pilotée par le{' '}
            <span className="font-semibold">
              Centre National de Pharmacovigilance
            </span>{' '}
            (relevant de la direction de la pharmacie, Ministère de la Santé) :
            c’est lui qui recueille et analyse les déclarations d’effets
            indésirables. Pour déclarer, passez par votre{' '}
            <span className="font-semibold">médecin</span>, votre{' '}
            <span className="font-semibold">pharmacien</span> ou le{' '}
            <span className="font-semibold">
              centre de pharmacovigilance de votre wilaya
            </span>{' '}
            — les professionnels de santé savent transmettre la notification aux
            canaux officiels (fiche de notification, ANPP).
          </p>
          <p className="flex items-start gap-2.5 rounded-lg border border-state-danger/30 bg-state-danger/5 px-3.5 py-3 text-[13px] leading-relaxed text-foreground/90">
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0 text-state-danger"
              aria-hidden
            />
            <span>
              <span className="font-semibold">
                DzPharm ne transmet pas vos signalements aux autorités.
              </span>{' '}
              Signaler un effet indésirable dans l’application (ou à son
              entourage) ne remplace jamais la notification officielle — elle
              seule déclenche l’analyse réglementaire.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* ---------------- Mentions légales ---------------- */}
      <SectionHeading
        icon={Lock}
        title="Mentions légales"
        description="Éditeur, propriété intellectuelle, responsabilité et vie privée."
      />

      <Card className="border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <dl className="space-y-4">
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ScrollText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Éditeur &amp; propriété intellectuelle
              </dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                DzPharm est un référentiel d’information pharmaceutique édité à
                des fins professionnelles et pédagogiques. Les données du
                registre, des prix et des monographies restent la propriété de
                leurs sources officielles ; les contenus rédactionnels originaux
                (glossaire, guides patients, analyses) sont protégés par le droit
                d’auteur.
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Responsabilité
              </dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                L’éditeur met en œuvre son meilleur soin pour l’exactitude des
                données au jour de leur actualisation, mais sa responsabilité ne
                saurait être engagée pour une décision prise sur la seule base de
                cet outil. Le RCP officiel et l’avis d’un professionnel de santé
                prévalent en toutes circonstances.
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                Vie privée
              </dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                DzPharm ne collecte aucune donnée personnelle : vos favoris,
                votre panier d’interactions et votre historique restent stockés
                localement dans votre navigateur. Aucun compte, aucun pistage,
                aucun profilage.
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Note de sécurité standard */}
      <div className="mt-8">
        <SafetyNote />
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        DzPharm — Référentiel pharmaceutique algérien · Actualisation des
        données : Juin / Août 2026
      </p>
    </div>
  )
}
