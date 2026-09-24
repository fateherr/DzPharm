import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { AppShell } from '@/components/dzpharm/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coins,
  FileText,
  Globe,
  Package,
  Pill,
  Share2,
  ShieldAlert,
  Sparkles,
  Tag,
  XCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

async function findDrug(slugOrId: string) {
  const clean = decodeURIComponent(slugOrId).trim()
  const numId = parseInt(clean, 10)

  // 1. Direct ID lookup
  if (!Number.isNaN(numId) && String(numId) === clean) {
    const drug = await db.drug.findUnique({
      where: { id: numId },
      include: {
        pharmacyProducts: {
          orderBy: [{ ppa: 'asc' }],
          select: { id: true, name: true, ppa: true, cnasId: true, class: true, lab: true },
        },
      },
    })
    if (drug) return drug
  }

  // 2. Slug lookup by brand key or exact brand
  const normalizedKey = clean
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

  const firstWord = normalizedKey.split(' ')[0]

  const drug = await db.drug.findFirst({
    where: {
      OR: [
        { brandKey: { equals: normalizedKey } },
        { brand: { contains: clean } },
        { brandKey: { startsWith: firstWord } },
      ],
    },
    include: {
      pharmacyProducts: {
        orderBy: [{ ppa: 'asc' }],
        select: { id: true, name: true, ppa: true, cnasId: true, class: true, lab: true },
      },
    },
  })

  return drug
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const drug = await findDrug(slug)

  if (!drug) {
    return {
      title: 'Médicament non trouvé · DzPharm',
      description: 'La fiche du médicament demandé n’a pas été trouvée dans la nomenclature algérienne.',
    }
  }

  const title = `${drug.brand} ${drug.dosage ?? ''} (${drug.dci}) · DzPharm`
  const description = `${drug.brand} — DCI : ${drug.dci}. Forme : ${drug.form ?? 'N/A'}. Laboratoire : ${drug.lab ?? 'N/A'}. Statut : ${drug.status}. Référentiel pharmaceutique algérien.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://dzpharm.dz/medicament/${slug}`,
    },
  }
}

export default async function MedicationPage({ params }: Props) {
  const { slug } = await params
  const drug = await findDrug(slug)

  if (!drug) {
    notFound()
  }

  const pharmacy = drug.pharmacyProducts?.[0]
  const isActif = drug.status === 'ACTIF'
  const isRetire = drug.status === 'RETRIE'

  // Fetch equivalents with same DCI
  const equivalents = drug.dciKey
    ? await db.drug.findMany({
        where: { dciKey: drug.dciKey, id: { not: drug.id } },
        orderBy: [{ status: 'asc' }, { brandKey: 'asc' }],
        take: 12,
        select: {
          id: true,
          brand: true,
          form: true,
          dosage: true,
          lab: true,
          status: true,
        },
      })
    : []

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Fil d'Ariane SEO */}
        <nav aria-label="Fil d'ariane" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Accueil
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <Link href="/repertoire" className="hover:text-primary transition-colors">
            Répertoire
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
            {drug.brand}
          </span>
        </nav>

        {/* En-tête principal de la fiche */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {drug.brand}
                </h1>
                {drug.status === 'ACTIF' && (
                  <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
                    <CheckCircle2 className="size-3 mr-1 inline" />
                    Enregistrement Actif
                  </Badge>
                )}
                {drug.status === 'NON_RENOUVELE' && (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                    <AlertTriangle className="size-3 mr-1 inline" />
                    Non Renouvelé
                  </Badge>
                )}
                {drug.status === 'RETRIE' && (
                  <Badge variant="destructive" className="bg-destructive/15 text-destructive border-destructive/30">
                    <XCircle className="size-3 mr-1 inline" />
                    Retiré du marché
                  </Badge>
                )}
                {drug.liste && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {drug.liste}
                  </Badge>
                )}
              </div>
              <p className="text-base text-muted-foreground font-medium flex items-center gap-2">
                <span className="font-semibold text-foreground">{drug.dci}</span>
                {drug.dosage && <span>• {drug.dosage}</span>}
                {drug.form && <span>• {drug.form}</span>}
              </p>
            </div>

            {pharmacy?.ppa != null && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-right">
                <div className="text-xs text-muted-foreground font-medium">Prix Public (PPA)</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {pharmacy.ppa.toFixed(2)} DA
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {pharmacy.cnasId ? '✓ Remboursable Chifa' : 'Non remboursé'}
                </div>
              </div>
            )}
          </div>

          {isRetire && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-sm text-destructive flex items-start gap-2.5">
              <ShieldAlert className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Ce médicament fait l&apos;objet d&apos;un retrait du marché algérien.</p>
                {drug.withdrawReason && (
                  <p className="text-xs mt-1 text-destructive/90">
                    <strong>Motif :</strong> {drug.withdrawReason}
                  </p>
                )}
                {drug.withdrawDate && (
                  <p className="text-xs mt-0.5 text-destructive/80">
                    <strong>Date de retrait :</strong> {drug.withdrawDate}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grille des caractéristiques officielles (11 métriques) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <FileText className="size-4 text-primary" />
                Numéro AMM (Enregistrement)
              </div>
              <div className="font-mono text-sm font-bold text-foreground">
                {drug.regNumber ?? 'Non renseigné'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Tag className="size-4 text-primary" />
                Code Nomenclature
              </div>
              <div className="font-mono text-sm font-bold text-foreground">
                {drug.code ?? 'Non renseigné'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Building2 className="size-4 text-primary" />
                Laboratoire Détenteur
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {drug.lab ?? 'Non renseigné'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Globe className="size-4 text-primary" />
                Pays d&apos;Origine
              </div>
              <div className="text-sm font-semibold text-foreground">
                {drug.country ?? 'Algérie'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Package className="size-4 text-primary" />
                Conditionnement
              </div>
              <div className="text-sm font-semibold text-foreground">
                {drug.packaging ?? 'Non précisé'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Clock className="size-4 text-primary" />
                Durée de Stabilité
              </div>
              <div className="text-sm font-semibold text-foreground">
                {drug.stability ?? '36 mois (standard)'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Équivalents thérapeutiques (Même DCI) */}
        {equivalents.length > 0 && (
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Pill className="size-5 text-primary" />
                Spécialités Équivalentes (Même DCI : {drug.dci})
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                {equivalents.length} référence{equivalents.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {equivalents.map((eq) => (
                <Link
                  key={eq.id}
                  href={`/medicament/${eq.id}`}
                  className="rounded-xl border border-border/60 p-3 hover:border-primary/50 hover:bg-muted/40 transition-colors block text-left"
                >
                  <div className="font-semibold text-sm text-foreground truncate">
                    {eq.brand}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {eq.dosage} {eq.form ? `• ${eq.form}` : ''}
                  </div>
                  <div className="text-[11px] text-muted-foreground/80 mt-1 truncate">
                    {eq.lab}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pied de page de la fiche avec raccourcis */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/60">
          <Link href="/repertoire">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              Retour au Répertoire
            </Button>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/interactions">
              <Button variant="secondary" className="gap-2">
                <ShieldAlert className="size-4" />
                Vérifier les interactions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
