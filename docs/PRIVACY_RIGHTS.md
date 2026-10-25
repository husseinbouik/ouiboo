# Privacy rights handling

Authenticated users can export their own data with `GET /api/v1/users/me/export` and delete their own account with `DELETE /api/v1/users/me`. The JWT subject is the only identity accepted; callers cannot supply another user ID. Export excludes password hashes, OTPs, reset tokens, and refresh tokens.

Deletion immediately revokes refresh tokens, disables login, removes profile/avatar and authentication/reset data, removes wishlists/preferences, scrubs notification content and booking contact fields, and pseudonymizes the email. Agency listings are archived and agency profile/bank fields are scrubbed.

Financial booking/payment/wallet/payout records and minimal audit records are retained in pseudonymized form for the legally approved accounting, fraud, chargeback, and security periods. Conversation/review and backup treatment, exact retention periods, legal holds, and deletion propagation must be approved by privacy counsel before launch; this document does not invent statutory periods. Backups must expire through the approved backup lifecycle and must not be restored into active service without replaying deletion requests.

## Request operations

1. Require the user to authenticate normally; support-assisted requests require a separately approved identity-verification process.
2. Record request ID, jurisdiction, request type, received/due/completed timestamps, verifier, systems searched, exceptions/legal holds, and evidence location—never credentials.
3. Deliver exports through a short-lived authenticated/private channel, not email attachment or public object URL.
4. For deletion, warn that access ends immediately, invoke the endpoint, verify login fails, and track downstream processors/backups through completion.
5. Escalate disputes, minors, deceased-user requests, law-enforcement requests, or legal holds to the privacy owner.

Before launch, counsel must approve identity proofing, response deadlines, retention schedule, processor coverage, exception wording, and user-facing copy.
