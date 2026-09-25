export const TRANSITION_STANDARD = '200ms';

export const TRANSITION_SCHEME = {
  backgroundColor: 'background-color, border-color, color, fill, stroke',
  timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  duration: '200ms',
} as const;

export const FLOAT_KEYFRAMES = `
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
}`;