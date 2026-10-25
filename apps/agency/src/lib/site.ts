/**
 * The traveller app's public origin. Agency share actions (#468) link to
 * the public traveller-facing trip pages, so the agency app needs the same
 * base URL the traveller app uses for its canonical links.
 */
export const TRAVELER_URL = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001';
