import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, FileText, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mentions Légales, Confidentialité & Loi 18-07 · DzPharm',
  description:
    'Cadre juridique, protection des données personnelles (Loi algérienne 18-07) et avertissements légaux de DzPharm.',
}

export default function LegalPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Mentions Légales & Confidentialité
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Informations juridiques, propriété intellectuelle et respect de la vie privée.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" />
              1. Objet du Service & Avertissement Médical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              DzPharm est un outil d&apos;information et d&apos;aide à la décision thérapeutique destiné aux professionnels de santé (médecins, pharmaciens, chirurgiens-dentistes) et au grand public en Algérie.
            </p>
            <p className="rounded-lg border border-state-warning/30 bg-state-warning/10 p-3 text-xs font-semibold text-state-warning">
              AVERTISSEMENT : Les informations fournies sur DzPharm ne remplacent en aucun cas une consultation médicale ou les conseils personnalisés d&apos;un pharmacien diplômé. En cas de doute ou d&apos;urgence, consultez immédiatement un médecin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4 text-primary" />
              2. Protection des Données Personnelles (Loi 18-07)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Conformément à la Loi n° 18-07 du 10 juin 2018 relative à la protection des personnes physiques dans le traitement des données à caractère personnel :
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>
                <strong>Stockage 100% Local :</strong> Les données sensibles saisies dans l&apos;Armoire Familiale (noms des membres, traitements, allergies) sont conservées exclusivement dans le navigateur local de l&apos;utilisateur (localStorage).
              </li>
              <li>
                <strong>Aucune Revente :</strong> Aucune donnée de santé n&apos;est transmise à des tiers, ni commercialisée à des fins publicitaires.
              </li>
              <li>
                <strong>Droit à l&apos;effacement :</strong> Vous pouvez à tout moment effacer l&apos;ensemble de vos données locales via le bouton de réinitialisation disponible dans les réglages de l&apos;armoire.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4 text-primary" />
              3. Sources Documentaires Officielles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Nomenclature Nationale des Produits Pharmaceutiques — Ministère de la Santé (MSPRH, 2026).</p>
            <p>• Liste des Médicaments Remboursables — Caisse Nationale des Assurances Sociales (CNAS / CASNOS).</p>
            <p>• Fiches et protocoles cliniques validés — ANSM & Centre de Référence sur les Agents Tératogènes (CRAT).</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
