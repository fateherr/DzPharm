import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Route de synchronisation hors-ligne DzPharm (W8-01 True Offline PWA)
 * Fournit des lots paginés de spécialités pharmaceutiques actives
 * pour pré-remplir la base IndexedDB locale du navigateur.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const limit = Math.min(2500, Math.max(50, parseInt(sp.get('limit') || '1000', 10) || 1000))
    const offset = Math.max(0, parseInt(sp.get('offset') || '0', 10) || 0)
    const status = sp.get('status') || 'ACTIF'

    const where = status === 'ALL' ? {} : { status }

    const [total, rawDrugs] = await Promise.all([
      db.drug.count({ where }),
      db.drug.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ brandKey: 'asc' }],
        select: {
          id: true,
          regNumber: true,
          dci: true,
          dciKey: true,
          brand: true,
          form: true,
          dosage: true,
          packaging: true,
          lab: true,
          country: true,
          liste: true,
          p1: true,
          p2: true,
          type: true,
          statut: true,
          status: true,
          domain: true,
          domains: true,
          regDateInitial: true,
          regDateFinal: true,
          barcode: true,
        },
      }),
    ])

    const drugs = rawDrugs.map((d) => ({
      id: d.id,
      regNumber: d.regNumber ?? '',
      dci: d.dci ?? '',
      dciKey: d.dciKey ?? '',
      brand: d.brand ?? '',
      form: d.form ?? '',
      dosage: d.dosage ?? '',
      packaging: d.packaging ?? '',
      lab: d.lab ?? '',
      country: d.country ?? '',
      liste: d.liste ?? '',
      p1: d.p1 ?? '',
      p2: d.p2 ?? '',
      type: d.type ?? '',
      statut: d.statut ?? '',
      status: (d.status as 'ACTIF' | 'NON_RENOUVELE' | 'RETRIE') || 'ACTIF',
      domain: d.domain ?? '',
      domains: d.domains ? (() => {
        try {
          const parsed = JSON.parse(d.domains)
          return Array.isArray(parsed) ? parsed : [d.domain ?? '']
        } catch {
          return [d.domain ?? '']
        }
      })() : [d.domain ?? ''],
      regDateInitial: d.regDateInitial ?? null,
      regDateFinal: d.regDateFinal ?? null,
      barcode: d.barcode ?? null,
    }))

    const hasMore = offset + drugs.length < total

    return NextResponse.json({
      success: true,
      drugs,
      total,
      offset,
      limit,
      count: drugs.length,
      hasMore,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Offline Sync API Error]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la synchronisation de la base hors-ligne' },
      { status: 500 }
    )
  }
}
