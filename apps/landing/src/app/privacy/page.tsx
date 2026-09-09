import type { Metadata } from 'next';
import Link from 'next/link';

import { CookiePreferencesButton } from '../../components/AnalyticsConsent';

export const metadata: Metadata = {
  title: 'Privacy notice',
  description: 'How Ouiboo handles account, waitlist, booking, and website usage data.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fffaf4] px-6 py-16 text-[#07152f] sm:py-24">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          ← Back to Ouiboo
        </Link>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Privacy notice</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: September 9, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-[#07152f]">Information we process</h2>
            <p className="mt-2">Ouiboo processes information you provide when joining the waitlist, creating an account, managing an agency, publishing a trip, making a booking, contacting support, or completing a payment workflow. This can include identity and contact details, agency information, booking records, and transaction references.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#07152f]">Why we use it</h2>
            <p className="mt-2">We use this information to provide and secure the marketplace, fulfill bookings, communicate service updates, prevent abuse, meet legal obligations, and improve the product. We do not sell personal information.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#07152f]">Optional analytics</h2>
            <p className="mt-2">Website analytics are disabled unless you choose to allow them. You can change that choice at any time. Language and security-related storage may still be used because it is necessary to provide the site.</p>
            <CookiePreferencesButton className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50" />
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#07152f]">Sharing and retention</h2>
            <p className="mt-2">Information is shared only with service providers and marketplace participants when needed to operate the requested service, or when required by law. Records are retained only as long as needed for service, security, accounting, dispute resolution, and legal purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-[#07152f]">Your choices</h2>
            <p className="mt-2">Depending on applicable law, you may ask to access, correct, delete, restrict, or export your personal information, or object to certain processing. Use the contact channel shown in your Ouiboo account or service emails to submit a privacy request.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
