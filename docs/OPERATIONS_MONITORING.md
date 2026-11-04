# Operations monitoring and alerting

Issue #399. Before this setup, an API outage or error spike was only
discovered when a user reported it: Vercel's API exposes build events only
(runtime-log endpoints return 404 on this setup), no log drain was
configured, and no alert channel existed. This document describes what runs
today, within the Vercel **free** plan.

## Alerting — two layers

### Primary: workspace uptime hook (agent-owned, 1-minute cadence)

- A polling hook on the operator's workspace (`ouiboo-uptime`) probes every
  60 seconds: production API `GET /api/v1/health` (HTTP 200 **and** a
  `"database":"ok"` payload) plus the four production frontends — landing,
  traveler, agency, admin (HTTP 200 after redirects; the admin app
  307-redirects `/` to `/login` when signed out, which is healthy).
- Flap protection: a failure must appear on **two consecutive polls**
  (~1 minute apart) before anyone is alerted. A recovery after an alerted
  outage is reported once, too.
- On a confirmed outage, an alert message is delivered to the founder's
  main chat naming the failing target(s). Incidents are appended to
  `hidden_files/uptime-incidents.log` in the launch goal workspace, and the
  hook's own decision log is kept by the workspace hook runtime.
- Drill (repeatable): write a bogus API URL into the hook's
  `api_url_override` state file, pre-date the first-failure timestamp by
  two minutes, and run the hook once — the alert fires end-to-end without
  touching production. Remove the override and the next poll reports the
  recovery. Last run: **2026-11-04 — alert and recovery both delivered**.

### Secondary: GitHub Actions uptime monitor

- Workflow: `.github/workflows/uptime-monitor.yml` ("Uptime Monitor").
- Configured cadence: every 15 minutes, plus manual `workflow_dispatch`.
  Checks (10): production + staging API health and the five production +
  five staging frontend URLs, 2 attempts each.
- Honest limitation: on GitHub's free tier, scheduled workflows are
  throttled — observed real cadence is **hours, not 15 minutes**
  (2026-11-04: runs at 02:42, 09:52, 17:39 UTC). A failed run notifies the
  workflow owner via GitHub's failed-workflow notification. Treat this
  layer as a slow safety net; the workspace hook above is the alerting
  path that meets the ~15-minute requirement.

## Logs — structured API error lines (free plan)

- The API's global exception filter emits one structured JSON log line for
  every error response (4xx at warn level, 5xx at error level):

  ```json
  {"event":"http_error","timestamp":"2026-10-24T00:00:00.000Z","method":"GET","path":"/api/v1/trips","status":404,"error":"NotFoundException","correlationId":"..."}
  ```

- Fields: `event`, `timestamp`, `method`, `path` (query string stripped, so
  signed download tokens never reach the logs), `status`, `error` (exception
  class name), and `correlationId` when present. Request bodies, headers,
  cookies, tokens, and personal data are never logged.
- Where to read them: Vercel dashboard → the API project → **Logs**. Search
  for `"http_error"` or a known path. Unhandled exceptions additionally log
  their stack trace via the same filter.
- There is **no machine-readable log API on this plan**: re-verified
  2026-11-04 — the Vercel API deployment-events endpoints return build
  events only, and the project-logs endpoints return 404. The dashboard is
  the only log reader; that is a plan limitation, not a configuration gap.
- Verification (Drill 5 repeat, 2026-11-04): controlled errors were
  generated against production (unknown route → 404, malformed login
  payload → 400, both clean `application/problem+json` through the filter
  at 21:17 UTC). To see the matching lines: dashboard → `ouiboo-api`
  project → Logs → search `"http_error"` around that timestamp.

## The one remaining founder action — external log sink (optional)

An external, searchable log sink (Axiom, Logtail/Better Stack, …) cannot be
switched on from the agent side, for a platform reason:

- **Vercel log drains are a Pro-plan feature, whatever the destination.**
  A free external account alone receives nothing until drains exist.
- If the founder wants the external sink, the steps are:
  1. Vercel dashboard → team **Settings → Billing → Upgrade to Pro**
     (founder's own payment method; this is the step that was declined on
     2026-10-23 and is his call to revisit).
  2. Create a free account at the sink of choice under the founder's email
     (e.g. axiom.co → sign up → create a dataset → copy the ingest token).
  3. Vercel dashboard → team **Settings → Log Drains → Add Drain** →
     select the `ouiboo-api` project → paste the sink's ingest endpoint +
     token → Save. The structured `http_error` lines are already
     drain-ready JSON; no code change is needed.
- Until then, logs live in the Vercel dashboard with the free plan's
  retention, and alerting (above) does not depend on the sink.

## Residual

- Alerting latency is now bounded by ~2 minutes (two 60-second polls) for
  detection plus chat delivery for notification; this is an
  operator-notification setup, not a paging SLA.
- The GitHub Actions layer remains subject to free-tier schedule
  throttling; do not cite its 15-minute configuration as its real cadence.
