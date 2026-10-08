import type { Metadata } from 'next';
import LandingPage from '../components/LandingPage';

// Static generation: the landing page is fully static marketing content.
// All interactivity lives in the <LandingPage /> client component.
export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ouiboo.vercel.app';
  const title = 'Ouiboo — Travel experiences, made personal';
  const description =
    'Discover handpicked trips across Morocco and beyond. Book unique travel experiences with verified local agencies.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: 'Ouiboo',
      type: 'website',
      images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'Ouiboo' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: { canonical: siteUrl },
  };
}

export default function Page() {
  return <LandingPage />;
}
