export default function TravelerLoading() {
  return (
    <div
      className="mx-auto min-h-[70vh] max-w-7xl animate-pulse space-y-8 px-4 py-10 sm:px-6 lg:px-8"
      role="status"
      aria-label="Loading page"
    >
      <div className="space-y-3">
        <div className="h-4 w-28 rounded-full bg-muted" />
        <div className="h-10 w-full max-w-xl rounded-xl bg-muted" />
        <div className="h-5 w-full max-w-2xl rounded-lg bg-muted/70" />
      </div>
      <div className="h-28 rounded-3xl bg-muted/80" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-border bg-card"
          >
            <div className="aspect-[16/10] bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 rounded bg-muted" />
              <div className="h-4 w-full rounded bg-muted/70" />
              <div className="h-10 w-full rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
