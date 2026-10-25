# Break-glass runbook — admin recovery (#418)

The admin console is protected by TOTP MFA. This runbook covers the two
recovery paths and what to do when they are used. It exists so that a lost
phone never means a locked-out platform — and so that a recovery can never
happen silently.

## The two recovery paths

| Path | What it is | When to use it |
| --- | --- | --- |
| **Recovery code** | One of 10 one-time codes issued at MFA enrolment (Admin → Security tab), stored hashed, burns on use. | The admin lost the authenticator but kept the recovery codes. Used at the normal login screen ("Use a recovery code"). |
| **Break-glass credential** | A **separate** one-time secret created in advance in the Security tab ("Break-glass credentials"). Not a code on the admin account: it lives in its own store, expires (default 90 days), can be revoked, and is used at the login screen via "Lost your authenticator? Use a break-glass secret" together with the admin email + password. | The authenticator AND the recovery codes are both unavailable. |

There is deliberately **no support-side reset**. Any other reset path is a
re-seed: rotate `ADMIN_PASSWORD` via `ADMIN_SEED_ROTATE=true`, sign in,
revoke every break-glass credential, and re-enrol MFA — all of which is
visible in the Audit tab.

## Custody rules

1. After creating a break-glass credential, copy the secret **once** into
   offline custody: a sealed, signed envelope in a safe, or a password
   safe that is **not** the one holding the admin password. Never store
   the secret in email, chat, the repo, or next to the password.
2. Keep at least one ACTIVE break-glass credential at all times. Create
   the replacement **before** the old one expires; check the Security tab
   monthly.
3. The label should say where the secret physically lives
   (e.g. "Sealed envelope — office safe") so anyone can find it in an
   emergency without guessing.

## Using break-glass

1. Open the admin login page → "Lost your authenticator? Use a
   break-glass secret".
2. Enter the admin email, the admin password, and the break-glass secret.
3. On success: the credential is burned (it cannot be reused, even by
   retry), the sign-in is written to the Audit tab as
   `ADMIN_BREAK_GLASS_USED`, and an alert email goes to every admin and to
   `ADMIN_ALERT_EMAIL` when configured.
4. Immediately after a break-glass sign-in: re-enrol MFA in the Security
   tab (this issues fresh recovery codes) and create a new break-glass
   credential to replace the burned one.

## If an alert arrives and the use was NOT authorised

Treat the admin account as compromised:

1. In the Security tab, revoke every other ACTIVE break-glass credential.
2. Re-enrol MFA (Security tab) — this replaces the TOTP secret and all
   recovery codes.
3. Rotate the admin password (`ADMIN_SEED_ROTATE=true` with a new
   `ADMIN_PASSWORD`, then redeploy the API).
4. Review the Audit tab around the `ADMIN_BREAK_GLASS_USED` timestamp for
   actions taken during the window.
5. Rotate `MFA_ENCRYPTION_KEY` only together with a full MFA re-enrolment
   of every admin (stored TOTP secrets become unreadable under a new key).

## Audit events to know

| Audit action | Meaning |
| --- | --- |
| `ADMIN_LOGIN_SUCCEEDED` / `ADMIN_LOGIN_FAILED` | Admin sign-in outcomes (`metadata.via`: password / totp / recovery-code / break-glass; `metadata.stage` on failures). |
| `ADMIN_MFA_ENROLLED` | An admin (re-)enrolled TOTP; new recovery codes were issued. |
| `ADMIN_MFA_RECOVERY_USED` | A one-time recovery code completed a sign-in. |
| `ADMIN_BREAK_GLASS_CREATED` / `ADMIN_BREAK_GLASS_REVOKED` | Credential lifecycle in the Security tab. |
| `ADMIN_BREAK_GLASS_USED` | The break-glass record — this is the row the Security seat sights during verification. |
| `ADMIN_BREAK_GLASS_FAILED` | A failed break-glass attempt (wrong password, wrong/expired/used secret). Repeated failures feed the login rate gate. |

## Configuration

| Env | Purpose |
| --- | --- |
| `MFA_ENCRYPTION_KEY` | 32-byte key (hex or base64) encrypting stored TOTP secrets. Required before enrolment works; enrolment/challenge fail closed without it. Generate: `openssl rand -base64 32`. |
| `ADMIN_MFA_REQUIRED=true` | Password-only admin sign-in is refused; the login returns an enrolment challenge until TOTP is set up. Production env validation refuses this flag without `MFA_ENCRYPTION_KEY`. |
| `ADMIN_ALERT_EMAIL` | Optional extra recipient for recovery/break-glass alerts (all admin accounts are always alerted). |
