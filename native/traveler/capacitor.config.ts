import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Ouiboo traveller native shell (#782) — STAGING wrapper.
 *
 * The shell loads the already-deployed traveller web app; it ships no
 * web code of its own (`www/` is only the offline fallback page shown
 * when the remote app cannot be reached).
 *
 * Before any production store build, change `server.url` to the
 * production traveller origin and re-run `npx cap sync`. Never point a
 * store build at staging.
 */
const config: CapacitorConfig = {
  appId: 'ma.ouiboo.traveler',
  appName: 'Ouiboo',
  webDir: 'www',
  server: {
    url: 'https://ouiboo-traveler-staging.vercel.app',
    // The staging origin is HTTPS only, so no cleartext traffic is
    // permitted anywhere in the shell.
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
