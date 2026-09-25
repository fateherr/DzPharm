'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  HandCoins,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { WILAYAS } from '@/lib/wilayas'

export type PostingType = 'perimable_cession' | 'depannage_urgence'
export type TransferMode = 'prix_coutant_ppa' | 'remise_confrere' | 'echange' | 'gratuit'

export interface StockPosting {
  id: string
  type: PostingType
  brand: string
  dci: string
  dosage: string
  form: string
  wilaya: string
  commune: string
  pharmacyName: string
  phone: string
  quantityBoxes: number
  expiryDate?: string // YYYY-MM
  daysUntilExpiry?: number
  lotNumber?: string
  transferMode: TransferMode
  note?: string
  createdAt: string
}

const STORAGE_KEY = 'dzpharm.stock_exchange.v1'

const SEED_POSTINGS: StockPosting[] = [
  {
    id: 'post-01',
    type: 'perimable_cession',
    brand: 'Sintrom 4 mg',
    dci: 'Acénocoumarol',
    dosage: '4 mg',
    form: 'Comprimé sécable',
    wilaya: 'Alger',
    commune: 'Hydra',
    pharmacyName: 'Pharmacie du Val d’Hydra',
    phone: '023 48 12 34',
    quantityBoxes: 8,
    expiryDate: '2026-11',
    daysUntilExpiry: 58,
    lotNumber: 'L84920B',
    transferMode: 'prix_coutant_ppa',
    note: 'Surstock suite à changement d’ordonnances d’un groupe de patients. Cession immédiate confrère.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'post-02',
    type: 'depannage_urgence',
    brand: 'Célestène 2 mg/mL gouttes',
    dci: 'Bétaméthasone',
    dosage: '0,05 %',
    form: 'Solution buvable',
    wilaya: 'Constantine',
    commune: 'Ali Mendjeli',
    pharmacyName: 'Pharmacie Ibn Rochd',
    phone: '031 79 40 12',
    quantityBoxes: 2,
    transferMode: 'echange',
    note: 'Nourrisson asthmatique en crise, besoin urgent de 2 flacons au comptoir. Échange contre Augmentin si souhaité.',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'post-03',
    type: 'perimable_cession',
    brand: 'Lantus SoloStar 100 U/mL',
    dci: 'Insuline glargine',
    dosage: '100 UI/mL',
    form: 'Stylo prérempli',
    wilaya: 'Oran',
    commune: 'Es Sénia',
    pharmacyName: 'Pharmacie de l’Aéroport',
    phone: '041 51 88 90',
    quantityBoxes: 5,
    expiryDate: '2026-12',
    daysUntilExpiry: 88,
    lotNumber: 'FR2948',
    transferMode: 'remise_confrere',
    note: 'Conservé strictement sous chaîne du froid contrôlée 2-8°C avec enregistreur de température.',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
  },
  {
    id: 'post-04',
    type: 'depannage_urgence',
    brand: 'Depakine 500 mg Chrono',
    dci: 'Valproate de sodium',
    dosage: '500 mg',
    form: 'Comprimé à libération prolongée',
    wilaya: 'Sétif',
    commune: 'El Eulma',
    pharmacyName: 'Pharmacie Centrale El Eulma',
    phone: '036 85 10 99',
    quantityBoxes: 3,
    transferMode: 'prix_coutant_ppa',
    note: 'Patient épileptique régulier sans traitement pour le week-end.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'post-05',
    type: 'perimable_cession',
    brand: 'Augmentin 1 g / 125 mg Adulte',
    dci: 'Amoxicilline + Acide clavulanique',
    dosage: '1 g / 125 mg',
    form: 'Poudre pour suspension',
    wilaya: 'Blida',
    commune: 'Boufarik',
    pharmacyName: 'Pharmacie Si Zoubir',
    phone: '025 38 71 22',
    quantityBoxes: 12,
    expiryDate: '2026-11',
    daysUntilExpiry: 62,
    lotNumber: 'K9012',
    transferMode: 'prix_coutant_ppa',
    note: '12 boîtes disponibles pour officine à fort débit avant fin novembre.',
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
]

export function StockExchangeBulletin() {
  const [postings, setPostings] = useState<StockPosting[]>([])
  const [activeTab, setActiveTab] = useState<PostingType>('perimable_cession')
  const [filterWilaya, setFilterWilaya] = useState<string>('toutes')
  const [filterExpiry, setFilterExpiry] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [showForm, setShowForm] = useState<boolean>(false)

  // Formulaire de nouvelle annonce
  const [formType, setFormType] = useState<PostingType>('perimable_cession')
  const [formBrand, setFormBrand] = useState('')
  const [formDci, setFormDci] = useState('')
  const [formDosage, setFormDosage] = useState('')
  const [formForm, setFormForm] = useState('')
  const [formWilaya, setFormWilaya] = useState('Alger')
  const [formCommune, setFormCommune] = useState('')
  const [formPharmacy, setFormPharmacy] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formQty, setFormQty] = useState('1')
  const [formExpiry, setFormExpiry] = useState('')
  const [formLot, setFormLot] = useState('')
  const [formMode, setFormMode] = useState<TransferMode>('prix_coutant_ppa')
  const [formNote, setFormNote] = useState('')

  // Chargement localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPostings(JSON.parse(stored))
      } else {
        setPostings(SEED_POSTINGS)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSTINGS))
      }
    } catch {
      setPostings(SEED_POSTINGS)
    }
  }, [])

  const savePostings = (items: StockPosting[]) => {
    setPostings(items)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }

  const handleCreatePosting = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formBrand.trim()) {
      toast.error('Veuillez préciser le nom du médicament.')
      return
    }
    if (!formPhone.trim()) {
      toast.error('Veuillez indiquer un numéro de téléphone joignable.')
      return
    }

    const qty = parseInt(formQty, 10) || 1

    let daysLeft: number | undefined
    if (formExpiry) {
      const expiry = new Date(formExpiry)
      const diffMs = expiry.getTime() - Date.now()
      daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }

    const newPost: StockPosting = {
      id: `post-${Date.now()}`,
      type: formType,
      brand: formBrand.trim(),
      dci: formDci.trim() || formBrand.trim(),
      dosage: formDosage.trim(),
      form: formForm.trim(),
      wilaya: formWilaya,
      commune: formCommune.trim() || formWilaya,
      pharmacyName: formPharmacy.trim() || 'Officine Partenaire',
      phone: formPhone.trim(),
      quantityBoxes: qty,
      expiryDate: formExpiry || undefined,
      daysUntilExpiry: daysLeft,
      lotNumber: formLot.trim() || undefined,
      transferMode: formMode,
      note: formNote.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    const updated = [newPost, ...postings]
    savePostings(updated)
    setShowForm(false)
    // Reset form
    setFormBrand('')
    setFormDci('')
    setFormDosage('')
    setFormForm('')
    setFormNote('')
    setFormLot('')
    toast.success('Annonce publiée avec succès sur la bourse inter-pharmacies !')
  }

  const handleDeletePosting = (id: string) => {
    const updated = postings.filter((p) => p.id !== id)
    savePostings(updated)
    toast.info('Annonce retirée.')
  }

  // Filtrage
  const filtered = useMemo(() => {
    return postings.filter((p) => {
      if (p.type !== activeTab) return false
      if (filterWilaya !== 'toutes' && p.wilaya !== filterWilaya) return false

      if (filterExpiry === '30' && (p.daysUntilExpiry == null || p.daysUntilExpiry > 30)) return false
      if (filterExpiry === '60' && (p.daysUntilExpiry == null || p.daysUntilExpiry > 60)) return false
      if (filterExpiry === '90' && (p.daysUntilExpiry == null || p.daysUntilExpiry > 90)) return false
      if (filterExpiry === '180' && (p.daysUntilExpiry == null || p.daysUntilExpiry > 180)) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${p.brand} ${p.dci} ${p.wilaya} ${p.commune} ${p.pharmacyName}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [postings, activeTab, filterWilaya, filterExpiry, searchQuery])

  const counts = useMemo(() => {
    const perimables = postings.filter((p) => p.type === 'perimable_cession').length
    const depannages = postings.filter((p) => p.type === 'depannage_urgence').length
    return { perimables, depannages }
  }, [postings])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-border/80 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent">
        <CardHeader className="p-5 pb-4 sm:p-6 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15" aria-hidden>
                  <ArrowRightLeft className="size-5 text-emerald-600 dark:text-emerald-400" />
                </span>
                Bourse Inter-Pharmacies &amp; Dépannage Confraternel (W6-03)
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                Plateforme confraternelle d&apos;entraide officinale : cession des stocks à péremption rapprochée (&lt; 90 jours) pour éviter le gaspillage et dépannage d&apos;urgence pour patients au comptoir.
              </CardDescription>
            </div>

            <Button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="shrink-0 h-10 gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="size-4" />
              {showForm ? 'Fermer le formulaire' : 'Publier une annonce'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Formulaire de publication (AnimatePresence) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="border-emerald-500/40 shadow-sm">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Nouvelle annonce de dépannage ou cession
                </CardTitle>
                <CardDescription className="text-xs">
                  Réservé aux pharmaciens et équipes officinales d&apos;Algérie. Les coordonnées sont visibles par les confrères.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <form onSubmit={handleCreatePosting} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Type d&apos;annonce</Label>
                      <Select value={formType} onValueChange={(v) => setFormType(v as PostingType)}>
                        <SelectTrigger className="mt-1 h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="perimable_cession">
                            📦 Cession périmable (&lt; 90 jours / surstock)
                          </SelectItem>
                          <SelectItem value="depannage_urgence">
                            🚨 Demande de dépannage urgent (ordonnance au comptoir)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">
                        Nom commercial / Spécialité <span className="text-state-danger">*</span>
                      </Label>
                      <Input
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        placeholder="Ex : Sintrom 4mg, Augmentin 1g..."
                        className="mt-1 h-10 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">DCI (optionnel)</Label>
                      <Input
                        value={formDci}
                        onChange={(e) => setFormDci(e.target.value)}
                        placeholder="Ex : Acénocoumarol"
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Dosage / Forme</Label>
                      <Input
                        value={formDosage}
                        onChange={(e) => setFormDosage(e.target.value)}
                        placeholder="Ex : 4 mg, boîte de 30 cp"
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Quantité (boîtes)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        className="mt-1 h-10 text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Wilaya</Label>
                      <Select value={formWilaya} onValueChange={setFormWilaya}>
                        <SelectTrigger className="mt-1 h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {WILAYAS.map((w) => (
                            <SelectItem key={w} value={w}>
                              {w}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Commune</Label>
                      <Input
                        value={formCommune}
                        onChange={(e) => setFormCommune(e.target.value)}
                        placeholder="Ex : Bab El Oued, Hydra..."
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Nom de l&apos;officine</Label>
                      <Input
                        value={formPharmacy}
                        onChange={(e) => setFormPharmacy(e.target.value)}
                        placeholder="Ex : Pharmacie Centrale"
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">
                        Numéro de téléphone <span className="text-state-danger">*</span>
                      </Label>
                      <Input
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="Ex : 021 63 42 18 ou 0550..."
                        className="mt-1 h-10 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Date de péremption (si cession)</Label>
                      <Input
                        type="month"
                        value={formExpiry}
                        onChange={(e) => setFormExpiry(e.target.value)}
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Conditions de cession / transfert</Label>
                      <Select value={formMode} onValueChange={(v) => setFormMode(v as TransferMode)}>
                        <SelectTrigger className="mt-1 h-10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prix_coutant_ppa">Cession au prix d&apos;achat / PPA</SelectItem>
                          <SelectItem value="remise_confrere">Remise confraternelle</SelectItem>
                          <SelectItem value="echange">Remplacement à l&apos;identique</SelectItem>
                          <SelectItem value="gratuit">Dépannage gracieux (solidarité)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Précisions ou consignes particulières</Label>
                    <Textarea
                      value={formNote}
                      onChange={(e) => setFormNote(e.target.value)}
                      placeholder="Ex : Chaîne du froid strictement respectée, disponible dès aujourd'hui..."
                      rows={2}
                      className="mt-1 text-xs resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm(false)}
                      className="text-xs"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Send className="size-3.5 mr-1" />
                      Publier l&apos;annonce
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onglets Périmables vs Dépannage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('perimable_cession')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer',
              activeTab === 'perimable_cession'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="size-4" />
            Bourse Périmables &lt; 90j ({counts.perimables})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('depannage_urgence')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer',
              activeTab === 'depannage_urgence'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <AlertCircle className="size-4" />
            Dépannage d&apos;urgence ({counts.depannages})
          </button>
        </div>

        {/* Filtres rapides */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher produit..."
              className="h-9 pl-8 text-xs"
            />
          </div>

          <Select value={filterWilaya} onValueChange={setFilterWilaya}>
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue placeholder="Wilaya" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="toutes">Toutes wilayas</SelectItem>
              {WILAYAS.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeTab === 'perimable_cession' && (
            <Select value={filterExpiry} onValueChange={setFilterExpiry}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Délai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous délais</SelectItem>
                <SelectItem value="30">&lt; 30 jours</SelectItem>
                <SelectItem value="60">&lt; 60 jours</SelectItem>
                <SelectItem value="90">&lt; 90 jours</SelectItem>
                <SelectItem value="180">&lt; 6 mois</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Liste des annonces */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Package className="mx-auto size-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-foreground">Aucune annonce trouvée</p>
          <p className="text-xs text-muted-foreground mt-1">
            Modifiez vos filtres ou publiez une première annonce pour vos confrères de la wilaya.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const isEmergency = item.type === 'depannage_urgence'
            const telHref = `tel:${item.phone.replace(/\s/g, '')}`
            const waHref = `https://wa.me/213${item.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}?text=Salam%20confrère,%20je%20vous%20contacte%20via%20DzPharm%20concernant%20votre%20annonce%20pour%20${encodeURIComponent(item.brand)}`

            return (
              <Card
                key={item.id}
                className={cn(
                  'flex flex-col border transition-all hover:shadow-xs',
                  isEmergency ? 'border-rose-500/30 hover:border-rose-500/60' : 'border-emerald-500/30 hover:border-emerald-500/60'
                )}
              >
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5',
                            isEmergency
                              ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          )}
                        >
                          {isEmergency ? 'Dépannage d’urgence' : 'Périmable < 90j'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                          {item.quantityBoxes} boîte{item.quantityBoxes > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-1.5">{item.brand}</h4>
                      {item.dci && <p className="text-xs text-muted-foreground">{item.dci}</p>}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePosting(item.id)}
                      className="size-7 text-muted-foreground hover:text-state-danger"
                      title="Supprimer mon annonce"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Détails logistiques & Péremption */}
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5 text-primary" />
                        <strong>{item.wilaya}</strong> ({item.commune})
                      </span>
                      <span className="font-semibold text-foreground/80">{item.pharmacyName}</span>
                    </div>

                    {item.daysUntilExpiry != null && (
                      <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          Péremption : {item.expiryDate}
                        </span>
                        <span>(~{item.daysUntilExpiry} jours restants)</span>
                      </div>
                    )}

                    {item.lotNumber && (
                      <div className="text-[11px] text-muted-foreground">
                        Lot : <span className="font-mono">{item.lotNumber}</span>
                      </div>
                    )}

                    <div className="text-[11px] pt-1 border-t border-border/40 flex items-center justify-between">
                      <span>Modalité :</span>
                      <strong className="text-foreground">
                        {item.transferMode === 'prix_coutant_ppa'
                          ? 'Prix coûtant PPA'
                          : item.transferMode === 'remise_confrere'
                          ? 'Remise confraternelle'
                          : item.transferMode === 'echange'
                          ? 'Échange à l’identique'
                          : 'Dépannage gracieux'}
                      </strong>
                    </div>
                  </div>

                  {item.note && (
                    <p className="text-xs text-foreground/80 italic leading-relaxed">
                      &laquo; {item.note} &raquo;
                    </p>
                  )}

                  {/* Actions de contact B2B direct */}
                  <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border/50">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <a href={telHref}>
                        <Phone className="size-3.5" />
                        Appeler
                      </a>
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold gap-1.5 border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/10"
                    >
                      <a href={waHref} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="size-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Note d'intégrité confraternelle */}
      <div className="p-4 rounded-xl border border-border/80 bg-muted/30 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
        <ShieldCheck className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div>
          <strong>Charte Confraternelle DzPharm :</strong> Les échanges entre officines sont régis par
          les règles de déontologie pharmaceutique algérienne. Les produits thermolabiles doivent
          impérativement avoir été conservés entre 2°C et 8°C. Les cessions de stupéfiants et substances vénéneuses
          sont strictement exclues de ce babillard.
        </div>
      </div>
    </div>
  )
}
