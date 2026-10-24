# Operations monitoring and alerting

Issue #399. Before this setup, an API outage or error spike was only
discovered when a user reported it: Vercel's API exposes build events only
(runtime-log endpoints return 404 on this setup), no log drain was
configured, and no alert channel existed. This document describes what runs
today, within the Vercel **free** plan.

## Alerting — GitHub Actions uptime monitor

- Workflow: `.github/workflows/uptime-monitor.yml` ("Uptime Monitor").
- Cadence: every 15 minutes, plus manual runs via `workflow_dispatch`.
- Checks (10): production + staging API `GET /api/v1/health` (must return
  HTTP 200 **and** a payload containing `"database":"ok"`), and the five
  production + five staging frontend URLs (HTTP 200).
- Flap protection: every target gets 2 attempts with a 30s timeout and a
  10s pause, so a cold start does not raise a false alarm.
- On failure: the run fails, the run's step summary names the failing
  target(s), and GitHub sends its failed-workflow notification to the
  workflow owner. There is no separate paging service; acknowledgement is
  "a human saw the GitHub notification".

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
  for `"http_error"` or `"status":500`. Unhandled exceptions additionally
  log their stack trace via the same filter.
- Verification (Drill 5 repeat): call an unknown route and a bad login
  payload against staging, then confirm both appear as `http_error` lines
  in the dashboard logs within minutes; stop a target (or point a manual
  workflow run at a broken deployment) and confirm the uptime run fails
  and notifies.

## Residual

- **External log drains are a Vercel Pro feature.** The owner declined the
  Pro upgrade (2026-10-23), so logs live only in the Vercel dashboard with
  the free plan's retention, and cannot be shipped to an external sink from
  the platform. If that decision is revisited, configure a drain and point
  it at any HTTP log sink; the structured `http_error` lines are already
  drain-ready JSON.
- Alerting latency is bounded by the 15-minute schedule plus GitHub's
  notification delivery; this is an operator-notification setup, not a
  paging SLA.
