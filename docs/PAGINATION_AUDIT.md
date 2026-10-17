# Pagination Audit — List/Search Endpoints (#249)

Inventory of all `@Get()` list endpoints in `apps/api/src/` and their pagination contract status.
Audited 2026-10-17 against current code.

## Standard contract

The recommended response shape is:

```json
{
  "data": [...],
  "pagination": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 }
}
```

## Results

| Endpoint | Controller / method | Pagination metadata? | Raw array? | Shape notes | Priority |
|---|---|---|---|---|---|
| `GET /trips` | `trips.controller.ts` → `findAll` | ✅ Yes | No | Standard `{ data, pagination }` | High |
| `GET /bookings/my-bookings` | `bookings.controller.ts` → `findMyBookings` | ✅ Yes | No | Standard `{ data, pagination }` | High |
| `GET /admin/agencies` | `admin.controller.ts` → `getAgencies` | ✅ Yes | No | Standard `{ data, pagination }` | High |
| `GET /admin/bookings` | `admin.controller.ts` → `getBookings` | ✅ Yes | No | Standard `{ data, pagination }` | High |
| `GET /admin/pending-payments` | `admin.controller.ts` | ✅ Yes | No | Standard `{ data, pagination }` | Medium |
| `GET /admin/pending-agencies` | `admin.controller.ts` | ✅ Yes | No | Standard `{ data, pagination }` | Medium |
| `GET /admin/pending-trips` | `admin.controller.ts` | ✅ Yes | No | Standard `{ data, pagination }` | Medium |
| `GET /admin/payout-requests` | `admin.controller.ts` | ✅ Yes | No | Standard `{ data, pagination }` | Medium |
| `GET /admin/audit-logs` | `admin.controller.ts` | ✅ Yes | No | Standard `{ data, pagination }` | Low |
| `GET /agency/bookings` | `agency.controller.ts` → `getBookings` | ✅ Yes | No | Standard `{ data, pagination }` | High |
| `GET /agency/payouts` | `agency.controller.ts` → `getPayouts` | ✅ Yes | No | Standard `{ data, pagination }` | Medium |
| `GET /notifications/history` | `notifications.controller.ts` → `getHistory` | ✅ Yes | No | Standard `{ data, pagination }` | Low |
| `GET /agency/trips` | `agency.controller.ts` → `getTrips` | ❌ No | **Yes** | Returns raw `findMany()` array; accepts `page`/`limit` but drops `total` — UI cannot navigate beyond current page | **High** |
| `GET /agency/reviews` | `agency.controller.ts` → `getReviews` | ⚠️ Partial | No | Returns `{ reviews, stats }`; `stats.totalReviews` exists but no `pagination` object (`page`/`limit`/`totalPages` missing) | Medium |
| `GET /trips/:tripId/reviews` | `reviews.controller.ts` → `getReviews` | ⚠️ Partial | No | Returns `{ reviews, total, page, pages }` — non-standard (`pages` vs `totalPages`, no `limit`) | Medium |
| `GET /wishlist` | `wishlist.controller.ts` → `getWishlist` | ⚠️ Partial | No | Returns `{ items, total, page, pages }` — non-standard shape | Medium |
| `GET /messages/conversations` | `messages.controller.ts` → `getConversations` | ⚠️ Partial | No | Returns `{ conversations, total, page, pages }` — non-standard shape | Medium |
| `GET /messages/search` | `messages.controller.ts` → `searchMessages` | ⚠️ Partial | No | Returns `{ messages, total, page, pages }` — non-standard shape | Low |

## Endpoints intentionally not paginated

| Endpoint | Reason |
|---|---|
| `GET /health/*`, `GET /currency/*` | Single-value / small static responses |
| `GET /auth/session` | Single session object |
| `GET /users/me` | Single user object |
| `GET /wishlist/count`, `GET /messages/unread-count` | Count scalars |
| `GET /analytics/*` | Aggregates over bounded windows |
| `GET /agency/reviews/stats`, `GET /trips/:tripId/reviews/stats` | Aggregate stats |
| `GET /upload/signed-url`, `GET /upload/file`, `GET /media/:folder/:filename` | File serving, not lists |

## Gaps to fix (implementation phase)

1. **[High] `GET /agency/trips`** — returns a raw array; add `{ data, pagination }` with total count.
2. **[Medium] `GET /agency/reviews`** — wrap in standard pagination object.
3. **[Medium] Standardize shapes** — `wishlist`, `messages/conversations`, `messages/search`, `trips/:tripId/reviews` use `{ X, total, page, pages }`; migrate to `{ data, pagination: { total, page, limit, totalPages } }` with UI updates.
