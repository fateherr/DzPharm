'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Barcode,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Lock,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useDzPharm } from './store'
import type { Drug } from './types'

// Bip sonore pour retour de scan
function playScanBeep(success = true) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = success ? 880 : 330
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (success ? 0.15 : 0.3))
    osc.start()
    osc.stop(ctx.currentTime + (success ? 0.15 : 0.3))
  } catch {
    // Ignored if AudioContext is not allowed
  }
}

export function AdminBarcodeModal() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const open = useDzPharm((s) => s.adminBarcodeModalOpen)
  const setOpen = useDzPharm((s) => s.setAdminBarcodeModalOpen)
  const targetDrugId = useDzPharm((s) => s.adminTargetDrugId)
  const setTargetDrugId = useDzPharm((s) => s.setAdminTargetDrugId)
  const isBotanique = useDzPharm((s) => s.designMode === 'botanique')
  const isAdminAuthenticated = useDzPharm((s) => s.isAdminAuthenticated)
  const setIsAdminAuthenticated = useDzPharm((s) => s.setIsAdminAuthenticated)

  // Auth states
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Tab & Binder states
  const [activeTab, setActiveTab] = useState<'bind' | 'registry'>('bind')
  const [drugSearch, setDrugSearch] = useState('')
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [noteInput, setNoteInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictDrug, setConflictDrug] = useState<{ id: number; brand: string; dosage: string } | null>(null)

  // Registry filter states
  const [registryFilter, setRegistryFilter] = useState<'all' | 'without_barcode' | 'with_barcode'>('all')
  const [registryQuery, setRegistryQuery] = useState('')
  const [registryPage, setRegistryPage] = useState(1)

  // Camera scanner states
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // 1. Check if already authenticated on mount
  useEffect(() => {
    if (!open) return
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdminAuthenticated(true)
        }
      })
      .catch(() => {})
  }, [open, setIsAdminAuthenticated])

  // 2. Load target drug when opened with specific drugId
  useEffect(() => {
    if (targetDrugId && open) {
      fetch(`/api/drugs/${targetDrugId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.drug) {
            setSelectedDrug(data.drug)
            if (data.drug.barcode) {
              setBarcodeInput(data.drug.barcode)
            }
          }
        })
        .catch(() => {})
    }
  }, [targetDrugId, open])

  // 3. Drug search for autocomplete
  const { data: searchResults, isFetching: isSearchingDrugs } = useQuery({
    queryKey: ['admin-drug-search', drugSearch],
    queryFn: async () => {
      if (!drugSearch.trim() || drugSearch.length < 2) return []
      const res = await fetch(`/api/drugs?q=${encodeURIComponent(drugSearch.trim())}&limit=10`)
      if (!res.ok) return []
      const d = await res.json()
      return (d.drugs || []) as Drug[]
    },
    enabled: drugSearch.trim().length >= 2,
    staleTime: 30000,
  })

  // 4. Registry list query
  const {
    data: registryData,
    isLoading: isLoadingRegistry,
    refetch: refetchRegistry,
  } = useQuery({
    queryKey: ['admin-barcodes-registry', registryFilter, registryQuery, registryPage],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/barcodes?filter=${registryFilter}&q=${encodeURIComponent(registryQuery)}&page=${registryPage}&limit=20`
      )
      if (!res.ok) throw new Error('Impossible de charger le registre')
      return res.json()
    },
    enabled: open && isAdminAuthenticated,
    staleTime: 5000,
  })

  // Authenticate Admin
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setAuthError('Veuillez saisir le mot de passe administrateur')
      return
    }
    setAuthError('')
    setIsLoggingIn(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setIsAdminAuthenticated(true)
        setPassword('')
        toast({
          title: 'Accès Administrateur validé',
          description: 'Module d’intégration des codes-barres déverrouillé.',
        })
      } else {
        const d = await res.json()
        setAuthError(d.error || 'Mot de passe incorrect')
        playScanBeep(false)
      }
    } catch {
      setAuthError('Erreur de communication avec le serveur')
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Logout Admin
  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setIsAdminAuthenticated(false)
    stopCamera()
    toast({
      title: 'Session admin verrouillée',
      description: 'Déconnexion réussie.',
    })
  }

  // Camera Barcode Scanning Loop
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      })
      streamRef.current = stream
      setCameraActive(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      if ('BarcodeDetector' in window) {
        type BarcodeDetectorType = new (opts?: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
        }
        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorType }).BarcodeDetector
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'data_matrix', 'qr_code'],
        })

        const scanLoop = async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const detected = barcodes[0].rawValue.trim()
                setBarcodeInput(detected)
                playScanBeep(true)
                toast({
                  title: 'Code-barres scanné',
                  description: detected,
                })
                stopCamera()
                return
              }
            } catch {
              // ignore frame error
            }
          }
          animFrameRef.current = requestAnimationFrame(scanLoop)
        }
        animFrameRef.current = requestAnimationFrame(scanLoop)
      }
    } catch {
      toast({
        title: 'Accès caméra refusé',
        description: 'Veuillez autoriser la caméra ou saisir le code manuellement.',
        variant: 'destructive',
      })
    }
  }

  function stopCamera() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Submit Barcode Binding
  async function handleAssignBarcode(force = false) {
    if (!selectedDrug) {
      toast({
        title: 'Sélection requise',
        description: 'Veuillez sélectionner un médicament dans la liste.',
        variant: 'destructive',
      })
      return
    }

    const clean = barcodeInput.replace(/[\s\-_]/g, '').trim()
    if (!clean || clean.length < 5) {
      toast({
        title: 'Code-barres invalide',
        description: 'Veuillez renseigner un code-barres valide (min. 5 caractères).',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setConflictDrug(null)

    try {
      const res = await fetch('/api/admin/barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drugId: selectedDrug.id,
          barcode: clean,
          note: noteInput.trim() || undefined,
          force,
        }),
      })

      const data = await res.json()

      if (res.status === 409 && data.conflict) {
        setConflictDrug(data.existingDrug)
        playScanBeep(false)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’association')
      }

      playScanBeep(true)
      toast({
        title: 'Association réussie !',
        description: `Le code-barres ${clean} est maintenant lié à ${selectedDrug.brand}.`,
      })

      // Invalidate queries so entire app sees the new barcode instantly
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['admin-barcodes-registry'] })
      refetchRegistry()

      // Reset form or keep selected drug updated
      if (data.drug) {
        setSelectedDrug(data.drug)
      }
      setBarcodeInput('')
      setNoteInput('')
    } catch (err: unknown) {
      toast({
        title: 'Échec de l’opération',
        description: err instanceof Error ? err.message : 'Erreur inconnue',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dissociate barcode
  async function handleDissociate(barcode: string, drugId: number) {
    if (!confirm(`Confirmez-vous la dissociation du code-barres ${barcode} ?`)) return

    try {
      const res = await fetch(`/api/admin/barcodes?barcode=${encodeURIComponent(barcode)}&drugId=${drugId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erreur')
      }

      toast({
        title: 'Code-barres dissocié',
        description: `Le code ${barcode} a été retiré.`,
      })

      queryClient.invalidateQueries({ queryKey: ['admin-barcodes-registry'] })
      refetchRegistry()

      if (selectedDrug && selectedDrug.id === drugId) {
        setSelectedDrug({
          ...selectedDrug,
          barcode: null,
          drugBarcodes: (selectedDrug.drugBarcodes || []).filter((b) => b.barcode !== barcode),
        })
      }
    } catch (err: unknown) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Impossible de dissocier',
        variant: 'destructive',
      })
    }
  }

  function handleClose() {
    stopCamera()
    setOpen(false)
    setTargetDrugId(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : setOpen(true))}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl">
        {/* En-tête de la modale */}
        <div
          className={cn(
            'flex items-center justify-between px-6 py-4 border-b',
            isBotanique
              ? 'border-[#2d6a4f]/20 bg-[#1b4332]/10 text-[#1b4332] dark:text-[#34d399]'
              : 'border-border/60 bg-muted/40'
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Barcode className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>Espace Administrateur · Codes-Barres Originaux</span>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                  Usage Admin
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Intégration et association des codes-barres physiques (EAN-13 / GTIN) aux médicaments du référentiel
              </DialogDescription>
            </div>
          </div>

          {isAdminAuthenticated && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              title="Verrouiller la session admin"
            >
              <Lock className="size-3.5" />
              <span className="hidden sm:inline">Verrouiller</span>
            </Button>
          )}
        </div>

        {/* CONTENU PRINCIPAL */}
        {!isAdminAuthenticated ? (
          /* ========================================================
             ÉCRAN DE CONNEXION / VERROUILLAGE ADMIN
             ======================================================== */
          <div className="p-8 sm:p-12 max-w-md mx-auto text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-md mb-5">
              <ShieldCheck className="size-7" />
            </div>

            <h3 className="text-lg font-bold text-foreground">Accès Administrateur Protégé</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Ce module permet d’intégrer et de lier de nouveaux codes-barres commerciaux officiels dans la base nationale. Veuillez saisir votre mot de passe d’administration.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Mot de passe Administrateur
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoFocus
                    className="pr-10 h-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full h-10 gap-2 font-semibold text-xs shadow-md cursor-pointer"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Vérification…</span>
                  </>
                ) : (
                  <>
                    <Unlock className="size-4" />
                    <span>Déverrouiller la Console</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          /* ========================================================
             CONSOLE D'ADMINISTRATION COMPLÈTE
             ======================================================== */
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bind' | 'registry')} className="w-full">
            {/* Barre de navigation interne */}
            <div className="flex items-center justify-between border-b px-6 py-2 bg-muted/20">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="bind" className="gap-2 text-xs font-medium cursor-pointer">
                  <Link2 className="size-3.5" />
                  <span>Associer un Code-Barres</span>
                </TabsTrigger>
                <TabsTrigger value="registry" className="gap-2 text-xs font-medium cursor-pointer">
                  <Package className="size-3.5" />
                  <span>Registre &amp; Couverture</span>
                </TabsTrigger>
              </TabsList>

              {registryData?.stats && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">
                    Couverture : <strong className="text-foreground">{registryData.stats.withBarcodeCount}</strong> / {registryData.stats.totalDrugs} ({registryData.stats.coveragePercent}%)
                  </span>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                    {registryData.stats.totalBarcodesRegistered} codes indexés
                  </Badge>
                </div>
              )}
            </div>

            {/* TAB 1: FAST BINDER */}
            <TabsContent value="bind" className="p-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Étape 1 : Médicament ciblé */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">1</span>
                      <span>Médicament à associer</span>
                    </h4>
                    {selectedDrug && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrug(null)
                          setBarcodeInput('')
                        }}
                        className="text-[11px] text-primary hover:underline cursor-pointer"
                      >
                        Changer de médicament
                      </button>
                    )}
                  </div>

                  {!selectedDrug ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          value={drugSearch}
                          onChange={(e) => setDrugSearch(e.target.value)}
                          placeholder="Rechercher par marque (ex: Artiz, Augmentin, Doliprane…)"
                          className="pl-9 h-10 text-xs"
                          autoFocus
                        />
                        {isSearchingDrugs && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-primary animate-spin" />
                        )}
                      </div>

                      {/* Liste des suggestions de médicaments */}
                      {searchResults && searchResults.length > 0 && (
                        <div className="max-h-60 overflow-y-auto rounded-xl border border-border/80 bg-card p-1 shadow-md space-y-1">
                          {searchResults.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDrug(d)
                                if (d.barcode) setBarcodeInput(d.barcode)
                                setDrugSearch('')
                              }}
                              className="flex w-full items-start justify-between p-2.5 rounded-lg text-left hover:bg-muted/70 transition-colors cursor-pointer group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                    {d.brand}
                                  </span>
                                  {d.dosage && (
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">
                                      {d.dosage}
                                    </span>
                                  )}
                                  {d.packaging && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {d.packaging}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  {d.dci} · <span className="italic">{d.lab}</span>
                                </div>
                              </div>
                              {d.barcode ? (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] shrink-0 font-mono">
                                  {d.barcode}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-[9px] shrink-0">
                                  Sans code
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Carte du médicament sélectionné */
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">{selectedDrug.brand}</h3>
                            {selectedDrug.dosage && (
                              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                                {selectedDrug.dosage}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{selectedDrug.dci}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          AMM : {selectedDrug.regNumber || 'N/A'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-primary/15 pt-2">
                        <div>
                          <span className="text-muted-foreground text-[11px]">Forme &amp; Cond. :</span>
                          <p className="font-medium text-foreground">{selectedDrug.form} ({selectedDrug.packaging})</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[11px]">Laboratoire :</span>
                          <p className="font-medium text-foreground truncate">{selectedDrug.lab}</p>
                        </div>
                      </div>

                      {/* Codes déjà associés */}
                      {selectedDrug.drugBarcodes && selectedDrug.drugBarcodes.length > 0 && (
                        <div className="border-t border-primary/15 pt-2">
                          <span className="text-muted-foreground text-[11px] block mb-1.5">Codes-barres déjà liés :</span>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedDrug.drugBarcodes.map((b) => (
                              <span
                                key={b.barcode}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-mono font-semibold text-emerald-800 dark:text-emerald-300"
                              >
                                <Barcode className="size-3" />
                                <span>{b.barcode}</span>
                                {b.note && <span className="text-[10px] font-sans text-muted-foreground">({b.note})</span>}
                                <button
                                  type="button"
                                  onClick={() => handleDissociate(b.barcode, selectedDrug.id)}
                                  className="ml-1 text-destructive/70 hover:text-destructive cursor-pointer"
                                  title="Supprimer ce code"
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Étape 2 : Numérisation & Saisie du code */}
                <div className="lg:col-span-6 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">2</span>
                    <span>Code-barres original de la boîte</span>
                  </h4>

                  <div className="space-y-3">
                    {/* Scanner caméra live */}
                    {cameraActive ? (
                      <div className="relative rounded-xl overflow-hidden border border-primary/40 bg-black aspect-video flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                        <div className="absolute inset-0 border-2 border-dashed border-primary/60 m-8 rounded-lg pointer-events-none" />
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[11px] px-2 py-1 rounded backdrop-blur">
                          Pointez le code-barres de la boîte
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={stopCamera}
                          className="absolute bottom-3 right-3 text-xs h-8 cursor-pointer"
                        >
                          Arrêter la caméra
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={startCamera}
                        className="w-full h-11 border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <Camera className="size-4" />
                        <span>Activer le scanner caméra pour numériser la boîte</span>
                      </Button>
                    )}

                    {/* Saisie manuelle / douchette laser */}
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-1 block">
                        Code-barres EAN-13 / GTIN / Datamatrix
                      </label>
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAssignBarcode()
                            }
                          }}
                          placeholder="Ex: 6131234567890 (ou scan douchette)"
                          className="pl-9 h-10 font-mono text-sm tracking-wider"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        Compatible douchettes laser USB/Bluetooth et saisie clavier instantanée.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Note sur le conditionnement (optionnel)
                      </label>
                      <Input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Ex: Boîte de 10, Flacon 125ml, Nouveau packaging…"
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Alerte Conflit si le code est déjà chez un autre médicament */}
                    {conflictDrug && (
                      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                        <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                          <div>
                            <strong>Attention : Code déjà attribué !</strong>
                            <p className="mt-0.5 text-[11px]">
                              Ce code est actuellement rattaché à « {conflictDrug.brand} {conflictDrug.dosage} ». Voulez-vous réassigner ce code à {selectedDrug?.brand} ?
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setConflictDrug(null)} className="h-7 text-xs">
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAssignBarcode(true)}
                            className="h-7 text-xs cursor-pointer"
                          >
                            Forcer la réassignation
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Bouton de validation */}
                    <Button
                      type="button"
                      disabled={!selectedDrug || !barcodeInput.trim() || isSubmitting}
                      onClick={() => handleAssignBarcode(false)}
                      className="w-full h-10 gap-2 font-semibold text-xs shadow-md mt-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Enregistrement…</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-4" />
                          <span>Lier le Code-Barres au Médicament</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: REGISTRY & COVERAGE */}
            <TabsContent value="registry" className="p-6 m-0 focus-visible:outline-none">
              <div className="space-y-4">
                {/* Filtres & Recherche */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    <Button
                      variant={registryFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setRegistryFilter('all')
                        setRegistryPage(1)
                      }}
                      className="text-xs h-8 cursor-pointer"
                    >
                      Tous ({registryData?.stats?.totalDrugs || '9 555'})
                    </Button>
                    <Button
                      variant={registryFilter === 'without_barcode' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setRegistryFilter('without_barcode')
                        setRegistryPage(1)
                      }}
                      className="text-xs h-8 cursor-pointer gap-1.5"
                    >
                      <ShieldAlert className="size-3.5 text-amber-500" />
                      <span>Sans code-barres</span>
                    </Button>
                    <Button
                      variant={registryFilter === 'with_barcode' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setRegistryFilter('with_barcode')
                        setRegistryPage(1)
                      }}
                      className="text-xs h-8 cursor-pointer gap-1.5"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                      <span>Avec code-barres ({registryData?.stats?.withBarcodeCount || 0})</span>
                    </Button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      value={registryQuery}
                      onChange={(e) => {
                        setRegistryQuery(e.target.value)
                        setRegistryPage(1)
                      }}
                      placeholder="Filtrer par marque, labo, code…"
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Tableau du registre */}
                <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-muted/60 sticky top-0 z-10 border-b border-border/70">
                        <tr>
                          <th className="p-2.5 font-semibold text-muted-foreground">Médicament &amp; Dosage</th>
                          <th className="p-2.5 font-semibold text-muted-foreground hidden sm:table-cell">N° AMM &amp; Labo</th>
                          <th className="p-2.5 font-semibold text-muted-foreground">Codes-Barres Originaux</th>
                          <th className="p-2.5 font-semibold text-muted-foreground text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {isLoadingRegistry ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                              <span>Chargement du registre…</span>
                            </td>
                          </tr>
                        ) : registryData?.drugs && registryData.drugs.length > 0 ? (
                          registryData.drugs.map((d: Drug) => (
                            <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                              <td className="p-2.5">
                                <div className="font-bold text-foreground">{d.brand}</div>
                                <div className="text-[11px] text-muted-foreground">{d.dci} {d.dosage ? `(${d.dosage})` : ''}</div>
                              </td>
                              <td className="p-2.5 hidden sm:table-cell">
                                <div className="font-mono text-[11px]">{d.regNumber || '—'}</div>
                                <div className="text-[10px] text-muted-foreground truncate max-w-40">{d.lab}</div>
                              </td>
                              <td className="p-2.5">
                                {d.drugBarcodes && d.drugBarcodes.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {d.drugBarcodes.map((b) => (
                                      <Badge key={b.barcode} variant="outline" className="font-mono text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                        {b.barcode}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">Non renseigné</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedDrug(d)
                                    setActiveTab('bind')
                                  }}
                                  className="h-7 text-xs text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                                >
                                  <Plus className="size-3.5" />
                                  <span>Associer</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              Aucun médicament trouvé pour ces critères.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination footer */}
                  {registryData?.pagination && registryData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t bg-muted/30 text-xs text-muted-foreground">
                      <span>
                        Page {registryData.pagination.page} sur {registryData.pagination.totalPages} ({registryData.pagination.totalMatches} résultats)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={registryPage <= 1}
                          onClick={() => setRegistryPage((p) => Math.max(1, p - 1))}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={registryPage >= registryData.pagination.totalPages}
                          onClick={() => setRegistryPage((p) => p + 1)}
                          className="h-7 text-xs cursor-pointer"
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
