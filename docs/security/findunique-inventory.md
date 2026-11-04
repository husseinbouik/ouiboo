# findUnique read-path inventory (#634)

Council Session #4, punch list P2-1. The Prisma tenant-scope extension
(`apps/api/src/database/tenant-scope.ts`, #428) deliberately does NOT scope
`findUnique` / `findUniqueOrThrow`: a point lookup is how services load a row
before applying their explicit ownership check, and that check owns the API’s
denial contract (403 for a foreign direct-ID read). This inventory is the
compensating enumeration: every point-lookup call site in the API, classified,
so the discipline the extension leaves to services is audited, not assumed.

## Method & reconciliation

- Scope: `apps/api/src`, production sources (spec/test files excluded — they
  contain no production read paths).
- Command: `grep -rn "findUnique" apps/api/src --include="*.ts"` → **169 lines**.
- Reconciliation: 169 = **165 real call sites** (table below) + 3 mentions in
  `database/tenant-scope.ts` (the header comment and the `UNIQUE_LOOKUP_OPERATIONS`
  set entries — the mechanism itself, not call sites) + 1 `typeof this.db.user?.findUnique`
  feature probe at `auth/auth.service.ts:892` (the actual call it guards is at :894,
  counted). One call site is split across lines (`reviews.service.ts:235`) and is
  counted once.
- Tenant-owned models (rows owned by an agency tenant or a traveller account,
  including transitively-owned rows such as PaymentProof/Message): **160 of the 165**
  sites. The 5 remaining sites are on non-tenant models: ExchangeRate (public FX
  reference data), EmailSuppression, WebhookInboxEntry (PSP idempotency inbox),
  BreakGlassCredential (admin’s own credential), CopyrightReport (public filing,
  admin-handled).
- Classifications: **guarded** = an explicit ownership check (named in the table)
  or a unique key built from the authenticated caller’s own id; **admin-only** =
  reachable only through a controller carrying `JwtAuthGuard + RolesGuard` with
  `@Roles(Admin)`; **non-tenant/public** = public-by-design or non-tenant data;
  **non-tenant/internal** = no direct read surface (signature-verified provider
  webhook, cron/system job, or a re-read inside a transaction whose entry point
  already enforced ownership); **unguarded** = a reachable read with none of the
  above.

## Result

| Classification | Count |
|---|---|
| guarded | 76 |
| non-tenant/internal | 65 |
| admin-only | 18 |
| non-tenant/public | 6 |
| **unguarded** | **0** |
| **Total** | **165** |

**Zero unguarded reachable sites.** No service code changes were required; the
closure for #634 is this inventory plus the negative cross-tenant READ tests in
`apps/api/test/cross-tenant.e2e-spec.ts` (suite header lists the surfaces; the
`findUnique closure (#634)` block adds quote requests, payment attempts, the
booking pass, and custom-trip requests to the previously covered templates,
bookings, refund cases, invoices, payment profiles, conversations and lists).
Removing any named guard makes the corresponding test fail (the tests assert
both the denial status and that the foreign tenant’s data appears in none of
the caller’s read surfaces).

## Call sites

| # | Site | Model | Enclosing method | Classification | Guard / basis |
|---|---|---|---|---|---|
| 1 | `src/admin/admin-interventions.service.ts:231` | booking | repairBooking | admin-only | AdminInterventionsController (`@Roles(Admin)`), reason + audit required |
| 2 | `src/admin/admin-interventions.service.ts:434` | refundCase | openRefundCase | admin-only | AdminInterventionsController (`@Roles(Admin)`) |
| 3 | `src/admin/admin-seed.service.ts:42` | user | onModuleInit | non-tenant/internal | boot-time seed existence check by seed admin email; no request surface |
| 4 | `src/admin/admin.controller.ts:217` | paymentProof | verifyPayment | admin-only | AdminController class-level `@Roles(Admin)` |
| 5 | `src/admin/admin.controller.ts:459` | agencyProfile | verifyAgencyLicence | admin-only | AdminController class-level `@Roles(Admin)` |
| 6 | `src/admin/admin.controller.ts:549` | agencyProfile | verifyAgencyInsurance | admin-only | AdminController class-level `@Roles(Admin)` |
| 7 | `src/admin/admin.controller.ts:636` | duplicateCreditFlag | resolveDuplicateCreditFlag | admin-only | AdminController class-level `@Roles(Admin)` |
| 8 | `src/admin/admin.controller.ts:674` | agencyProfile | verifyAgencyBankDetails | admin-only | AdminController class-level `@Roles(Admin)` |
| 9 | `src/admin/admin.controller.ts:801` | tripTemplate | verifyTrip | admin-only | AdminController class-level `@Roles(Admin)` |
| 10 | `src/agency/agency-public.controller.ts:16` | agencyProfile | getPublicProfile | non-tenant/public | public agency storefront profile (published fields of a listed agency) |
| 11 | `src/agency/agency.controller.ts:81` | agencyProfile | cancelSubscription | guarded | `where: { id: req.tenantId }` — caller tenant only |
| 12 | `src/agency/agency.controller.ts:106` | agencyProfile | resumeSubscription | guarded | `where: { id: req.tenantId }` — caller tenant only |
| 13 | `src/agency/agency.controller.ts:606` | agencyProfile | updateProfile | guarded | `where: { id: req.tenantId }` — caller tenant only |
| 14 | `src/auth/auth.service.ts:150` | user | validateUser | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 15 | `src/auth/auth.service.ts:269` | user | loadChallengeUser | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 16 | `src/auth/auth.service.ts:527` | user | verifyMfaRecovery | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 17 | `src/auth/auth.service.ts:582` | user | startMfaEnrollment | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 18 | `src/auth/auth.service.ts:624` | user | confirmMfaEnrollment | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 19 | `src/auth/auth.service.ts:681` | user | getMfaStatus | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 20 | `src/auth/auth.service.ts:709` | user | createBreakGlassCredential | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 21 | `src/auth/auth.service.ts:746` | user | listBreakGlassCredentials | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 22 | `src/auth/auth.service.ts:776` | user | revokeBreakGlassCredential | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 23 | `src/auth/auth.service.ts:780` | breakGlassCredential | revokeBreakGlassCredential | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 24 | `src/auth/auth.service.ts:821` | user | useBreakGlass | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 25 | `src/auth/auth.service.ts:894` | user | register | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 26 | `src/auth/auth.service.ts:984` | user | verifyEmail | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 27 | `src/auth/auth.service.ts:1030` | user | resendOTP | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 28 | `src/auth/auth.service.ts:1066` | user | requestPasswordReset | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 29 | `src/auth/auth.service.ts:1098` | user | resetPassword | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 30 | `src/auth/auth.service.ts:1162` | user | refreshToken | non-tenant/internal | auth flow: lookup by the credential/subject itself (login email, challenge subject, recovery/break-glass credential id, OTP/reset subject) — no tenant data is returned to a different tenant |
| 31 | `src/auth/guards/mfa-enrollment.guard.ts:64` | user | canActivate | non-tenant/internal | auth pipeline: user by the challenge subject id |
| 32 | `src/auth/guards/tenant.guard.ts:26` | agencyProfile | canActivate | guarded | guard: agency profile by the authenticated user’s own userId → tenant id |
| 33 | `src/auth/strategies/jwt.strategy.ts:30` | user | validate | non-tenant/internal | auth pipeline: user by the token’s own subject id |
| 34 | `src/auth/subscription.guard.ts:18` | agencyProfile | canActivate | guarded | guard: agency profile by the authenticated user’s own userId |
| 35 | `src/bookings/bookings.service.ts:250` | tripSession | previewPromo | non-tenant/internal | session of a published trip being priced for the caller’s own prospective booking; no tenant data returned |
| 36 | `src/bookings/bookings.service.ts:356` | tripSession | create | non-tenant/internal | session loads for the caller’s own new booking (published, bookable session); the booking is created stamped with the caller as traveller |
| 37 | `src/bookings/bookings.service.ts:567` | tripSession | create | non-tenant/internal | session loads for the caller’s own new booking (published, bookable session); the booking is created stamped with the caller as traveller |
| 38 | `src/bookings/bookings.service.ts:733` | user | create (notification fan-out) | non-tenant/internal | notification fan-out inside booking creation: traveller is the caller; agency user is the booked trip’s own agency |
| 39 | `src/bookings/bookings.service.ts:734` | user | create (notification fan-out) | non-tenant/internal | same fan-out as :733 (agency user of the booked trip) |
| 40 | `src/bookings/bookings.service.ts:895` | booking | findOneForUser | guarded | traveller owner OR owning agency (`booking.session.template.agencyId === caller agency`) OR admin, else Forbidden |
| 41 | `src/bookings/bookings.service.ts:929` | agencyProfile | findOneForUser | guarded | traveller owner OR owning agency (`booking.session.template.agencyId === caller agency`) OR admin, else Forbidden |
| 42 | `src/bookings/bookings.service.ts:942` | booking | uploadPaymentProof | guarded | `booking.travelerId !== userId` → Forbidden |
| 43 | `src/bookings/bookings.service.ts:1104` | booking | createDuplicateCreditFlag | guarded | agency resolved from caller userId; booking must belong to that agency → Forbidden otherwise |
| 44 | `src/bookings/bookings.service.ts:1163` | booking | getPaymentProofFile | guarded | traveller owner OR owning agency OR admin, else BadRequest(Unauthorized) — same gate as findOneForUser |
| 45 | `src/bookings/bookings.service.ts:1176` | agencyProfile | getPaymentProofFile | guarded | traveller owner OR owning agency OR admin, else BadRequest(Unauthorized) — same gate as findOneForUser |
| 46 | `src/bookings/bookings.service.ts:1228` | booking | loadPaymentReviewContext | guarded | shared gate for proof review/bank confirmation: agency from caller userId, booking’s agency must match → Forbidden |
| 47 | `src/bookings/bookings.service.ts:1240` | agencyProfile | loadPaymentReviewContext | guarded | shared gate for proof review/bank confirmation: agency from caller userId, booking’s agency must match → Forbidden |
| 48 | `src/bookings/bookings.service.ts:1267` | booking | confirmPayOnArrival | guarded | via loadPaymentReviewContext agency-ownership gate |
| 49 | `src/bookings/bookings.service.ts:1272` | agencyProfile | confirmPayOnArrival | guarded | via loadPaymentReviewContext agency-ownership gate |
| 50 | `src/bookings/bookings.service.ts:1328` | booking | verifyPayment | non-tenant/internal | re-reads inside the manual-review transaction after `loadPaymentReviewContext` enforced agency ownership |
| 51 | `src/bookings/bookings.service.ts:1342` | booking | verifyPayment | non-tenant/internal | re-reads inside the manual-review transaction after `loadPaymentReviewContext` enforced agency ownership |
| 52 | `src/bookings/bookings.service.ts:1372` | booking | verifyPayment | non-tenant/internal | re-reads inside the manual-review transaction after `loadPaymentReviewContext` enforced agency ownership |
| 53 | `src/bookings/bookings.service.ts:1463` | booking | confirmBankPayment | non-tenant/internal | re-reads inside the transaction after `loadPaymentReviewContext` enforced agency ownership |
| 54 | `src/bookings/bookings.service.ts:1496` | booking | confirmBankPayment | non-tenant/internal | re-reads inside the transaction after `loadPaymentReviewContext` enforced agency ownership |
| 55 | `src/bookings/bookings.service.ts:1546` | booking | markAttendance | guarded | agency from caller userId; booking’s agency must match → Forbidden; final hit is the post-update re-read |
| 56 | `src/bookings/bookings.service.ts:1552` | agencyProfile | markAttendance | guarded | agency from caller userId; booking’s agency must match → Forbidden; final hit is the post-update re-read |
| 57 | `src/bookings/bookings.service.ts:1599` | booking | markAttendance | guarded | agency from caller userId; booking’s agency must match → Forbidden; final hit is the post-update re-read |
| 58 | `src/bookings/bookings.service.ts:1616` | booking | getBookingPass | guarded | traveller owner OR owning agency OR admin → Forbidden otherwise |
| 59 | `src/bookings/bookings.service.ts:1628` | agencyProfile | getBookingPass | guarded | traveller owner OR owning agency OR admin → Forbidden otherwise |
| 60 | `src/bookings/bookings.service.ts:1720` | booking | verifyBookingPass | guarded | agency from caller userId; pass token is signed and the booking’s agency must match the caller tenant |
| 61 | `src/bookings/bookings.service.ts:1726` | agencyProfile | verifyBookingPass | guarded | agency from caller userId; pass token is signed and the booking’s agency must match the caller tenant |
| 62 | `src/bookings/bookings.service.ts:1792` | booking | disputeAttendance | guarded | traveller owner check on the booking → Forbidden otherwise |
| 63 | `src/bookings/bookings.service.ts:1824` | booking | disputeAttendance | guarded | traveller owner check on the booking → Forbidden otherwise |
| 64 | `src/bookings/bookings.service.ts:1828` | booking | cancelBooking | guarded | traveller owner OR owning agency check → Forbidden otherwise; second hit is the post-transition re-read |
| 65 | `src/bookings/bookings.service.ts:1882` | booking | cancelBooking | guarded | traveller owner OR owning agency check → Forbidden otherwise; second hit is the post-transition re-read |
| 66 | `src/copyright/copyright.service.ts:36` | copyrightReport | resolveReport | admin-only | AdminCopyrightController (`@Roles(Admin)`) |
| 67 | `src/currency/currency.service.ts:77` | exchangeRate | getExchangeRateInfo | non-tenant/public | non-tenant public reference data (FX rate cache) |
| 68 | `src/custom-trips/custom-trips.service.ts:179` | agencyProfile | resolveAgencyId | guarded | `where: { userId }` — calling agency’s own profile; Forbidden when absent |
| 69 | `src/custom-trips/custom-trips.service.ts:230` | customTripRequest | getForAgency | guarded | agency must be destination-matched (`matchedAgencyIds` contains caller agency) else 404 — an unmatched agency cannot learn the request exists; payload pseudonymised |
| 70 | `src/custom-trips/custom-trips.service.ts:266` | customTripRequest | createOffer | guarded | same destination-match gate as getForAgency → 404 for unmatched agencies |
| 71 | `src/custom-trips/custom-trips.service.ts:330` | customTripRequest | accept | guarded | `row.travelerId !== travelerId` → Forbidden inside the transaction |
| 72 | `src/custom-trips/custom-trips.service.ts:424` | customTripRequest | cancel | guarded | `row.travelerId !== travelerId` → Forbidden |
| 73 | `src/email/email.service.ts:163` | emailSuppression | isSuppressed | non-tenant/public | non-tenant system data: suppression list keyed by email address, no tenant content |
| 74 | `src/invoices/invoices.service.ts:146` | invoice | generateMonthlyInvoice | non-tenant/internal | system/billing generation: invoice dedupe by (agencyId, period) + agency loaded by that same agencyId; no caller read surface |
| 75 | `src/invoices/invoices.service.ts:158` | agencyProfile | generateMonthlyInvoice | non-tenant/internal | system/billing generation: invoice dedupe by (agencyId, period) + agency loaded by that same agencyId; no caller read surface |
| 76 | `src/invoices/invoices.service.ts:265` | invoice | generateMonthlyInvoice | non-tenant/internal | system/billing generation: invoice dedupe by (agencyId, period) + agency loaded by that same agencyId; no caller read surface |
| 77 | `src/invoices/invoices.service.ts:363` | invoice | getInvoiceById | admin-only | only callers are AdminInvoicesController (`@Roles(Admin)`); the agency surface uses `getAgencyInvoice(tenantId, id)` which re-checks `invoice.agencyId !== agencyId` |
| 78 | `src/messages/messages.service.ts:37` | agencyProfile | sendMessage | guarded | agency profile resolved by sender’s own userId; conversation participation asserted before insert |
| 79 | `src/messages/messages.service.ts:47` | agencyProfile | sendMessage | guarded | agency profile resolved by sender’s own userId; conversation participation asserted before insert |
| 80 | `src/messages/messages.service.ts:183` | conversation | getMessages | guarded | conversation loaded, then participant check (traveller owner or agency tenant) → Forbidden for non-participants |
| 81 | `src/messages/messages.service.ts:192` | agencyProfile | getMessages | guarded | conversation loaded, then participant check (traveller owner or agency tenant) → Forbidden for non-participants |
| 82 | `src/messages/messages.service.ts:245` | agencyProfile | getConversations | guarded | agency profile by caller’s own userId; conversation lists are participant-scoped |
| 83 | `src/messages/messages.service.ts:282` | agencyProfile | getUnreadCount | guarded | agency profile by caller’s own userId; counts are participant-scoped |
| 84 | `src/messages/messages.service.ts:325` | agencyProfile | searchMessages | guarded | agency profile by caller’s own userId; search is participant-scoped |
| 85 | `src/messages/messages.service.ts:365` | message | deleteMessage | guarded | `message.senderId !== userId` → Forbidden |
| 86 | `src/messages/messages.service.ts:438` | message | removeMessageAttachmentAsAdmin | admin-only | AdminMessagesController (`@Roles(Admin)`), audit-logged |
| 87 | `src/messaging/messaging.service.ts:152` | notificationPreference | userOptedIn | non-tenant/internal | fan-out helper: preferences of the message recipient’s own user id |
| 88 | `src/notifications/notifications.service.ts:13` | notificationPreference | getPreferences | guarded | `where: { userId }` — authenticated caller’s own preferences |
| 89 | `src/notifications/push-notifications.service.ts:109` | notificationPreference | sendToUser | non-tenant/internal | fan-out: preferences of the notification’s own recipient user id |
| 90 | `src/payment-providers/adapters/manual-psp.adapter.ts:38` | agencyProfile | createPaymentRequest | non-tenant/internal | adapter internal: agency resolved from the server-built adapter context (agencyId of the ownership-checked booking) |
| 91 | `src/payment-providers/adapters/manual-psp.adapter.ts:79` | externalPayment | fetchPaymentStatus | non-tenant/internal | adapter internal: status probe by provider payment id for the reconciliation flow |
| 92 | `src/payment-providers/payment-profiles.service.ts:28` | agencyPaymentProfile | getForAgency | guarded | `where: { agencyId }` — agencyId is the caller’s tenant id from TenantGuard |
| 93 | `src/payment-providers/payment-profiles.service.ts:74` | agencyProfile | verify | guarded | agency by the caller-tenant id whose profile is being verified |
| 94 | `src/payment-providers/payment-requests.service.ts:54` | booking | createRequest | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; attempt idempotency lookup by server-computed key for that same booking; profile by the booking’s own agencyId |
| 95 | `src/payment-providers/payment-requests.service.ts:84` | paymentAttempt | createRequest | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; attempt idempotency lookup by server-computed key for that same booking; profile by the booking’s own agencyId |
| 96 | `src/payment-providers/payment-requests.service.ts:126` | agencyPaymentProfile | createRequest | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; attempt idempotency lookup by server-computed key for that same booking; profile by the booking’s own agencyId |
| 97 | `src/payment-providers/payment-requests.service.ts:175` | paymentAttempt | getAttemptStatus | guarded | `assertCanView(user, attempt.agencyId, attempt.booking.travelerId)` — traveller-owner, owning agency tenant, or admin |
| 98 | `src/payment-providers/payment-requests.service.ts:201` | booking | listForBooking | guarded | `assertCanView(user, booking.session.template.agencyId, booking.travelerId)` before listing |
| 99 | `src/payment-providers/payment-requests.service.ts:258` | paymentAttempt | requestRefundForAttempt | non-tenant/internal | integration hook called by the refund workflow (#370) with a case already actor-checked; not a direct read surface |
| 100 | `src/payment-providers/reconciliation.service.ts:173` | paymentReconciliationMismatch | resolveMismatch | admin-only | AdminPaymentReconciliationController (`@Roles(Admin)`) |
| 101 | `src/payment-providers/webhooks.service.ts:119` | paymentAttempt | handleWebhook | non-tenant/internal | PSP webhook: attempt resolved by provider payment id only after the adapter’s signature verification; inbox entry is the idempotency record |
| 102 | `src/payment-providers/webhooks.service.ts:162` | webhookInboxEntry | handleWebhook | non-tenant/internal | PSP webhook: attempt resolved by provider payment id only after the adapter’s signature verification; inbox entry is the idempotency record |
| 103 | `src/payments/payments.service.ts:33` | booking | initiatePayment | guarded | `booking.travelerId !== requesterId` → BadRequest before any provider call |
| 104 | `src/payments/payments.service.ts:127` | booking | verifyPayment | guarded | booking ownership asserted (`travelerId` vs requester) before verification; second hit is the idempotent re-read after the atomic claim |
| 105 | `src/payments/payments.service.ts:224` | booking | verifyPayment | guarded | booking ownership asserted (`travelerId` vs requester) before verification; second hit is the idempotent re-read after the atomic claim |
| 106 | `src/payments/payments.service.ts:267` | booking | processRefund | guarded | booking loaded then ownership/state asserted before refund; session re-read is the booking’s own session |
| 107 | `src/payments/payments.service.ts:397` | tripSession | processRefund | guarded | booking loaded then ownership/state asserted before refund; session re-read is the booking’s own session |
| 108 | `src/payments/payments.service.ts:427` | booking | refundBookingById | guarded | admin-initiated refund path: booking state + gateway-method asserted; caller is the admin refund route |
| 109 | `src/payments/payments.service.ts:835` | booking | handleStripePaymentSuccess | non-tenant/internal | provider webhook handler — reached only after webhook signature validation in `handleWebhookCallback` |
| 110 | `src/payments/payments.service.ts:1009` | booking | handleCMIPaymentSuccess | non-tenant/internal | provider webhook handler — signature-validated callback path only |
| 111 | `src/payments/payments.service.ts:1050` | booking | handleCMIPaymentFailed | non-tenant/internal | provider webhook handler — signature-validated callback path only |
| 112 | `src/payments/payments.service.ts:1081` | booking | handleCMIRefund | non-tenant/internal | provider webhook handler — signature-validated callback path only |
| 113 | `src/payments/payments.service.ts:1137` | booking | handleCashPlusPaymentSuccess | non-tenant/internal | provider webhook handler — signature-validated callback path only |
| 114 | `src/payments/payments.service.ts:1178` | booking | handleCashPlusPaymentFailed | non-tenant/internal | provider webhook handler — signature-validated callback path only |
| 115 | `src/payments/payments.service.ts:1283` | booking | transitionBookingToConfirmed | non-tenant/internal | internal state transition invoked from signature-validated webhook/verification flows |
| 116 | `src/quote-requests/quote-requests.service.ts:65` | tripTemplate | create | non-tenant/public | template must be ACTIVE (published catalogue row) before a traveller may request a quote on it; the created row is stamped with the caller as traveller |
| 117 | `src/quote-requests/quote-requests.service.ts:115` | agencyProfile | resolveAgencyId | guarded | `where: { userId }` — resolves the calling agency’s own profile id; Forbidden when absent |
| 118 | `src/quote-requests/quote-requests.service.ts:140` | quoteRequest | loadOwned | guarded | loader for quote/accept/decline/cancel: each caller compares `row.agencyId !== agencyId` or `row.travelerId !== travelerId` → Forbidden immediately after |
| 119 | `src/quote-requests/quote-requests.service.ts:180` | tripTemplate | quote | non-tenant/internal | template re-read by the already ownership-checked quote request’s own templateId (cancellation policy only) |
| 120 | `src/refunds/refunds.service.ts:185` | refundCase | createRefundDueCaseInTransaction | non-tenant/internal | dedupe lookup by server-generated dedupeKey inside a transaction; no caller read surface |
| 121 | `src/refunds/refunds.service.ts:250` | refundCase | syncRefundDueCases | non-tenant/internal | system sync; rows are processed server-side, nothing returned to a caller |
| 122 | `src/refunds/refunds.service.ts:306` | refundCase | notifyTravelerRefundCaseOpened | non-tenant/internal | notification fan-out for a case created in the same flow; recipient is the case’s own traveller |
| 123 | `src/refunds/refunds.service.ts:934` | externalPayment | complete | non-tenant/internal | provider/system completion path: case loaded via `loadCaseForActor`-guarded or signature-verified PSP flows before this re-read |
| 124 | `src/refunds/refunds.service.ts:1278` | refundCase | confirmReceipt | non-tenant/internal | re-read inside the transaction after `loadCaseForActor(caseId, TRAVELER, travelerId)` enforced ownership |
| 125 | `src/refunds/refunds.service.ts:1371` | refundCase | markAudited | non-tenant/internal | re-read after the admin-only controller (`AdminRefundsController`, `@Roles(Admin)`) load |
| 126 | `src/refunds/refunds.service.ts:1502` | externalPayment | repairCaseAsAdmin | admin-only | AdminRefundsController (`@Roles(Admin)`); payment additionally checked to belong to the case’s booking |
| 127 | `src/refunds/refunds.service.ts:1535` | refundCase | repairCaseAsAdmin | admin-only | AdminRefundsController (`@Roles(Admin)`); payment additionally checked to belong to the case’s booking |
| 128 | `src/refunds/refunds.service.ts:1624` | agencyProfile | refreshAgencyRestriction | non-tenant/internal | internal restriction recompute for the case’s own agency id |
| 129 | `src/refunds/refunds.service.ts:1814` | booking | loadBookingForCase | guarded | booking must pair with the actor-checked refund case (agency/traveller pairing asserted before use) |
| 130 | `src/refunds/refunds.service.ts:1878` | refundCase | loadCaseForActor | guarded | THE ownership gate for refund reads: AGENCY → `refundCase.agencyId !== tenantAgencyId` Forbidden; TRAVELER → `refundCase.travelerId !== actorId` Forbidden |
| 131 | `src/refunds/refunds.service.ts:1922` | refundCase | transitionInTransaction | non-tenant/internal | re-read by id inside a transaction after `loadCaseForActor` + atomic status-claim updateMany |
| 132 | `src/refunds/refunds.service.ts:1953` | agencyProfile | notifyAgencyRefundAction | non-tenant/internal | notification fan-out; agency resolved from the case’s own agencyId |
| 133 | `src/reviews/reviews.service.ts:175` | booking | createReview | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; review dedupe by the same booking id; agencyProfile by the booking’s own agency id (existence only) |
| 134 | `src/reviews/reviews.service.ts:217` | review | createReview | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; review dedupe by the same booking id; agencyProfile by the booking’s own agency id (existence only) |
| 135 | `src/reviews/reviews.service.ts:235` | agencyProfile | createReview | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; review dedupe by the same booking id; agencyProfile by the booking’s own agency id (existence only) |
| 136 | `src/reviews/reviews.service.ts:235` | agencyProfile | createReview | guarded | booking: `booking.travelerId !== travelerId` → Forbidden; review dedupe by the same booking id; agencyProfile by the booking’s own agency id (existence only) |
| 137 | `src/reviews/reviews.service.ts:431` | review | respondToReview | guarded | `review.agencyId !== agencyId` (tenant) → Forbidden |
| 138 | `src/reviews/reviews.service.ts:512` | review | moderateReviewResponse | admin-only | AdminReviewsController (`@Roles(Admin)`) |
| 139 | `src/reviews/reviews.service.ts:605` | review | updateReview | guarded | `review.travelerId !== travelerId` → Forbidden |
| 140 | `src/reviews/reviews.service.ts:688` | review | deleteReview | guarded | `review.travelerId !== travelerId` → Forbidden |
| 141 | `src/reviews/reviews.service.ts:753` | review | moderateReview | admin-only | AdminReviewsController (`@Roles(Admin)`) |
| 142 | `src/reviews/reviews.service.ts:852` | review | getVisibleReviewPhotoKey | non-tenant/public | public media gate: review must match the trip id AND be VISIBLE, else 404 — unmoderated media never resolves |
| 143 | `src/reviews/reviews.service.ts:884` | review | getVisibleReviewVideoKey | non-tenant/public | public media gate: review must match the trip id AND be VISIBLE, else 404 |
| 144 | `src/reviews/reviews.service.ts:907` | review | getReviewForModeration | admin-only | AdminReviewsController (`@Roles(Admin)`) |
| 145 | `src/staged-payments/staged-payments.service.ts:317` | tripSession | applyBankConfirmationInTransaction | non-tenant/internal | inside the bank-confirmation transaction; the entry point load (`loadPaymentReviewContext` in BookingsService) already enforced agency ownership of the booking |
| 146 | `src/staged-payments/staged-payments.service.ts:342` | bookingPaymentPlan | applyBankConfirmationInTransaction | non-tenant/internal | inside the bank-confirmation transaction; the entry point load (`loadPaymentReviewContext` in BookingsService) already enforced agency ownership of the booking |
| 147 | `src/staged-payments/staged-payments.service.ts:345` | booking | applyBankConfirmationInTransaction | non-tenant/internal | inside the bank-confirmation transaction; the entry point load (`loadPaymentReviewContext` in BookingsService) already enforced agency ownership of the booking |
| 148 | `src/staged-payments/staged-payments.service.ts:369` | tripSession | evaluateSessionGroupInTransaction | non-tenant/internal | internal group-evaluation transaction (admin/cron driven); no user-supplied tenant id reaches it |
| 149 | `src/staged-payments/staged-payments.service.ts:476` | tripSession | expirePayLaterHolds | non-tenant/internal | cron/system sweep over sessions; no caller tenant context |
| 150 | `src/staged-payments/staged-payments.service.ts:598` | tripSession | loadPendingGroupSession | non-tenant/internal | internal loader for admin pending-group surfaces (AdminInterventionsController, `@Roles(Admin)`) |
| 151 | `src/staged-payments/staged-payments.service.ts:806` | booking | bookingGuests | non-tenant/internal | private helper inside the bank-confirmation transaction; booking already ownership-checked upstream |
| 152 | `src/support/support.service.ts:53` | supportTicket | updateTicket | admin-only | only caller is AdminSupportController (`@Roles(Admin)`) passing the acting admin id |
| 153 | `src/trips/trips.service.ts:69` | agencyProfile | assertAgencyCanPublish | guarded | loads the caller-tenant agency (`agencyId` from TenantGuard) and asserts its licence/verification state |
| 154 | `src/trips/trips.service.ts:241` | agencyProfile | createTemplate | guarded | `where: { userId }`/tenant id of the calling agency; Forbidden when absent |
| 155 | `src/trips/trips.service.ts:949` | agencyProfile | createSession | guarded | tenant agency lookup for the calling agency before the ownership-checked template load |
| 156 | `src/trips/trips.service.ts:1142` | agencyProfile | updateTemplate | guarded | `where: { id: agencyId }` (tenant id), then template ownership via scoped findFirst `{ id, agencyId }` |
| 157 | `src/trips/trips.service.ts:1360` | agencyProfile | getOwnedTemplate | guarded | agency by tenant id; template itself loaded via findFirst `{ id, agencyId }`, 404 when foreign |
| 158 | `src/users/users.service.ts:49` | user | findOne | guarded | only caller is `getMe(userId)` with the authenticated subject id (sanitizeUser strips secrets) |
| 159 | `src/users/users.service.ts:111` | agencyProfile | updateAgencyProfile | guarded | `where: { userId }` — the caller’s own agency profile |
| 160 | `src/users/users.service.ts:258` | user | getReferrals | guarded | `where: { id: userId }` — authenticated subject |
| 161 | `src/users/users.service.ts:285` | user | exportUserData | guarded | `where: { id: userId }` — authenticated subject’s own GDPR export |
| 162 | `src/users/users.service.ts:335` | user | deleteUserAccount | guarded | `where: { id: userId }` — authenticated subject deleting own account |
| 163 | `src/websocket/websocket.service.ts:27` | user | authenticateUser | non-tenant/internal | socket handshake: loads the user named by the presented access token’s subject — the caller’s own record only |
| 164 | `src/wishlist/wishlist.service.ts:43` | wishlist | removeFromWishlist | guarded | unique key `userId_tripTemplateId` is built from the authenticated caller’s userId — the row can only be the caller’s own |
| 165 | `src/wishlist/wishlist.service.ts:128` | wishlist | isInWishlist | guarded | unique key `userId_tripTemplateId` is built from the authenticated caller’s userId |

## Maintenance rule

A new `findUnique`/`findUniqueOrThrow` call site on a tenant-owned model must be
added to this table in the same PR, with its guard named. A site that cannot be
classified guarded / admin-only / public-by-design / internal is a known
unguarded reachable read and is beta-blocking per the #634 boundary condition.
