import { OG_IMAGE_SIZE, renderOgImage } from '../lib/og-image'
import { SITE_COPY } from '../lib/site'

// #563: palette colours (#FF6B35, deep-blue ground — no off-palette
// #FF8A4C/teal), the pin mark, and the ONE canonical tagline shared
// with the OG tags and email. Locale-specific previews are served by
// the locale-carrying route at /og-image?lang=<locale>; this static
// convention image renders the default locale.
export const alt = SITE_COPY.en.title
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return renderOgImage('en')
}
