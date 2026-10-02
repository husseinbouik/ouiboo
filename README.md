This is the Ouiboo monorepo for a B2B & B2C Travel Marketplace.

## Current Production Readiness

The platform is in active hardening. The current API contract is `/api/v1`.
Before any public production launch, review
`docs/PRODUCTION_READINESS_EXECUTION_REPORT.md` for the latest verified fixes,
remaining blockers, and deployment readiness status.

## 🚀 Production Readiness

This project is configured for production-grade launches.

### 🛡️ CI/CD
- **GitHub Actions**: Automated pipeline in `.github/workflows/ci.yml`. Runs on every PR/Push to `main`.
- **Tasks**: Lints, Builds, and Tests all packages.

### ✅ Launch Checklist
Run the following command to verify if the project is ready for launch:
```bash
npm run check:prod
```
This command verifies:
1. All required environment variables are set correctly for the target environment.
2. No local storage is being used if in production mode.
3. No internal placeholders (John Doe, logo-placeholder, etc.) exist in the code.
4. The project builds successfully.

### 📦 Cloud-Native Storage
The API supports both **Local** and **S3-compatible** (AWS, DigitalOcean, MinIO) storage.
- **Development**: Defaults to local `uploads/` directory.
- **Production**: Set `STORAGE_PROVIDER=s3` and provide S3 credentials.
- **Security**: Payment proofs are stored securely.

## Monorepo Layout

```
apps/
  admin/      # Next.js admin app
  agency/     # Next.js agency portal
  landing/    # Next.js marketing site
  traveler/   # Next.js traveler app
  api/        # NestJS API
packages/     # Shared packages (UI, types, schemas, etc.)
```

### Entry Points

**Next.js apps (App Router)**
- Admin: `apps/admin/src/app/page.tsx`
- Agency: `apps/agency/src/app` (main dashboard at `apps/agency/src/app/dashboard/page.tsx`)
- Landing: `apps/landing/src/app/page.tsx`
- Traveler: `apps/traveler/src/app/page.tsx`

**Nest API**
- Source root: `apps/api/src`

## Getting Started

Install dependencies with the repeatable command (this removes any stale
`node_modules` before running a clean install):

```bash
npm run install:ci
```

If the default npm registry is blocked in your environment, configure a root-level `.npmrc`
to point at your allowed registry (this repo includes a `.npmrc` that uses the default
registry with the proxy configured for this environment and retry settings to
avoid partial/empty installs).

## Running Apps

You can run an app from the repo root using Turborepo filters:

```bash
# Examples
npm run dev --filter=@ouiboo/admin
npm run dev --filter=@ouiboo/agency
npm run dev --filter=@ouiboo/landing
npm run dev --filter=@ouiboo/traveler
npm run dev --filter=@ouiboo/api
```

Or run an app from its workspace directory:

```bash
cd apps/admin
npm run dev
```

```bash
cd apps/api
npm run dev
```

## API Upload Storage (Payment Proofs)

The API stores uploads via a storage provider. By default it writes files to the
local `uploads/` directory (served from `/uploads`) and generates randomized
filenames to make URLs non-guessable.

**Production recommendation**

For production environments, use an object storage provider such as Amazon S3.
To do that, add a new provider that implements
`apps/api/src/upload/interfaces/storage-provider.interface.ts`, swap it into the
`UploadService`, and use pre-signed URLs or an authenticated download endpoint
for access control. This keeps payment proof downloads behind authentication
while keeping storage scalable.

## Next.js Development

First, run a Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open the app's local URL (see the app's `package.json` for the assigned port) to see the result.

You can start editing the page by modifying the relevant entry point listed above. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=ouiboo&utm_campaign=ouiboo-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
