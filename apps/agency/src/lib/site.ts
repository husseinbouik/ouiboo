/**
 * The traveller app's public origin. Agency share actions (#468) link to
 * the public traveller-facing trip pages, so the agency app needs the same
 * base URL the traveller app uses for its canonical links.
 *
 * The loopback default is for local development only. Unlike the traveller
 * app, this origin cannot be derived from the agency app's own deployment
 * host, so NEXT_PUBLIC_TRAVELER_URL must be set on the agency project in
 * deployed environments (it is, on staging). If it is ever missing there,
 * ShareTripButton resolves no share base and renders nothing rather than
 * emitting a localhost link (#468, founder report 2026-10-27).
 */
export const TRAVELER_URL = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001';
