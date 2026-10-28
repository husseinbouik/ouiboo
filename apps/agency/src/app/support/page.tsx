'use client';

import { AgencySupportPage } from '@/components/AgencySupportPage';

/**
 * #556 rework: alias of the dashboard support page — the browser-witness
 * pass probed /support as well as /dashboard/support, and both rendered
 * "Page not found". The AgencyShell still guards this route (signed-in
 * agencies only), so the alias is safe to serve.
 */
export default function SupportAliasPage() {
  return <AgencySupportPage />;
}
