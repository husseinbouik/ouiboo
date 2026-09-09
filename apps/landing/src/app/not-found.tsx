import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-orange-400">404 · Ouiboo</p>
        <h1 className="mt-4 text-3xl font-bold">This page is off the itinerary</h1>
        <p className="mt-3 text-slate-300">The address may have changed or the page may no longer be available.</p>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-bold text-white transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
          Return home
        </Link>
      </div>
    </main>
  )
}
