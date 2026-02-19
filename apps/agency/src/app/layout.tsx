import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import "@/lib/i18n";
import { AgencyShell } from "@/components/AgencyShell";
import { TrialBanner } from "@/components/TrialBanner";

export const metadata: Metadata = {
  title: "Ouiboo Agency",
  description: "Agency portal for Ouiboo",
};

// Force dynamic rendering for all pages - prevents i18n HTTP backend
// from hanging during static generation (no server to fetch translations from)
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-muted/20" suppressHydrationWarning>
        <Providers>
          <AgencyShell>
            {children}
          </AgencyShell>
          <TrialBanner />
        </Providers>
      </body>
    </html>
  );
}
