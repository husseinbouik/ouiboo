import { ImageResponse } from 'next/og'

export const alt = 'Ouiboo — Travel experiences, made personal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ alignItems: 'center', background: 'linear-gradient(135deg, #071B33 0%, #143E63 60%, #0F766E 100%)', color: '#FFFFFF', display: 'flex', height: '100%', justifyContent: 'center', padding: '72px', position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '960px' }}>
          <div style={{ color: '#FF8A4C', display: 'flex', fontSize: 42, fontWeight: 800 }}>Ouiboo</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.05, marginTop: 36 }}>Travel experiences, made personal.</div>
          <div style={{ color: '#DCE8F2', display: 'flex', fontSize: 30, lineHeight: 1.35, marginTop: 32 }}>Discover memorable trips from local experts and book with confidence.</div>
        </div>
        <div style={{ background: '#FF8A4C', borderRadius: 999, bottom: 64, display: 'flex', height: 24, position: 'absolute', right: 72, width: 24 }} />
      </div>
    ),
    size,
  )
}
