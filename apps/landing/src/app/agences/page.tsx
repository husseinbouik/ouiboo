import type { Metadata } from 'next';
import AgencesPage from '../../components/AgencesPage';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import { buildAgencesMetadata } from '../../lib/metadata';

// #749 (Council S11 §4): the dedicated agency page. Metadata is the
// S11 binding set — FR-first authored titles, per-locale canonical,
// hreflang en/fr/ar + x-default -> FR, and `index, follow` in every
// locale from day one (it does NOT follow the homepage's beta gate).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage();
  return buildAgencesMetadata(locale);
}

export default function Page() {
  return <AgencesPage />;
}
