# Analytics Improvements Design (#218)

Status: Design only — no implementation in this change.

## Current state

`apps/api/src/analytics/analytics.service.ts` (280 lines) serves agency analytics:
- `GET /analytics/revenue-trends` — daily/weekly/monthly revenue grouping
- `GET /analytics/conversion-funnel` — session → booking → confirmed → completed
- `GET /analytics/top-trips` — top trips by bookings (limit param)
- `GET /analytics/payment-methods` — payment method breakdown
- `GET /analytics/customer-demographics` — customer breakdown
- `GET /analytics/metrics` — summary metrics

### Known gaps (from AGENTS.md review gate #5)
- Weekly analytics currently preserves the existing **Sunday-start** label.
- No explicit business-time-zone requirement — date boundaries use whatever the caller passes.
- No pagination metadata on list endpoints.
- No search/filter on analytics endpoints.

## 1. Timezone handling

### Decision
All analytics date boundaries are computed in **Africa/Casablanca** (the business timezone for Morocco launch). The timezone must be explicit and replaceable for future African/global expansion (per AGENTS.md i18n rules).

### Proposed approach
- Add a `BUSINESS_TIMEZONE` env var (default `Africa/Casablanca`), validated at startup via `validateRequiredEnv`.
- Create `apps/api/src/common/timezone.util.ts` with:
  - `startOfDayInTz(date: Date, tz: string): Date`
  - `endOfDayInTz(date: Date, tz: string): Date`
  - `startOfWeekInTz(date: Date, tz: string, weekStart: 0|1): Date` — explicit week-start parameter (currently Sunday = 0, preserved)
  - `startOfMonthInTz(date: Date, tz: string): Date`
- All analytics service methods take an optional `timezone` param (default from env) and convert `startDate`/`endDate` query params (interpreted as calendar dates in the business TZ) to UTC instants for Prisma queries.

### Boundary tests (required before changing date semantics)
- Booking at 23:30 Casablanca time on day X must count toward day X, not day X+1 (UTC).
- Booking at 00:30 Casablanca time on day X must count toward day X, not day X-1 (UTC).
- Week boundary: Sunday 00:00 Casablanca = start of week (current behavior preserved).
- DST transitions: Africa/Casablanca observes Ramadan DST shifts — test a date range spanning a transition.

## 2. Search

### Endpoints needing search/filter
| Endpoint | Proposed query params |
|----------|----------------------|
| `revenue-trends` | `tripId` (filter to one trip), `paymentMethod` |
| `conversion-funnel` | `tripId`, `source` (future: UTM) |
| `top-trips` | `q` (trip title search), `category` |
| `customer-demographics` | `country`, `city` |

### Validation rules (per AGENTS.md DTO rules)
- All new query params validated at the DTO boundary with `class-validator`.
- `limit` clamped to 1–100 (currently defaults to 10, no max).
- `q` trimmed, max 100 chars, escaped for Prisma `contains` (case-insensitive).

## 3. Pagination

### Decision
Offset-based pagination with metadata (simpler for analytics dashboards than cursors; deterministic ordering required).

### Proposed response shape
```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 2,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Rules (per AGENTS.md)
- Pagination work is **incomplete** unless metadata exists AND the UI can navigate beyond the first page.
- `page`/`limit` validated: `page >= 1`, `1 <= limit <= 100`.
- Deterministic `orderBy` on every paginated query (e.g., `createdAt desc, id desc`).
- Do NOT add caps to previously unbounded lists until pagination metadata + UI navigation exist (AGENTS.md review gate #4).

### Endpoints to paginate
- `top-trips` (currently `limit`-only, no offset)
- Future: booking-level drill-down endpoints

## Implementation order
1. `timezone.util.ts` + boundary tests
2. Apply TZ to `revenue-trends` (highest business value)
3. Pagination metadata on `top-trips`
4. Search params on `top-trips` and `revenue-trends`
5. Remaining endpoints
