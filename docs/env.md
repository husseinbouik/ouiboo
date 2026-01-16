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

## Frontend (Next.js apps)

Define the following `NEXT_PUBLIC_*` variables in each frontend app as needed:

- `NEXT_PUBLIC_API_URL`: Base URL for the API (used by `admin`, `agency`, `traveler`).
- `NEXT_PUBLIC_TRAVELER_URL`: Traveler site URL (used by `landing`).
- `NEXT_PUBLIC_AGENCY_URL`: Agency site URL (used by `landing`).
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: Microsoft Clarity project ID (used by `landing`).
