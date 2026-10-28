import { ImageResponse } from 'next/og'
import { SITE_COPY } from '@/lib/site'

export const alt = 'Ouiboo — Travel made personal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/**
 * #563 traveller remainder (mirrors the landing renderer, PR #590):
 * palette colours only — deep blue #0A192F ground, sunset orange
 * #FF6B35 accents (the previous image used off-palette #FF8A4C and a
 * teal gradient stop) — the adopted pin mark (same geometry as
 * packages/ui/Logo), and the ONE canonical tagline from SITE_COPY.
 * This static route renders the default (en) copy; the layout metadata
 * carries the locale-driven og:locale / title / description.
 */
export default function OpenGraphImage() {
  const copy = SITE_COPY.en
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
            <svg width="84" height="84" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#0A192F" stroke="#F7E1C3" strokeWidth="0.75" />
              <path
                d="M16 8C11.5817 8 8 11.5817 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 11.5817 20.4183 8 16 8ZM16 22C12.6863 22 10 19.3137 10 16C10 12.6863 12.6863 10 16 10C19.3137 10 22 12.6863 22 16C22 19.3137 19.3137 22 16 22Z"
                fill="white"
              />
              <path
                d="M16 21.4C15.3 19.8 12.6 17.9 12.6 14.8A3.4 3.4 0 1 1 19.4 14.8C19.4 17.9 16.7 19.8 16 21.4Z"
                fill="#FF6B35"
              />
              <circle cx="16" cy="14.8" r="1.5" fill="#0A192F" />
            </svg>
            <div style={{ color: '#FF6B35', display: 'flex', fontSize: 42, fontWeight: 800 }}>Ouiboo</div>
          </div>
          <div style={{ display: 'flex', fontSize: 74, fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.05, marginTop: 36 }}>
            {copy.tagline}.
          </div>
          <div style={{ color: '#DCE8F2', display: 'flex', fontSize: 30, lineHeight: 1.35, marginTop: 32 }}>
            {copy.description}
          </div>
        </div>
        <div style={{ background: '#FF6B35', borderRadius: 999, bottom: 64, display: 'flex', height: 24, position: 'absolute', right: 72, width: 24 }} />
      </div>
    ),
    size,
  )
}
