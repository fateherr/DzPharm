import type { Metadata } from 'next'
import { AppShell } from '@/components/dzpharm/app-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Phone, MapPin, ShieldCheck, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact & Pharmacovigilance · DzPharm',
  description:
    'Contactez l’équipe DzPharm pour tout signalement d’erreur dans la nomenclature, retour technique ou signalement de pharmacovigilance.',
}

export default function ContactPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Contact & Support Déontologique
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            DzPharm est un référentiel indépendant au service des praticiens et patients algériens.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="size-5 text-primary" />
                Support & Contact Général
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Pour toute question relative aux données, signalement d&apos;anomalie ou suggestion d&apos;amélioration :
              </p>
              <div className="rounded-lg bg-muted/50 p-3 font-mono text-xs text-foreground">
                contact@dzpharm.dz
              </div>
              <p className="text-xs">
                Délai de réponse moyen : 24 à 48 heures ouvrées.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-state-warning">
                <AlertCircle className="size-5" />
                Urgences Médicales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                DzPharm n&apos;est pas un service d&apos;urgence. En cas de détresse vitale ou d&apos;intoxication aiguë, composez immédiatement :
              </p>
              <div className="space-y-1.5 text-xs font-semibold text-foreground">
                <p>• SAMU : <a href="tel:14" className="text-primary hover:underline font-mono">14</a></p>
                <p>• Protection Civile : <a href="tel:102" className="text-primary hover:underline font-mono">102</a></p>
                <p>• Centre Anti-Poison (Alger) : <a href="tel:021713042" className="text-primary hover:underline font-mono">021 71 30 42</a></p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <ShieldCheck className="size-5" />
              Pharmacovigilance & Signalement de Pénurie
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Pour signaler un effet indésirable suspecté ou une rupture de stock en officine, vous pouvez utiliser les modules interactifs intégrés directement dans chaque fiche médicament ou dans le Centre des Pénuries.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
