import type { Metadata } from 'next';
import LandingPage from '../components/LandingPage';
import { fetchShowcaseCards } from '../lib/showcase';
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

export default async function Page() {
  // #771: live showcase selection — up to 3 trips from distinct
  // verified agencies, each with its own record dates; null falls
  // back to the static cards inside LandingPage.
  const showcaseCards = await fetchShowcaseCards();
  return <LandingPage showcaseCards={showcaseCards} />;
}
