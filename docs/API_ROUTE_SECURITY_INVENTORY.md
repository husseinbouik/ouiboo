# API Route Security Inventory

Generated during the second production-hardening pass from `apps/api/src/**/*.controller.ts`.

Global prefix: `/api/v1`

| Area | Routes | Classification | Guards / Checks | Remaining Notes |
| --- | --- | --- | --- | --- |
| Auth | `POST /auth/login`, `/register`, `/refresh`, `/logout`, `/verify-email`, `/resend-otp`, `/forgot-password`, `/reset-password` | Public/sensitive | Redis-backed `RateLimitGuard` at controller level | Needs API E2E coverage for brute-force and token rotation failures. |
| Trips public search | `GET /trips`, `/trips/:id`, `/trips/:id/sessions` | Public | Sorting allowlist, pagination clamps, query validation in service | Price filters now Decimal-safe. |
| Trips agency mutation | `POST /trips`, `POST /trips/:id/sessions`, `PATCH /trips/:id`, `DELETE /trips/:id` | Agency private | `JwtAuthGuard`, `RolesGuard(AGENCY)`, `TenantGuard`; service ownership checks | Verified by route/decorator audit; expand negative E2E. |
| Bookings | `POST /bookings`, `GET /bookings/my-bookings`, `GET /bookings/:id`, `POST /bookings/:id/payment-proof`, `GET /bookings/:id/payment-proof/download`, `PATCH /bookings/:id/cancel` | Traveler/private mixed | `JwtAuthGuard`; service traveler/agency/admin ownership checks for resource routes | List endpoint still lacks pagination; add before large-scale launch. |
| Payments | `POST /payments/initiate`, `/verify`, `/refund`, `/webhook/:provider` | Sensitive | Redis-backed rate limit; JWT on initiate/verify; admin role on refund; provider signature on webhook | Webhook rate limit is Redis-backed; add replay/idempotency tests. |
| Agency dashboard | `GET /agency/*`, `POST /agency/payouts`, `PATCH /agency/profile` | Agency private | `JwtAuthGuard`, `RolesGuard(AGENCY)`, `TenantGuard` | Stats and payout money now decimal-string serialized. |
| Admin | `GET/POST/PATCH /admin/*` | Admin private | `JwtAuthGuard`, `RolesGuard(ADMIN)` | Several list endpoints have search filters; continue pagination rollout beyond audit logs. |
| Analytics | `GET /analytics/*` | Agency private | `JwtAuthGuard`, `RolesGuard(AGENCY)`, `TenantGuard` | Fixed in this pass; uses `req.tenantId`. |
| Admin analytics | `GET /admin/analytics/metrics` | Admin private | `JwtAuthGuard`, `RolesGuard(ADMIN)` | Fixed in this pass. |
| Upload | `POST /upload` | Private/sensitive | `JwtAuthGuard`, Redis-backed `RateLimitGuard`, MIME/size validators, file signature checks, EICAR blocking, active-PDF blocking, storage path sanitization | Managed malware/CDR scanner still needs production-provider selection and verification. |
| Wishlist | `POST/DELETE/GET /users/wishlist*` | Traveler private | `JwtAuthGuard`; service scoped by authenticated user | Add E2E negative ownership tests. |
| Reviews | `POST /bookings/:bookingId/review`, `POST/PATCH/DELETE /reviews/:reviewId*`, public trip review reads | Mixed | JWT on create/mutate; public reads | Needs admin moderation route guard inventory if exposed later. |
| Messages | `POST /messages`, `GET /messages/*`, `DELETE /messages/:messageId` | Private | `JwtAuthGuard`; service participant checks needed | Needs verification tests for cross-conversation access. |
| Currency | `GET /currency/rates`, `/convert`, `/supported` | Public | Decimal validation in service | Add rate limit if abused by public clients. |
| Health | `GET /health`, `/health/db`, `/health/redis` | Public operational | No auth | Safe for orchestrator checks; avoid leaking secrets. |

## Fixed In This Pass

- Admin analytics now requires `RolesGuard(ADMIN)`.
- Agency analytics now requires `RolesGuard(AGENCY)` and `TenantGuard`.
- Payment, auth, and upload rate limits now use Redis when configured and require Redis in production.
- Uploads now validate file signatures, reject EICAR test payloads, reject active-content PDFs, sanitize local/S3 keys, and use S3 server-side encryption.

## Remaining Security Work

- Add route-level authorization-failure tests for every row above.
- Add pagination to booking/admin/agency list endpoints that still return unbounded results.
- Add webhook idempotency/replay protection tests.
- Select and verify a managed malware/CDR scanner for broad production exposure; basic server-side signature/content checks are implemented.
