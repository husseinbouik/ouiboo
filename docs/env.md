# Environment Variables

## API (apps/api)

These variables are required in production. The API will fail fast if any are missing.
Use `apps/api/.env.example` as a starting point for local setup.

- `JWT_SECRET`: Secret used to sign access tokens.
- `JWT_REFRESH_SECRET`: Secret used to sign refresh tokens.
- `CORS_ORIGINS`: Comma-separated list of allowed origins for CORS.
- `DATABASE_URL`: Database connection string.
- `SMTP_HOST`: SMTP server host.
- `SMTP_PORT`: SMTP server port.
- `SMTP_USER`: SMTP username.
- `SMTP_PASS`: SMTP password.
- `APP_BASE_URL`: Fallback web URL used in password reset emails.
- `TRAVELER_APP_URL`: Traveler app URL for password reset links.
- `AGENCY_APP_URL`: Agency app URL for password reset links.
- `ADMIN_APP_URL`: Admin app URL for password reset links.
- `ADMIN_SEED`: Set to `false` to skip admin seed on boot.
- `ADMIN_USERNAME`: Admin display name (default: `admin`).
- `ADMIN_PASSWORD`: Admin password used for seed/rotation.
- `ADMIN_EMAIL`: Admin email used for seed (default: `admin@ouiboo.local`).
- `ADMIN_SEED_ROTATE`: Set to `true` to rotate the admin password on boot (requires `ADMIN_PASSWORD`).
- `AUDIT_LOG_RETENTION_DAYS`: Retention window in days for audit log pruning.
- `PAYMENT_PROOF_EXPIRATION_HOURS`: Hours before a pending booking expires without a payment proof.

### Admin Credential Rotation

To rotate admin credentials safely:
1. Set `ADMIN_PASSWORD` to the new value and `ADMIN_SEED_ROTATE=true`.
2. Restart the API so the seed runs and updates the stored hash.
3. Set `ADMIN_SEED_ROTATE=false` after the rotation completes.

## Frontend (Next.js apps)

Define the following `NEXT_PUBLIC_*` variables in each frontend app as needed:

- `NEXT_PUBLIC_API_URL`: Base URL for the API (used by `admin`, `agency`, `traveler`).
- `NEXT_PUBLIC_TRAVELER_URL`: Traveler site URL (used by `landing`).
- `NEXT_PUBLIC_AGENCY_URL`: Agency site URL (used by `landing`).
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: Microsoft Clarity project ID (used by `landing`).
