# Ouiboo — Staging Test Credentials

> **Staging only.** These are synthetic test identities (`@ouiboo.test`) for the staging
> environment. They do not exist in production.
> **Production identities are a separate operator step (issue #259) and must never be
> added to this file or anywhere else in the repo.**

Provisioned 2026-10-20 · logins verified live against the staging API 2026-10-21.

## Accounts

| Role | App | Email | Password |
| --- | --- | --- | --- |
| Traveler | https://ouiboo-traveler-staging.vercel.app | `staging-traveler@ouiboo.test` | `SvuZAKhZxqwqzNvbMJsVSUGe` |
| Agency | https://ouiboo-agency-staging.vercel.app | `staging-agency@ouiboo.test` | `ZlUmZle5xNkAHuW5r9q4oosQ` |
| Admin | https://ouiboo-admin-staging.vercel.app | `staging-admin@ouiboo.test` | `7S8IXp0QBrje5z7Fo5Gsqnvp` |

## Environment

- Staging API: https://ouiboo-api-staging.vercel.app/api/v1
- Staging database: Neon `ouiboo-staging` (isolated from production)
- Provisioner: `apps/api/prisma/provision-test-identities.js`
- Process documentation: `docs/TEST_IDENTITIES.md`
