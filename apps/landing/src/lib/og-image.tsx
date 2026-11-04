import { ImageResponse } from 'next/og'
import type { SupportedLanguage } from '@ouiboo/i18n/server'
import { SITE_COPY } from './site'

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

/**
 * Shared OG image renderer (#563). Palette colours only — deep blue
 * #0A192F ground, sunset orange #FF6B35 accents (the previous image used
 * off-palette #FF8A4C and a teal gradient stop) — and the final app-tile
 * mark (#794: Route-End symbol on the navy tile, same geometry as the
 * tile master in `packages/ui/Logo`). Copy comes from SITE_COPY so the
 * image, the OG tags and the email tagline all say the same sentence
 * per locale.
 */
export function renderOgImage(locale: SupportedLanguage) {
  const copy = SITE_COPY[locale]
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0A192F 0%, #112240 65%, #0A192F 100%)',
          color: '#FFFFFF',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '960px' }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: '20px' }}>
            <svg width="84" height="84" viewBox="0 0 120 120" fill="none">
              <rect x="8" y="8" width="104" height="104" rx="27" fill="#0A192F" stroke="#F7E1C3" strokeWidth="2.5" />
              <g transform="translate(10.8 10.8) scale(0.82)">
                <path d="M 86.41 54.39 A 27.0 27.0 0 1 1 41.24 40.58" fill="none" stroke="#FFFFFF" strokeWidth="17" strokeLinecap="butt" />
                <path d="M 44.13 38.16 A 27.0 27.0 0 0 1 68.34 34.32" fill="none" stroke="#FF6B35" strokeWidth="17" strokeLinecap="butt" />
                <circle cx="80.68" cy="42.64" r="9.25" fill="#FF6B35" />
              </g>
            </svg>
            <div style={{ color: '#FF6B35', display: 'flex', fontSize: 42, fontWeight: 800 }}>
              Ouiboo
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: '-3px',
              lineHeight: 1.05,
              marginTop: 36,
            }}
          >
            {copy.tagline}.
          </div>
          <div style={{ color: '#DCE8F2', display: 'flex', fontSize: 30, lineHeight: 1.35, marginTop: 32 }}>
            {copy.description}
          </div>
        </div>
        <div
          style={{
            background: '#FF6B35',
            borderRadius: 999,
            bottom: 64,
            display: 'flex',
            height: 24,
            position: 'absolute',
            right: 72,
            width: 24,
          }}
        />
      </div>
    ),
    OG_IMAGE_SIZE,
  )
}
