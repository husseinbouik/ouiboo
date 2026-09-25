'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';

export default function NewTripPage() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/trips/create');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{t('tripBuilder.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('tripBuilder.description')}
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/dashboard/trips/create">{t('tripBuilder.cta')}</Link>
        </Button>
      </div>
    </div>
  );
}
