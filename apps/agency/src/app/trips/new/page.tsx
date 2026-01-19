'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@ouiboo/ui';

export default function NewTripPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/trips/create');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm space-y-4">
        <h1 className="text-2xl font-bold text-deep-blue">Redirecting to the trip builder</h1>
        <p className="text-sm text-gray-600">
          We moved this flow to the new builder to keep everything in one place.
        </p>
        <Button asChild className="bg-deep-blue hover:bg-blue-900 text-white">
          <Link href="/dashboard/trips/create">Open Trip Builder</Link>
        </Button>
      </div>
    </div>
  );
}
