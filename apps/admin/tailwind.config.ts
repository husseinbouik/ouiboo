import type { Config } from 'tailwindcss'

const config: Config = {
  // Phase 5 (Design Council 2026-11-24, verdict #21): admin was the only
  // app not loading the shared UI preset — traveler/agency both do.
  // Mirroring them aligns admin's token colours, radii and focus-visible
  // component styling with the rest of the product.
  presets: [require('../../packages/ui/tailwind-preset.js')],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
