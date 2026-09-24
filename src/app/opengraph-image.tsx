import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'DzPharm — Référentiel Pharmaceutique Algérien'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#090d16',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(14, 165, 233, 0.12) 0%, transparent 50%)',
          padding: '70px 80px',
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            }}
          >
            DZ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em', color: '#ffffff' }}>
              DzPharm
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Intelligence Pharmaceutique · Algérie
            </span>
          </div>
        </div>

        {/* Center Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              margin: 0,
            }}
          >
            Le Référentiel National des Médicaments &amp; Décision Clinique
          </h1>
          <p
            style={{
              fontSize: '24px',
              color: '#94a3b8',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Nomenclature MSPRH officielle, simulateur de remboursement Chifa, contrôle d&apos;interactions et posologies validées.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '30px',
              padding: '10px 22px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#34d399',
            }}
          >
            9 555 AMM Officielles
          </div>
          <div
            style={{
              backgroundColor: 'rgba(14, 165, 233, 0.12)',
              border: '1px solid rgba(14, 165, 233, 0.35)',
              borderRadius: '30px',
              padding: '10px 22px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#38bdf8',
            }}
          >
            Tarifs PPA &amp; Chifa
          </div>
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '30px',
              padding: '10px 22px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#fbbf24',
            }}
          >
            Sécurité Clinique &amp; Doses
          </div>
          <div
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '30px',
              padding: '10px 22px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#c084fc',
            }}
          >
            Copilote IA Assisté
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
