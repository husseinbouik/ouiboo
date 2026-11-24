/**
 * Design Council 2026-11-24, M6: the landing loading state is a quiet
 * layout skeleton (navy hero block + section + card rail placeholders)
 * in the same spirit as the other apps' loading.tsx files — replacing
 * the bouncing-dots spinner, which read as a demo against an otherwise
 * sober, trust-led page. Pulse is `motion-safe:` so reduced-motion
 * visitors get a static placeholder.
 */
export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="min-h-screen bg-[#FDF9F3]">
      <div className="bg-[#0A192F] px-6 pb-16 pt-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="h-[30px] w-[130px] rounded-md bg-white/15 motion-safe:animate-pulse" />
          <div className="mt-14 h-12 w-3/4 max-w-[560px] rounded-lg bg-white/15 motion-safe:animate-pulse" />
          <div className="mt-4 h-12 w-1/2 max-w-[400px] rounded-lg bg-white/15 motion-safe:animate-pulse" />
          <div className="mt-6 h-5 w-2/3 max-w-[480px] rounded bg-white/10 motion-safe:animate-pulse" />
          <div className="mt-9 flex gap-[14px]">
            <div className="h-[50px] w-[170px] rounded-full bg-white/20 motion-safe:animate-pulse" />
            <div className="h-[50px] w-[190px] rounded-full bg-white/10 motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
      <div className="bg-[#F7E1C3]/40 px-6 py-[84px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="h-4 w-[140px] rounded bg-[#0A192F]/10 motion-safe:animate-pulse" />
          <div className="mt-4 h-9 w-[320px] rounded-lg bg-[#0A192F]/10 motion-safe:animate-pulse" />
          <div className="mt-10 grid gap-[26px] lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-[20px] bg-white shadow-sm">
                <div className="aspect-[16/10] bg-[#0A192F]/10 motion-safe:animate-pulse" />
                <div className="space-y-3 p-[22px]">
                  <div className="h-4 w-1/3 rounded bg-[#0A192F]/10 motion-safe:animate-pulse" />
                  <div className="h-5 w-4/5 rounded bg-[#0A192F]/10 motion-safe:animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-[#0A192F]/10 motion-safe:animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
