export const TRANSITION_STANDARD = '200ms';

export const TRANSITION_SCHEME = {
  backgroundColor: 'background-color, border-color, color, fill, stroke',
  timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  duration: '200ms',
} as const;

/**
 * Shared motion tokens (Design Council 2026-11-24, M1/M8).
 * Durations/easings every app should use instead of ad-hoc values:
 * toast/dialog entrances use fast/standard, page/sheet transitions
 * slow, and nothing interactive exceeds slower. Pair with the
 * reduced-motion guard in tokens.css.
 */
export const MOTION_DURATIONS = {
  fast: '150ms',
  standard: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const MOTION_EASINGS = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const MOTION_TOKENS = {
  durations: MOTION_DURATIONS,
  easings: MOTION_EASINGS,
} as const;
