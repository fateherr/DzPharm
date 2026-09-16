'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Barcode,
  Camera,
  CameraOff,
  CheckCircle2,
  Delete,
  Flashlight,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  SwitchCamera,
  X,
  Zap,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useDzPharm } from './store'
import { StatusBadge, formatPrice } from './status-badge'
import type { Drug } from './types'

function playScanBeep() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {
    /* Silencieux si audio non disponible ou bloqué */
  }
}

export function BarcodeScannerModal() {
  const scannerOpen = useDzPharm((s) => s.scannerOpen)
  const setScannerOpen = useDzPharm((s) => s.setScannerOpen)
  const openDrug = useDzPharm((s) => s.openDrug)
  const gotoDirectory = useDzPharm((s) => s.gotoDirectory)
  const { toast } = useToast()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Drug[] | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false)

  // Vérification de la disponibilité de BarcodeDetector
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setHasBarcodeDetector(true)
    }
  }, [])

  // Démarrage / Arrêt du flux caméra
  useEffect(() => {
    if (!scannerOpen || mode !== 'camera') {
      stopCamera()
      return
    }

    let isMounted = true

    async function startCamera() {
      stopCamera()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }

        setCameraActive(true)
        setHasCameraPermission(true)

        // Détecter si la torche est supportée
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack && typeof (videoTrack as unknown as { getCapabilities?: () => Record<string, unknown> }).getCapabilities === 'function') {
          const caps = (videoTrack as unknown as { getCapabilities: () => Record<string, unknown> }).getCapabilities()
          setHasTorch(Boolean(caps?.torch))
        }

        // Démarrer la boucle de détection
        startDetectionLoop()
      } catch (err) {
        if (!isMounted) return
        setCameraActive(false)
        setHasCameraPermission(false)
        setMode('manual')
      }
    }

    startCamera()

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [scannerOpen, mode, facingMode])

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setTorchOn(false)
  }

  async function toggleTorch() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const nextTorch = !torchOn
      await (track as MediaStreamTrack & {
        applyConstraints: (c: { advanced: Array<{ torch?: boolean }> }) => Promise<void>
      }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      })
      setTorchOn(nextTorch)
    } catch {
      /* torch non supporté */
    }
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  // Boucle de détection via BarcodeDetector API
  function startDetectionLoop() {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return

    type BarcodeDetectorType = new (opts?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>>
    }

    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorType }).BarcodeDetector
    const detector = new Detector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
    })

    let processing = false

    async function scanFrame() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(scanFrame)
        return
      }

      if (!processing && !isSearching) {
        processing = true
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue.trim()
            if (code && code !== lastScannedCode) {
              handleBarcodeIdentified(code)
              return
            }
          }
        } catch {
          /* trame suivante */
        } finally {
          processing = false
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame)
    }

    animFrameRef.current = requestAnimationFrame(scanFrame)
  }

  async function handleBarcodeIdentified(rawCode: string) {
    const clean = rawCode.trim()
    if (!clean) return
    setLastScannedCode(clean)
    playScanBeep()
    if (navigator.vibrate) navigator.vibrate([60, 40, 60])

    setIsSearching(true)
    setSearchResults(null)

    try {
      // Recherche de correspondance dans la nomenclature
      const res = await fetch(`/api/drugs?q=${encodeURIComponent(clean)}&limit=10`)
      if (!res.ok) throw new Error('Erreur de recherche')
      const data = (await res.json()) as { drugs: Drug[] }

      if (data.drugs && data.drugs.length === 1) {
        // Un seul médicament trouvé : ouverture directe
        const found = data.drugs[0]
        toast({
          title: 'Médicament scanné avec succès',
          description: `${found.brand} (${found.dci})`,
        })
        openDrug(found.id)
        setScannerOpen(false)
      } else if (data.drugs && data.drugs.length > 1) {
        // Plusieurs présentations correspondent
        setSearchResults(data.drugs)
      } else {
        // Aucune correspondance directe : tentative sur le catalogue
        const catRes = await fetch(`/api/catalog?q=${encodeURIComponent(clean)}&limit=5`)
        if (catRes.ok) {
          const catData = await catRes.json()
          if (catData.products && catData.products.length > 0) {
            // Afficher les résultats du catalogue ou le message
            toast({
              title: 'Code détecté dans le catalogue officinal',
              description: `${clean} — ${catData.products[0].name}`,
            })
          }
        }
        setSearchResults([])
      }
    } catch {
      toast({
        title: 'Erreur d\'identification',
        description: `Impossible de vérifier le code ${clean}.`,
        variant: 'destructive',
      })
    } finally {
      setIsSearching(false)
    }
  }

  function handleManualSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!manualCode.trim()) return
    handleBarcodeIdentified(manualCode.trim())
  }

  function handlePadInput(digit: string) {
    setManualCode((prev) => prev + digit)
  }

  function handlePadDelete() {
    setManualCode((prev) => prev.slice(0, -1))
  }

  function handlePadClear() {
    setManualCode('')
  }

  return (
    <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
      <DialogContent className="max-w-md sm:max-w-lg overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/80 bg-card/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Barcode className="size-5" aria-hidden />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Scanner Code Barre CBM / AMM
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Reconnaissance instantanée par caméra ou lecteur optique USB
                </DialogDescription>
              </div>
            </div>

            {/* Toggle Mode Caméra / Saisie manuelle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode('camera')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  mode === 'camera' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <Camera className="size-3.5" aria-hidden />
                <span>Caméra</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                  mode === 'manual' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground'
                }`}
              >
                <Barcode className="size-3.5" aria-hidden />
                <span>Clavier / Douchette</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Corps du Scanner */}
        <div className="p-4 space-y-4">
          {mode === 'camera' ? (
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-black flex items-center justify-center">
              {/* Vidéo du flux caméra */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Viseur / Cible de scan */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="relative w-64 h-40 border-2 border-primary/80 rounded-xl shadow-2xl overflow-hidden">
                    {/* Coins de cadrage */}
                    <div className="absolute top-0 left-0 size-4 border-t-4 border-l-4 border-primary" />
                    <div className="absolute top-0 right-0 size-4 border-t-4 border-r-4 border-primary" />
                    <div className="absolute bottom-0 left-0 size-4 border-b-4 border-l-4 border-primary" />
                    <div className="absolute bottom-0 right-0 size-4 border-b-4 border-r-4 border-primary" />

                    {/* Ligne laser animée */}
                    <div className="scanner-laser absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]" />
                  </div>
                  <p className="mt-3 text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Placez le code-barres EAN-13 ou Datamatrix dans le cadre
                  </p>
                </div>
              )}

              {/* État sans caméra ou permission refusée */}
              {hasCameraPermission === false && (
                <div className="p-6 text-center text-white space-y-3">
                  <CameraOff className="size-10 mx-auto text-destructive" />
                  <p className="text-sm font-semibold">Accès à la caméra non autorisé</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Veuillez autoriser l&apos;accès caméra dans votre navigateur, ou utilisez le mode Clavier / Douchette.
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setMode('manual')}>
                    Passer en saisie manuelle
                  </Button>
                </div>
              )}

              {/* Commandes Caméra flottantes */}
              {cameraActive && (
                <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleCamera}
                    className="size-8 rounded-full bg-black/60 text-white hover:bg-black/80"
                    title="Changer de caméra"
                  >
                    <SwitchCamera className="size-4" />
                  </Button>
                  {hasTorch && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleTorch}
                      className={`size-8 rounded-full ${
                        torchOn ? 'bg-amber-500 text-black' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title="Torche"
                    >
                      <Flashlight className="size-4" />
                    </Button>
                  )}
                </div>
              )}

              {/* Indicateur de chargement / recherche */}
              {isSearching && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Vérification de la nomenclature...</p>
                </div>
              )}
            </div>
          ) : (
            /* Mode Saisie Manuelle / Douchette USB */
            <div className="space-y-3">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Scanner au lecteur optique ou taper le code..."
                    className="pl-9 font-mono text-sm tracking-wider"
                    autoFocus
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
                <Button type="submit" disabled={!manualCode.trim() || isSearching}>
                  {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </form>

              {/* Clavier numérique rapide pour écran tactile comptoir */}
              <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                  Pavé tactile comptoir
                </p>
                <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <Button
                      key={digit}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePadInput(digit)}
                      className="h-10 text-base font-bold tabular-nums"
                    >
                      {digit}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePadClear}
                    className="h-10 text-xs font-semibold text-muted-foreground"
                  >
                    Effacer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePadInput('0')}
                    className="h-10 text-base font-bold tabular-nums"
                  >
                    0
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handlePadDelete}
                    className="h-10 text-xs text-muted-foreground"
                  >
                    <Delete className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Affichage des résultats multiples ou négatifs */}
          {searchResults !== null && (
            <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-foreground">
                    {searchResults.length} présentation(s) trouvée(s) :
                  </p>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/60">
                    {searchResults.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          openDrug(d.id)
                          setScannerOpen(false)
                        }}
                        className="w-full text-left py-2 px-1 hover:bg-muted/50 rounded flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-foreground">{d.brand}</p>
                          <p className="text-muted-foreground">{d.dci} {d.dosage ? `· ${d.dosage}` : ''}</p>
                        </div>
                        <StatusBadge status={d.status} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Aucun produit associé au code <span className="font-mono font-bold text-foreground">{lastScannedCode}</span>.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setScannerOpen(false)
                      gotoDirectory({ q: lastScannedCode || '' })
                    }}
                    className="text-xs"
                  >
                    Rechercher dans le répertoire
                  </Button>
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Compatible avec les codes EAN-13, codes CIP, DataMatrix et lecteurs code-barres USB officinaux.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
