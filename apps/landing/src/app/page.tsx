import type { Metadata } from 'next';
import LandingPage from '../components/LandingPage';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import { buildLandingMetadata } from '../lib/metadata';

// Metadata is locale-driven (#563): the root layout already resolves
// the same metadata from the request locale, and this page-level
// generateMetadata keeps the home route's OG/Twitter/canonical values
// identical to the layout's (previously this file hard-coded English
// copy, a second description and a third tagline). Because the locale
// comes from request headers/cookies, this route renders dynamically
// instead of the former force-static export.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage();
  return buildLandingMetadata(locale);
}

export default function Page() {
  return <LandingPage />;
}
