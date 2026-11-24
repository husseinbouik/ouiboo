/**
 * Canonical brand palette. These values MUST match `tokens.css`.
 * Import via `@ouiboo/tokens` or `@ouiboo/tokens/colors`.
 */
export const brandColors = {
  deepBlue: '#0A192F',
  sunsetOrange: '#FF6B35',
  sand: '#F7E1C3',
  ocean: '#2EC4B6',
  /* Sky accent for charts only - NOT the ocean brand colour (#2EC4B6). */
  cyan500: '#0EA5E9',
  offWhite: '#F9FAFB',
} as const;

export const brandScale = {
  50: '#FFF7ED',
  100: '#FFEDD5',
  200: '#FED7AA',
  300: '#FDBA74',
  400: '#FB923C',
  500: '#FF6B35',
  600: '#EA580C',
  700: '#C2410C',
  800: '#9A3412',
  900: '#7C2D12',
} as const;

export const navyScale = {
  50: '#EFF6FF',
  500: '#0A192F',
  700: '#0F245F',
  900: '#07152F',
} as const;

export const oceanScale = {
  50: '#E6FAF7',
  100: '#C8F3EE',
  200: '#92E7DD',
  300: '#5ED6C9',
  400: '#3ACBBC',
  500: '#2EC4B6',
  600: '#1FA396',
  700: '#178276',
  800: '#14665E',
  900: '#0F4F49',
} as const;