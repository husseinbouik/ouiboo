# Spend caps & runaway-cost protection (#331)

_Last audited: 2026-10-22 (code + plan review). Companion to the ops rehearsal
(#209). Rule: every metered service must either hard-stop at a plan limit or
carry an explicit, owner-set cap. Budget alerts alone do not count._

## Service table

| Service | Plan today | What happens at the limit | Cap / alert state |
| --- | --- | --- | --- |
| Vercel (10 projects: 5 prod + 5 staging) | Free-tier limits (evidence: deployments hard-capped at 100/day, hit 2026-10-20/21) | Usage pauses at the free allowances — a runaway bill is structurally impossible while the account stays on free-plan limits | No card-driven overage possible today. **Owner action if upgrading to Pro: set Spend Management (Billing -> Spend Management) with pause-on-limit BEFORE the upgrade takes effect.** |
| Neon (`ouiboo-production`, `ouiboo-staging`) | Free | Compute suspends when the monthly compute allowance is exhausted; no card on file, so no overage billing | Hard stop by plan design. The API degrades (DB unreachable) rather than billing — pair with the #209 alerting exercise so a suspension is noticed fast |
| Upstash Redis (`ouiboo-staging` + prod integration) | Free | Requests are rejected once the free command quota is exhausted | Hard stop by plan design. Blast radius is limited: the login risk gate (#264) fails open by design and trip caching degrades to database reads |
| Backblaze B2 (media bucket) | Pay-as-you-go | **No platform hard cap by default** — the one genuine open surface | **Owner action: set a daily Cap in the B2 console (Caps page) sized ~3x normal daily egress.** Mitigations already in place: media is served through the API's own `/media` route (no public bucket URLs to hotlink), and trip images are the only stored media |
| Gmail SMTP (transactional mail) | Free (Google account) | Google daily sending quotas hard-stop delivery | No billing surface |
| Stripe | Standard pricing | Fees are a % of successful charges only | No metered runaway surface. No saved-payment-method charging exists outside checkout |

## Code-side audit (2026-10-22)

- **No unbounded loops found.** No `while (true)` or recursive self-calls in the
  API; background jobs iterate bounded sets (`take: 500`) with per-recipient
  failure isolation (notification jobs, cron maintenance).
- **Retries are bounded.** The frontend API client retries a network error at
  most once (#319); the login flow's Redis risk gate (#264) fails fast instead
  of hammering bcrypt.
- **Function time is platform-capped.** No `maxDuration` overrides in any
  `vercel.json`, so handlers die at the platform ceiling. The cron maintenance
  endpoint runs all jobs in one request; jobs are idempotent, so a timeout
  mid-batch simply defers the rest to the next invocation.
- **Traffic cost on public pages** is bounded by the same Vercel plan limits
  above. If the account moves to Pro, revisit: enable Vercel Firewall rate
  limiting for `/api/v1/trips` and the auth routes at the same time as Spend
  Management — the API already throttles auth endpoints in code (#264), the
  firewall rule is defense in depth for raw bandwidth.

## Owner actions (only the account owner can do these)

1. Backblaze B2: set a daily Cap (~3x normal egress) — B2 console -> Caps.
2. Before any Vercel Pro upgrade: Billing -> Spend Management -> set a hard
   limit with pause enabled; then enable Firewall rate-limit rules for the
   API + traveler public routes.
3. During the #209 rehearsal: send one test alert per provider that supports
   email alerts and confirm it reaches the project inbox.
